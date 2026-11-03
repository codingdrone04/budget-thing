import { $ } from "bun";

const WEBHOOK_PORT = Number(process.env.WEBHOOK_PORT ?? 9000);
// Bind to loopback by default: cloudflared connects locally, so there is no reason
// to expose the deploy endpoint on the LAN / public IPv6 (which would bypass Cloudflare).
const WEBHOOK_HOST = process.env.WEBHOOK_HOST ?? "127.0.0.1";
const MAX_BODY_BYTES = 64 * 1024;
const MAX_CLOCK_SKEW_SEC = 300;

const PROJECT_DIR = `${import.meta.dir}/..`;
const APPS_DIR = `${PROJECT_DIR}/..`;

type Project = { name: string; dir: string; secret?: string };

// Each project has its own secret, so a leaked repository secret cannot redeploy the others.
// A project without a secret is not exposed.
const PROJECTS: Record<string, Project> = {
  "/deploy": { name: "budget-thing", dir: PROJECT_DIR, secret: process.env.WEBHOOK_SECRET },
  "/deploy/portfolio": {
    name: "portfolio",
    dir: `${APPS_DIR}/portfolio`,
    secret: process.env.WEBHOOK_SECRET_PORTFOLIO,
  },
  "/deploy/mail-service": {
    name: "mail-service",
    dir: `${APPS_DIR}/mail-service`,
    secret: process.env.WEBHOOK_SECRET_MAIL_SERVICE,
  },
};

if (!process.env.WEBHOOK_SECRET) {
  console.error("ERROR: WEBHOOK_SECRET is not set in .env");
  process.exit(1);
}

async function verifySignature(
  body: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expected = "sha256=" + Buffer.from(mac).toString("hex");
  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

const running = new Set<string>();
const queued = new Set<string>();

// Runs in the background: an image build can outlast Cloudflare's 100 s request timeout.
async function deploy(project: Project): Promise<void> {
  if (running.has(project.name)) {
    queued.add(project.name);
    console.log(`Webhook: ${project.name} already deploying, queued`);
    return;
  }
  running.add(project.name);
  console.log(`Webhook: deploying ${project.name}...`);
  try {
    const compose = `${project.dir}/docker-compose.yml`;
    await $`git -C ${project.dir} pull --ff-only origin main`;
    // --pull refreshes the base images, which a plain --build would keep from the cache.
    await $`docker compose -f ${compose} build --pull`;
    await $`docker compose -f ${compose} up -d`;
    console.log(`Webhook: ${project.name} deploy complete`);
  } catch (err) {
    console.error(`Webhook: ${project.name} deploy failed`, err);
  } finally {
    running.delete(project.name);
    if (queued.delete(project.name)) void deploy(project);
  }
}

Bun.serve({
  port: WEBHOOK_PORT,
  hostname: WEBHOOK_HOST,
  async fetch(req) {
    const url = new URL(req.url);
    const project = Object.hasOwn(PROJECTS, url.pathname) ? PROJECTS[url.pathname] : undefined;

    if (req.method !== "POST" || !project?.secret) {
      return new Response("Not Found", { status: 404 });
    }

    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return new Response("Payload too large", { status: 413 });
    }

    const body = await req.text();
    if (body.length > MAX_BODY_BYTES) {
      return new Response("Payload too large", { status: 413 });
    }

    const signature = req.headers.get("x-hub-signature-256");

    if (!(await verifySignature(body, signature, project.secret))) {
      console.warn(`Webhook: invalid signature for ${project.name}`);
      return new Response("Unauthorized", { status: 401 });
    }

    let payload: { ref?: string; ts?: number };
    try {
      payload = JSON.parse(body);
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    const ts = Number(payload.ts);
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_CLOCK_SKEW_SEC) {
      console.warn("Webhook: stale or missing timestamp");
      return new Response("Stale request", { status: 401 });
    }

    if (payload.ref !== "refs/heads/main") {
      return new Response("Ignored (not main)", { status: 200 });
    }

    void deploy(project);
    return new Response("Deploy started", { status: 202 });
  },
});

console.log(`Webhook server listening on ${WEBHOOK_HOST}:${WEBHOOK_PORT}`);
