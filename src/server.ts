import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { db } from "./db";
import { readBudget, createBudgetItem, updateBudgetItem, deleteBudgetItem } from "./storage";
import { SECTIONS } from "./types";
import type { Section } from "./types";
import {
  COOKIE_NAME,
  createSession,
  getSession,
  deleteSession,
  deleteExpiredSessions,
  findUserByUsername,
  createUser,
  getUserById,
} from "./auth";

const PORT = Number(process.env.PORT ?? 3000);
const SECURE_COOKIES = process.env.SECURE_COOKIES === "true";

// Input bounds (guard against resource-exhaustion via oversized payloads)
const MAX_USERNAME_LENGTH = 64;
const MAX_PASSWORD_LENGTH = 128;
const MAX_LABEL_LENGTH = 200;

// Fixed hash used to equalize login timing when a username does not exist,
// preventing user-enumeration via response-time side channel.
const DUMMY_PASSWORD_HASH = await Bun.password.hash("bt-timing-equalizer");

// In-memory failed-login limiter, keyed by client IP (sliding window).
const RL_WINDOW_MS = 15 * 60 * 1000;
const RL_MAX_FAILURES = 8;
const loginFailures = new Map<string, number[]>();

function clientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (loginFailures.get(ip) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  if (hits.length === 0) loginFailures.delete(ip);
  else loginFailures.set(ip, hits);
  return hits.length >= RL_MAX_FAILURES;
}

function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const hits = (loginFailures.get(ip) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  hits.push(now);
  loginFailures.set(ip, hits);
}

// Periodically drop expired sessions and stale rate-limit entries.
setInterval(
  () => {
    deleteExpiredSessions();
    const now = Date.now();
    for (const [ip, hits] of loginFailures) {
      if (hits.every((t) => now - t >= RL_WINDOW_MS)) loginFailures.delete(ip);
    }
  },
  60 * 60 * 1000
).unref();

// Create initial user on first boot if env vars are set and no users exist
if (process.env.INITIAL_USERNAME && process.env.INITIAL_PASSWORD) {
  const row = db
    .query<{ count: number }, []>("SELECT COUNT(*) as count FROM users")
    .get();
  if ((row?.count ?? 0) === 0) {
    const hash = await Bun.password.hash(process.env.INITIAL_PASSWORD);
    createUser(process.env.INITIAL_USERNAME, hash);
    console.log(`Created initial user: ${process.env.INITIAL_USERNAME}`);
  }
}

type Variables = { userId: string };
const app = new Hono<{ Variables: Variables }>();

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ");

app.use("*", async (c, next) => {
  await next();
  c.header("Content-Security-Policy", CSP);
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "no-referrer");
  c.header("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  c.header("Cross-Origin-Opener-Policy", "same-origin");
  if (SECURE_COOKIES) {
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
});

// ─── Auth routes ────────────────────────────────────────────────────────────

app.post("/auth/login", async (c) => {
  const ip = clientIp(c);
  if (isRateLimited(ip)) {
    return c.json({ error: "Too many attempts, try again later" }, 429);
  }

  let body: { username?: unknown; password?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!username || !password) return c.json({ error: "Missing credentials" }, 400);
  if (username.length > MAX_USERNAME_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  // Always run a verify (against a dummy hash when the user is absent) so that
  // response time does not reveal whether the username exists.
  const user = findUserByUsername(username);
  const valid = await Bun.password.verify(
    password,
    user?.password_hash ?? DUMMY_PASSWORD_HASH
  );
  if (!user || !valid) {
    recordLoginFailure(ip);
    return c.json({ error: "Invalid credentials" }, 401);
  }

  loginFailures.delete(ip);
  const { id: sessionId } = createSession(user.id);
  setCookie(c, COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "Strict",
    path: "/",
    secure: SECURE_COOKIES,
    maxAge: 30 * 24 * 60 * 60,
  });
  return c.json({ username });
});

app.post("/auth/logout", (c) => {
  const sessionId = getCookie(c, COOKIE_NAME);
  if (sessionId) deleteSession(sessionId);
  deleteCookie(c, COOKIE_NAME, { path: "/" });
  return c.json({ ok: true });
});

app.get("/auth/me", (c) => {
  const sessionId = getCookie(c, COOKIE_NAME);
  if (!sessionId) return c.json({ error: "Unauthorized" }, 401);
  const session = getSession(sessionId);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const user = getUserById(session.userId);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ username: user.username });
});

