export interface RevenueItem {
  id: string;
  label: string;
  montant: number;
}

export interface ExpenseItem {
  id: string;
  label: string;
  montant: number;
}

export interface AnnualExpenseItem {
  id: string;
  label: string;
  montant_annuel: number;
}

export interface Budget {
  revenus: RevenueItem[];
  depenses_communes: ExpenseItem[];
  depenses_fixes: ExpenseItem[];
  depenses_annuelles: AnnualExpenseItem[];
}

export type Section = keyof Budget;

export const SECTIONS: Section[] = [
  "revenus",
  "depenses_communes",
  "depenses_fixes",
  "depenses_annuelles",
];
