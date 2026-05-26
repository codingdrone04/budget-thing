export function fmt(n: number): string {
  return (
    n.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
}

export function sectionTotal(
  section: string,
  items: Array<{ montant?: number; montant_annuel?: number }>
): number {
  if (section === "depenses_annuelles") {
    return items.reduce((s, i) => s + (i.montant_annuel ?? 0) / 12, 0);
  }
  return items.reduce((s, i) => s + (i.montant ?? 0), 0);
}
