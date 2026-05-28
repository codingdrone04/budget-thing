import { db } from "./db";
import { v4 as uuidv4 } from "uuid";
import type { Budget, Section } from "./types";
import { SECTIONS } from "./types";

type ItemRow = {
  id: string;
  section: string;
  label: string;
  montant: number | null;
  montant_annuel: number | null;
};

export function readBudget(userId: string): Budget {
  const budget: Budget = {
    revenus: [],
    depenses_communes: [],
    depenses_fixes: [],
    depenses_annuelles: [],
  };

  const rows = db
    .query<ItemRow, [string]>(
      "SELECT id, section, label, montant, montant_annuel FROM budget_items WHERE user_id = ? ORDER BY created_at ASC"
    )
    .all(userId);

  for (const row of rows) {
    const section = row.section as Section;
    if (!SECTIONS.includes(section)) continue;
    if (section === "depenses_annuelles") {
      budget.depenses_annuelles.push({
        id: row.id,
        label: row.label,
        montant_annuel: row.montant_annuel ?? 0,
      });
    } else {
      (budget[section] as Array<{ id: string; label: string; montant: number }>).push({
        id: row.id,
        label: row.label,
        montant: row.montant ?? 0,
      });
    }
  }

  return budget;
}

export function createBudgetItem(
  userId: string,
  section: Section,
  label: string,
  montant?: number,
  montant_annuel?: number
): Record<string, unknown> {
  const id = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  db.run(
    "INSERT INTO budget_items (id, user_id, section, label, montant, montant_annuel, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, userId, section, label, montant ?? null, montant_annuel ?? null, now]
  );
  const item: Record<string, unknown> = { id, label };
  if (section === "depenses_annuelles") item.montant_annuel = montant_annuel ?? 0;
  else item.montant = montant ?? 0;
  return item;
}

export function updateBudgetItem(
  userId: string,
  section: Section,
  id: string,
  patch: { label?: string; montant?: number; montant_annuel?: number }
): Record<string, unknown> | null {
  const row = db
    .query<ItemRow, [string, string, string]>(
      "SELECT id, label, montant, montant_annuel FROM budget_items WHERE id = ? AND user_id = ? AND section = ?"
    )
    .get(id, userId, section);
  if (!row) return null;

  const newLabel = patch.label !== undefined ? patch.label : row.label;
  const newMontant = patch.montant !== undefined ? patch.montant : row.montant;
  const newMontantAnnuel =
    patch.montant_annuel !== undefined ? patch.montant_annuel : row.montant_annuel;

  db.run("UPDATE budget_items SET label = ?, montant = ?, montant_annuel = ? WHERE id = ?", [
    newLabel,
    newMontant ?? null,
    newMontantAnnuel ?? null,
    id,
  ]);

  const result: Record<string, unknown> = { id, label: newLabel };
  if (section === "depenses_annuelles") result.montant_annuel = newMontantAnnuel ?? 0;
  else result.montant = newMontant ?? 0;
  return result;
}

export function deleteBudgetItem(userId: string, section: Section, id: string): boolean {
  const result = db.run(
    "DELETE FROM budget_items WHERE id = ? AND user_id = ? AND section = ?",
    [id, userId, section]
  );
  return result.changes > 0;
}
