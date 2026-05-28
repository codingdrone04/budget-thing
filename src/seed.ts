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
    { section: "revenus", label: "Salaire", montant: 1619.59 },
    { section: "revenus", label: "Prime d'activité", montant: 103.79 },
    { section: "revenus", label: "Aide au logement", montant: 202.0 },
    { section: "revenus", label: "Virement Loyer Smila", montant: 600.0 },
    { section: "revenus", label: "Virement Charges Communes Smila", montant: 75.29 },
    { section: "depenses_communes", label: "Loyer", montant: 945.75 },
    { section: "depenses_communes", label: "Électricité", montant: 93.62 },
    { section: "depenses_communes", label: "Bouygues Box", montant: 28.99 },
    { section: "depenses_communes", label: "Bouygues Tél. Samuel", montant: 13.99 },
    { section: "depenses_communes", label: "Bouygues Tél. Smila", montant: 13.99 },
    { section: "depenses_fixes", label: "Salle", montant: 29.99 },
    { section: "depenses_fixes", label: "Claude", montant: 21.6 },
    { section: "depenses_fixes", label: "Prêt 1", montant: 89.01 },
    { section: "depenses_fixes", label: "Prêt 2", montant: 71.02 },
    { section: "depenses_annuelles", label: "Proton", montant_annuel: 179.88 },
    { section: "depenses_annuelles", label: "Nom de domaine OVH", montant_annuel: 7.79 },
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
