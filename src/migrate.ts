/**
 * Import an existing budget.json into the SQLite database for a given user.
 * Usage: MIGRATE_USERNAME=xenfroz bun run migrate
 */
import { join } from "path";
import { findUserByUsername } from "./auth";
import { createBudgetItem } from "./storage";
import type { Budget } from "./types";
import { SECTIONS } from "./types";

const username = process.env.MIGRATE_USERNAME;
if (!username) {
  console.error("Set MIGRATE_USERNAME env var.");
  process.exit(1);
}

const user = findUserByUsername(username);
if (!user) {
  console.error(`User not found: ${username}. Create the user first (bun run seed).`);
  process.exit(1);
}

const jsonPath = join(import.meta.dir, "..", "budget.json");
const file = Bun.file(jsonPath);
if (!(await file.exists())) {
  console.error("budget.json not found.");
  process.exit(1);
}

const budget: Budget = await file.json();
let count = 0;

for (const section of SECTIONS) {
  const items = budget[section] as Array<any>;
  for (const item of items) {
    if (section === "depenses_annuelles") {
      createBudgetItem(user.id, section, item.label, undefined, item.montant_annuel);
    } else {
      createBudgetItem(user.id, section, item.label, item.montant);
    }
    count++;
  }
}

console.log(`Imported ${count} items from budget.json for user ${username}.`);
