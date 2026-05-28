import { findUserByUsername, createUser } from "./auth";
import { createBudgetItem } from "./storage";
import { db } from "./db";

const username = process.env.SEED_USERNAME;
const password = process.env.SEED_PASSWORD;

if (!username || !password) {
  console.log("SEED_USERNAME/SEED_PASSWORD not set — skipping seed.");
  process.exit(0);
}

let user = findUserByUsername(username);
if (!user) {
  const hash = await Bun.password.hash(password);
  const id = createUser(username, hash);
  user = { id, password_hash: hash };
  console.log(`Created user: ${username}`);
} else {
  console.log(`User already exists: ${username}`);
}

const existing = db
  .query<{ count: number }, [string]>(
    "SELECT COUNT(*) as count FROM budget_items WHERE user_id = ?"
  )
  .get(user.id);

if ((existing?.count ?? 0) > 0) {
  console.log("Budget data already exists — skipping seed.");
  process.exit(0);
}

const items: Array<{ section: string; label: string; montant?: number; montant_annuel?: number }> =
  [
    { section: "revenus", label: "Salaire", montant: 100 },
    { section: "revenus", label: "Autre revenu", montant: 100 },
    { section: "revenus", label: "Aide", montant: 100 },
    { section: "revenus", label: "Participation au loyer", montant: 100 },
    { section: "revenus", label: "Participation aux charges", montant: 100 },
    { section: "depenses_communes", label: "Loyer", montant: 100 },
    { section: "depenses_communes", label: "Électricité", montant: 100 },
    { section: "depenses_communes", label: "Box internet", montant: 100 },
    { section: "depenses_communes", label: "Téléphone 1", montant: 100 },
    { section: "depenses_communes", label: "Téléphone 2", montant: 100 },
    { section: "depenses_fixes", label: "Sport", montant: 100 },
    { section: "depenses_fixes", label: "Abonnement", montant: 100 },
    { section: "depenses_fixes", label: "Crédit 1", montant: 100 },
    { section: "depenses_fixes", label: "Crédit 2", montant: 100 },
    { section: "depenses_annuelles", label: "Abonnement annuel", montant_annuel: 100 },
    { section: "depenses_annuelles", label: "Nom de domaine", montant_annuel: 100 },
  ];

for (const item of items) {
  createBudgetItem(
    user.id,
    item.section as any,
    item.label,
    item.montant,
    item.montant_annuel
  );
}

console.log(`Seeded ${items.length} items for user ${username}.`);
