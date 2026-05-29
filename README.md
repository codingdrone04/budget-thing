# budget-thing

Application de budget mensuel multi-utilisateurs. Backend Hono sur Bun, frontend vanilla JS, stockage SQLite.

## Stack

- **Runtime** : Bun
- **Backend** : Hono (TypeScript)
- **Frontend** : HTML/CSS/JS vanilla (servi par Hono)
- **Stockage** : SQLite (`bun:sqlite`) — `data/budget.db`
- **Auth** : login username/password → cookie de session `HttpOnly` (argon2id via `Bun.password`)
- **Process manager** : systemd
- **CI/CD** : GitHub Actions → webhook HMAC-SHA256

---

## Setup (Thinkpad Linux)

### 1. Cloner et installer

```bash
git clone https://github.com/codingdrone04/budget-thing.git
cd budget-thing
bun install
```

### 2. Configurer l'environnement

```bash
cp .env.example .env
# Éditer .env : INITIAL_USERNAME / INITIAL_PASSWORD (premier user), WEBHOOK_SECRET, etc.
```

### 3. Premier utilisateur

Le premier utilisateur est créé automatiquement au démarrage si la base est vide et que
`INITIAL_USERNAME` / `INITIAL_PASSWORD` sont renseignés dans `.env`.

Pour ajouter d'autres utilisateurs ensuite :

```bash
SEED_USERNAME=smila SEED_PASSWORD=<mot-de-passe-fort> bun run seed
```

### 4. Lancer manuellement

```bash
bun run start    # serveur API + frontend
bun run webhook  # serveur webhook (dans un autre terminal)
```

### 5. Installer les services systemd

```bash
# Remplacer YOUR_LINUX_USER dans les fichiers .service
sudo cp systemd/budget-thing.service /etc/systemd/system/
sudo cp systemd/budget-thing-webhook.service /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now budget-thing
sudo systemctl enable --now budget-thing-webhook
```

---

## Frontend web

Le frontend web est servi par Hono sur la même origine que l'API et s'authentifie
via le cookie de session (écran de login username/password). Aucune configuration de
clé n'est nécessaire côté web.

> ⚠️ L'app mobile (`mobile/`) utilise encore l'ancienne auth par `X-API-Key`, qui n'est
> plus gérée par le backend — à migrer vers les sessions.

---

## GitHub Actions secrets

Ajouter dans `Settings → Secrets and variables → Actions` :

| Secret            | Valeur                                          |
|-------------------|-------------------------------------------------|
| `WEBHOOK_SECRET`  | Même valeur que dans le `.env` du Thinkpad      |
| `WEBHOOK_URL`     | URL publique du webhook, ex. `https://…/deploy` |

---

## API

Auth :

```
POST   /auth/login              → login → set cookie de session
POST   /auth/logout             → logout → clear cookie
GET    /auth/me                 → utilisateur courant
```

Toutes les routes `/api/*` exigent un cookie de session valide (`bt_session`) et sont
scopées au `user_id` de la session.

```
GET    /api/budget              → tout le budget de l'utilisateur connecté
PATCH  /api/budget/:section/:id → modifier label/montant
POST   /api/budget/:section     → ajouter une ligne
DELETE /api/budget/:section/:id → supprimer une ligne
```

Sections valides : `revenus`, `depenses_communes`, `depenses_fixes`, `depenses_annuelles`

## Sécurité

- Mots de passe hashés argon2id (`Bun.password`), requêtes SQL paramétrées, données isolées par `user_id`.
- Cookie de session `HttpOnly` + `SameSite=Strict` (+ `Secure` si `SECURE_COOKIES=true`), TTL 30 jours.
- En-têtes : CSP stricte, HSTS (si HTTPS), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`.
- `/auth/login` : rate-limiting anti-brute-force (8 échecs / 15 min / IP → `429`), temps de réponse constant (anti-énumération), bornes de longueur sur les entrées.
- Webhook de déploiement : signature HMAC-SHA256 (comparaison constante) + anti-rejeu par timestamp (±5 min).
