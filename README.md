# budget-thing

Application de budget mensuel personnel. Backend Hono sur Bun, frontend vanilla JS, stockage JSON plat.

## Stack

- **Runtime** : Bun
- **Backend** : Hono (TypeScript)
- **Frontend** : HTML/CSS/JS vanilla (servi par Hono)
- **Auth** : header `X-API-Key` sur toutes les routes API
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
# Éditer .env et renseigner API_KEY, WEBHOOK_SECRET, etc.
```

### 3. Premier lancement — seed

```bash
bun run seed
# Crée budget.json avec les données initiales
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

## Frontend web (Mac)

Ouvrir `public/js/config.js` et renseigner :

```js
const CONFIG = {
  API_BASE_URL: "https://votre-tunnel.example.com", // ou IP locale
  API_KEY: "votre-clé",
};
```

---

## GitHub Actions secrets

Ajouter dans `Settings → Secrets and variables → Actions` :

| Secret            | Valeur                                          |
|-------------------|-------------------------------------------------|
| `WEBHOOK_SECRET`  | Même valeur que dans le `.env` du Thinkpad      |
| `WEBHOOK_URL`     | URL publique du webhook, ex. `https://…/deploy` |

---

## API

Toutes les routes exigent `X-API-Key: <valeur>` dans le header.

```
GET    /api/budget              → tout le budget
PATCH  /api/budget/:section/:id → modifier label/montant
POST   /api/budget/:section     → ajouter une ligne
DELETE /api/budget/:section/:id → supprimer une ligne
```

Sections valides : `revenus`, `depenses_communes`, `depenses_fixes`, `depenses_annuelles`