// ─── Session middleware for all API routes ───────────────────────────────────

app.use("/api/*", async (c, next) => {
  const sessionId = getCookie(c, COOKIE_NAME);
  if (!sessionId) return c.json({ error: "Unauthorized" }, 401);
  const session = getSession(sessionId);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  c.set("userId", session.userId);
  await next();
});

// ─── Budget API ──────────────────────────────────────────────────────────────

app.get("/api/budget", (c) => {
  return c.json(readBudget(c.get("userId")));
});

app.patch("/api/budget/:section/:id", async (c) => {
  const section = c.req.param("section") as Section;
  const id = c.req.param("id");
  if (!SECTIONS.includes(section)) return c.json({ error: "Invalid section" }, 400);

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const patch: { label?: string; montant?: number; montant_annuel?: number } = {};
  if (body.label !== undefined) patch.label = String(body.label).slice(0, MAX_LABEL_LENGTH);

  const amountKey = section === "depenses_annuelles" ? "montant_annuel" : "montant";
  if (body[amountKey] !== undefined) {
    const value = Number(body[amountKey]);
    if (!Number.isFinite(value)) return c.json({ error: `Invalid ${amountKey}` }, 400);
    patch[amountKey] = value;
  }

  const updated = updateBudgetItem(c.get("userId"), section, id, patch);
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

app.post("/api/budget/:section", async (c) => {
  const section = c.req.param("section") as Section;
  if (!SECTIONS.includes(section)) return c.json({ error: "Invalid section" }, 400);

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const amountKey = section === "depenses_annuelles" ? "montant_annuel" : "montant";
  const value = Number(body[amountKey] ?? 0);
  if (!Number.isFinite(value)) return c.json({ error: `Invalid ${amountKey}` }, 400);
  const label = String(body.label ?? "").slice(0, MAX_LABEL_LENGTH);

  const newItem =
    section === "depenses_annuelles"
      ? createBudgetItem(c.get("userId"), section, label, undefined, value)
      : createBudgetItem(c.get("userId"), section, label, value, undefined);

  return c.json(newItem, 201);
});

app.delete("/api/budget/:section/:id", (c) => {
  const section = c.req.param("section") as Section;
  const id = c.req.param("id");
  if (!SECTIONS.includes(section)) return c.json({ error: "Invalid section" }, 400);

  const deleted = deleteBudgetItem(c.get("userId"), section, id);
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ─── Static assets ───────────────────────────────────────────────────────────

function noStoreHandler(filePath: string, contentType: string) {
  return async (c: any) => {
    const file = Bun.file(filePath);
    if (!(await file.exists())) return c.notFound();
    c.header("Content-Type", contentType);
    c.header("Cache-Control", "no-store");
    return c.body(await file.text());
  };
}

app.get("/", noStoreHandler("./public/index.html", "text/html; charset=utf-8"));
app.get("/index.html", noStoreHandler("./public/index.html", "text/html; charset=utf-8"));
app.get("/style.css", noStoreHandler("./public/style.css", "text/css; charset=utf-8"));
app.get(
  "/js/api.js",
  noStoreHandler("./public/js/api.js", "application/javascript; charset=utf-8")
);
app.get(
  "/js/app.js",
  noStoreHandler("./public/js/app.js", "application/javascript; charset=utf-8")
);
app.get(
  "/manifest.webmanifest",
  noStoreHandler("./public/manifest.webmanifest", "application/manifest+json; charset=utf-8")
);

app.use("/*", serveStatic({ root: "./public" }));
app.use("/*", serveStatic({ path: "./public/index.html" }));

export default {
  port: PORT,
  fetch: app.fetch,
};

console.log(`budget-thing running on port ${PORT}`);
