import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { v4 as uuidv4 } from "uuid";
import { readBudget, writeBudget } from "./storage";
import { SECTIONS } from "./types";
import type { Section } from "./types";

const API_KEY = process.env.API_KEY;
const PORT = Number(process.env.PORT ?? 3000);

if (!API_KEY) {
  console.error("ERROR: API_KEY is not set in .env");
  process.exit(1);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

const app = new Hono();

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
});

app.use(
  "/api/*",
  cors({
    origin: process.env.API_BASE_URL ?? [],
    allowHeaders: ["Content-Type", "X-API-Key"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use("/api/*", async (c, next) => {
  const key = c.req.header("X-API-Key");
  if (!key || !safeEqual(key, API_KEY)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

// GET /api/budget
app.get("/api/budget", async (c) => {
  const budget = await readBudget();
  return c.json(budget);
});

// PATCH /api/budget/:section/:id
app.patch("/api/budget/:section/:id", async (c) => {
  const section = c.req.param("section") as Section;
  const id = c.req.param("id");

  if (!SECTIONS.includes(section)) {
    return c.json({ error: "Invalid section" }, 400);
  }

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const budget = await readBudget();
  const items = budget[section] as Array<Record<string, unknown>>;
  const idx = items.findIndex((item) => item.id === id);

  if (idx === -1) {
    return c.json({ error: "Not found" }, 404);
  }

  if (body.label !== undefined) items[idx].label = String(body.label);

  const amountKey = section === "depenses_annuelles" ? "montant_annuel" : "montant";
  if (body[amountKey] !== undefined) {
    const value = Number(body[amountKey]);
    if (!Number.isFinite(value)) {
      return c.json({ error: `Invalid ${amountKey}` }, 400);
    }
    items[idx][amountKey] = value;
  }

  await writeBudget(budget);
  return c.json(items[idx]);
});

// POST /api/budget/:section
app.post("/api/budget/:section", async (c) => {
  const section = c.req.param("section") as Section;

  if (!SECTIONS.includes(section)) {
    return c.json({ error: "Invalid section" }, 400);
  }

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const budget = await readBudget();
  const items = budget[section] as Array<Record<string, unknown>>;

  const amountKey = section === "depenses_annuelles" ? "montant_annuel" : "montant";
  const value = Number(body[amountKey] ?? 0);
  if (!Number.isFinite(value)) {
    return c.json({ error: `Invalid ${amountKey}` }, 400);
  }

  const newItem: Record<string, unknown> = {
    id: uuidv4(),
    label: String(body.label ?? ""),
    [amountKey]: value,
  };

  items.push(newItem);
  await writeBudget(budget);
  return c.json(newItem, 201);
});

// DELETE /api/budget/:section/:id
app.delete("/api/budget/:section/:id", async (c) => {
  const section = c.req.param("section") as Section;
  const id = c.req.param("id");

  if (!SECTIONS.includes(section)) {
    return c.json({ error: "Invalid section" }, 400);
  }

  const budget = await readBudget();
  const items = budget[section] as Array<Record<string, unknown>>;
  const idx = items.findIndex((item) => item.id === id);

  if (idx === -1) {
    return c.json({ error: "Not found" }, 404);
  }

  items.splice(idx, 1);
  await writeBudget(budget);
  return c.json({ ok: true });
});

// Serve config.js dynamically so Cloudflare never caches the real API key
app.get("/js/config.js", (c) => {
  c.header("Content-Type", "application/javascript");
  c.header("Cache-Control", "no-store");
  return c.body(
    `const CONFIG = {\n  API_BASE_URL: "${process.env.API_BASE_URL ?? ""}",\n  API_KEY: "change-me-to-your-api-key",\n};\n`
  );
});

// Serve HTML, JS, CSS with no-store so Cloudflare never caches app logic
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
app.get("/js/api.js", noStoreHandler("./public/js/api.js", "application/javascript; charset=utf-8"));
app.get("/js/app.js", noStoreHandler("./public/js/app.js", "application/javascript; charset=utf-8"));
app.get("/manifest.webmanifest", noStoreHandler("./public/manifest.webmanifest", "application/manifest+json; charset=utf-8"));

// Serve remaining static assets (images, fonts, etc.)
app.use("/*", serveStatic({ root: "./public" }));
app.use("/*", serveStatic({ path: "./public/index.html" }));

export default {
  port: PORT,
  fetch: app.fetch,
};

console.log(`budget-thing running on port ${PORT}`);
