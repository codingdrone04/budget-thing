import { budgetExists, writeBudget } from "./storage";
import { v4 as uuidv4 } from "uuid";
import type { Budget } from "./types";

async function seed() {
  if (await budgetExists()) {
    console.log("budget.json already exists — skipping seed.");
    return;
  }

  const budget: Budget = {
    revenus: [
      { id: uuidv4(), label: "Salaire", montant: 1619.59 },
      { id: uuidv4(), label: "Prime d'activité", montant: 103.79 },
      { id: uuidv4(), label: "Aide au logement", montant: 202.0 },
      { id: uuidv4(), label: "Virement Loyer Smila", montant: 600.0 },
      { id: uuidv4(), label: "Virement Charges Communes Smila", montant: 75.29 },
    ],
    depenses_communes: [
      { id: uuidv4(), label: "Loyer", montant: 945.75 },
      { id: uuidv4(), label: "Électricité", montant: 93.62 },
      { id: uuidv4(), label: "Bouygues Box", montant: 28.99 },
      { id: uuidv4(), label: "Bouygues Tél. Samuel", montant: 13.99 },
      { id: uuidv4(), label: "Bouygues Tél. Smila", montant: 13.99 },
    ],
    depenses_fixes: [
      { id: uuidv4(), label: "Salle", montant: 29.99 },
      { id: uuidv4(), label: "Claude", montant: 21.6 },
      { id: uuidv4(), label: "Prêt 1", montant: 89.01 },
      { id: uuidv4(), label: "Prêt 2", montant: 71.02 },
    ],
    depenses_annuelles: [
      { id: uuidv4(), label: "Proton", montant_annuel: 179.88 },
      { id: uuidv4(), label: "Nom de domaine OVH", montant_annuel: 7.79 },
    ],
  };

  await writeBudget(budget);
  console.log("budget.json created with initial data.");
}

seed();
