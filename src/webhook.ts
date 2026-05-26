import { $ } from "bun";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const WEBHOOK_PORT = Number(process.env.WEBHOOK_PORT ?? 9000);

if (!WEBHOOK_SECRET) {
  console.error("ERROR: WEBHOOK_SECRET is not set in .env");
  process.exit(1);
}

async function verifySignature(body: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WEBHOOK_SECRET),
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

Bun.serve({
  port: WEBHOOK_PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method !== "POST" || url.pathname !== "/deploy") {
      return new Response("Not Found", { status: 404 });
    }

    const body = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    if (!(await verifySignature(body, signature))) {
      console.warn("Webhook: invalid signature");
      return new Response("Unauthorized", { status: 401 });
    }

    const payload = JSON.parse(body);
    if (payload.ref !== "refs/heads/main") {
      return new Response("Ignored (not main)", { status: 200 });
    }

    console.log("Webhook: deploying...");

    try {
      await $`git -C ${import.meta.dir}/.. pull origin main`;
      await $`sudo systemctl restart budget-thing`;
      console.log("Webhook: deploy complete");
      return new Response("Deployed", { status: 200 });
    } catch (err) {
      console.error("Webhook: deploy failed", err);
      return new Response("Deploy failed", { status: 500 });
    }
  },
});

console.log(`Webhook server listening on port ${WEBHOOK_PORT}`);
