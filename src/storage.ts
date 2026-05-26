import { join } from "path";
import type { Budget, Section } from "./types";

const DATA_PATH = join(import.meta.dir, "..", "budget.json");

export async function readBudget(): Promise<Budget> {
  const file = Bun.file(DATA_PATH);
  return file.json();
}

export async function writeBudget(budget: Budget): Promise<void> {
  await Bun.write(DATA_PATH, JSON.stringify(budget, null, 2));
}

export async function getSection<S extends Section>(
  budget: Budget,
  section: S
): Promise<Budget[S]> {
  return budget[section];
}

export async function budgetExists(): Promise<boolean> {
  return Bun.file(DATA_PATH).exists();
}
