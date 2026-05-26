import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { Budget } from "../types";
import type { Theme } from "../theme";
import { fmt, sectionTotal } from "../utils";

interface Props {
  budget: Budget;
  theme: Theme;
}

export function SummaryPanel({ budget, theme }: Props) {
  const totalRevenus = sectionTotal("revenus", budget.revenus);
  const totalCommunes = sectionTotal("depenses_communes", budget.depenses_communes);
  const totalFixes = sectionTotal("depenses_fixes", budget.depenses_fixes);
  const totalAnnuelles = sectionTotal("depenses_annuelles", budget.depenses_annuelles);
  const totalDepenses = totalCommunes + totalFixes + totalAnnuelles;
  const roulement = totalRevenus - totalDepenses;
  const pct = totalRevenus > 0
    ? Math.min(100, Math.max(0, Math.round((roulement / totalRevenus) * 100)))
    : 0;

  const s = styles(theme);

  return (
    <View style={s.panel}>
      <Text style={s.panelTitle}>Bilan mensuel</Text>

      <View style={s.row}>
        <Text style={s.label}>Revenus</Text>
        <Text style={[s.value, s.positive]}>{fmt(totalRevenus)}</Text>
      </View>

      <View style={s.divider} />

      <View style={s.row}>
        <Text style={s.label}>Communes</Text>
        <Text style={s.value}>{fmt(totalCommunes)}</Text>
      </View>
      <View style={s.row}>
        <Text style={s.label}>Fixes</Text>
        <Text style={s.value}>{fmt(totalFixes)}</Text>
      </View>
      <View style={s.row}>
        <Text style={s.label}>Annuelles ÷12</Text>
        <Text style={s.value}>{fmt(totalAnnuelles)}</Text>
      </View>
      <View style={s.row}>
        <Text style={[s.label, s.bold]}>Total dépenses</Text>
        <Text style={[s.value, s.negative]}>{fmt(totalDepenses)}</Text>
      </View>

      <View style={s.divider} />

      <View style={s.row}>
        <Text style={[s.label, s.bold]}>Roulement</Text>
        <Text style={[s.valueRoulement, roulement >= 0 ? s.positive : s.negative]}>
          {fmt(roulement)}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={s.progressTrack}>
        <View
          style={[
            s.progressFill,
            { width: `${pct}%` as `${number}%`, backgroundColor: roulement >= 0 ? theme.green : theme.red },
          ]}
        />
      </View>
      <Text style={s.progressLabel}>
        {roulement >= 0 ? "+" : ""}{pct}% du revenu disponible
      </Text>
    </View>
  );
}

const styles = (t: Theme) =>
  StyleSheet.create({
    panel: {
      backgroundColor: t.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      padding: 18,
      marginBottom: 16,
    },
    panelTitle: {
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.7,
      color: t.textMuted,
      marginBottom: 14,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 7,
    },
    label: {
      fontSize: 13,
      color: t.textMuted,
    },
    bold: {
      fontWeight: "600",
      color: t.text,
    },
    value: {
      fontSize: 13,
      fontWeight: "600",
      color: t.text,
      fontVariant: ["tabular-nums"],
    },
    valueRoulement: {
      fontSize: 16,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    positive: { color: t.green },
    negative: { color: t.red },
    divider: {
      height: 1,
      backgroundColor: t.border,
      marginVertical: 8,
    },
    progressTrack: {
      height: 4,
      backgroundColor: t.border,
      borderRadius: 2,
      overflow: "hidden",
      marginTop: 10,
      marginBottom: 6,
    },
    progressFill: {
      height: "100%",
      borderRadius: 2,
    },
    progressLabel: {
      fontSize: 11,
      color: t.textMuted,
      textAlign: "right",
    },
  });
