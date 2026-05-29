# budget-thing

Multi-user monthly budget app. Hono backend on Bun, vanilla JS frontend, SQLite storage.

## Stack

- **Runtime**: Bun
- **Backend**: Hono (TypeScript)
- **Frontend**: vanilla HTML/CSS/JS (served by Hono)
- **Storage**: SQLite (`bun:sqlite`) — `data/budget.db`
- **Auth**: username/password login → `HttpOnly` session cookie (argon2id via `Bun.password`)
- **Process manager**: systemd
- **CI/CD**: GitHub Actions → HMAC-SHA256 webhook

---

## Setup (Thinkpad Linux)

### 1. Clone and install

```bash
git clone https://github.com/codingdrone04/budget-thing.git
cd budget-thing
bun install
```

### 2. Configure the environment

```bash
cp .env.example .env
# Edit .env: INITIAL_USERNAME / INITIAL_PASSWORD (first user), WEBHOOK_SECRET, etc.
```

### 3. First user

The first user is created automatically on startup if the database is empty and
`INITIAL_USERNAME` / `INITIAL_PASSWORD` are set in `.env`.

To add more users afterwards:

```bash
SEED_USERNAME=smila SEED_PASSWORD=<strong-password> bun run seed
```

### 4. Run manually

```bash
bun run start    # API + frontend server
bun run webhook  # webhook server (in another terminal)
```

### 5. Install the systemd services

```bash
# Replace YOUR_LINUX_USER in the .service files
sudo cp systemd/budget-thing.service /etc/systemd/system/
sudo cp systemd/budget-thing-webhook.service /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now budget-thing
sudo systemctl enable --now budget-thing-webhook
```

---

## Web frontend

The web frontend is served by Hono on the same origin as the API and authenticates
via the session cookie (username/password login screen). No key configuration is
needed on the web side.

> ⚠️ The mobile app (`mobile/`) still uses the old `X-API-Key` auth, which the backend
> no longer handles — it needs to be migrated to sessions.

---

## GitHub Actions secrets

Add under `Settings → Secrets and variables → Actions`:

| Secret            | Value                                            |
|-------------------|--------------------------------------------------|
| `WEBHOOK_SECRET`  | Same value as in the Thinkpad's `.env`           |
| `WEBHOOK_URL`     | Public webhook URL, e.g. `https://…/deploy`      |

---

## API

Auth:

```
POST   /auth/login              → log in → set session cookie
POST   /auth/logout             → log out → clear cookie
GET    /auth/me                 → current user
```

All `/api/*` routes require a valid session cookie (`bt_session`) and are scoped to
the session's `user_id`.

```
GET    /api/budget              → the logged-in user's full budget
PATCH  /api/budget/:section/:id → update label/amount
POST   /api/budget/:section     → add a row
DELETE /api/budget/:section/:id → delete a row
```

Valid sections: `revenus`, `depenses_communes`, `depenses_fixes`, `depenses_annuelles`

## Security

- Passwords hashed with argon2id (`Bun.password`), parameterized SQL queries, data isolated per `user_id`.
- Session cookie `HttpOnly` + `SameSite=Strict` (+ `Secure` when `SECURE_COOKIES=true`), 30-day TTL.
- Headers: strict CSP, HSTS (when over HTTPS), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`.
- `/auth/login`: brute-force rate limiting (8 failures / 15 min / IP → `429`), constant-time response (anti-enumeration), length bounds on inputs.
- Deploy webhook: HMAC-SHA256 signature (constant-time comparison) + replay protection via timestamp (±5 min).
