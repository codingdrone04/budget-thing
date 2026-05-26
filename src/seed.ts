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
      { id: uuidv4(), label: "Salaire", montant: 100 },
      { id: uuidv4(), label: "Autre revenu", montant: 100 },
      { id: uuidv4(), label: "Aide", montant: 100 },
      { id: uuidv4(), label: "Participation au loyer", montant: 100 },
      { id: uuidv4(), label: "Participation aux charges", montant: 100 },
    ],
    depenses_communes: [
      { id: uuidv4(), label: "Loyer", montant: 100 },
      { id: uuidv4(), label: "Électricité", montant: 100 },
      { id: uuidv4(), label: "Box internet", montant: 100 },
      { id: uuidv4(), label: "Téléphone 1", montant: 100 },
      { id: uuidv4(), label: "Téléphone 2", montant: 100 },
    ],
    depenses_fixes: [
      { id: uuidv4(), label: "Sport", montant: 100 },
      { id: uuidv4(), label: "Abonnement", montant: 100 },
      { id: uuidv4(), label: "Crédit 1", montant: 100 },
      { id: uuidv4(), label: "Crédit 2", montant: 100 },
    ],
    depenses_annuelles: [
      { id: uuidv4(), label: "Abonnement annuel", montant_annuel: 100 },
      { id: uuidv4(), label: "Nom de domaine", montant_annuel: 100 },
    ],
  };

  await writeBudget(budget);
  console.log("budget.json created with initial data.");
}

seed();
