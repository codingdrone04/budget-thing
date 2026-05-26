import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import type { Budget, Section } from "../types";
import type { Theme } from "../theme";
import { fmt, sectionTotal } from "../utils";
import { api } from "../api";
import { EditModal } from "./EditModal";
import { ConfirmModal } from "./ConfirmModal";

const SECTION_LABELS: Record<Section, string> = {
  revenus: "Revenus",
  depenses_communes: "Dépenses communes",
  depenses_fixes: "Dépenses fixes",
  depenses_annuelles: "Dépenses annuelles",
};

const SECTION_COLORS: Record<
  Section,
  { badge: string; badgeText: string; accent: string }
> = {
  revenus: { badge: "#edf7f3", badgeText: "#2d9e6b", accent: "#2d9e6b" },
  depenses_communes: { badge: "#fdf0f0", badgeText: "#c94a4a", accent: "#c94a4a" },
  depenses_fixes: { badge: "#fdf0f0", badgeText: "#c94a4a", accent: "#c94a4a" },
  depenses_annuelles: { badge: "#f0f4fd", badgeText: "#4a7fc9", accent: "#4a7fc9" },
};

const DARK_SECTION_COLORS: Record<
  Section,
  { badge: string; badgeText: string; accent: string }
> = {
  revenus: { badge: "#172b22", badgeText: "#3dbf82", accent: "#3dbf82" },
  depenses_communes: { badge: "#2b1717", badgeText: "#e06060", accent: "#e06060" },
  depenses_fixes: { badge: "#2b1717", badgeText: "#e06060", accent: "#e06060" },
  depenses_annuelles: { badge: "#18213a", badgeText: "#6a96d9", accent: "#6a96d9" },
};

interface Props {
  section: Section;
  budget: Budget;
  onBudgetChange: (budget: Budget) => void;
  theme: Theme;
  isDark: boolean;
}

interface EditState {
  id: string;
  label: string;
  montant: number;
}

interface AddState {
  open: boolean;
}

interface DeleteState {
  id: string;
  label: string;
}

export function BudgetSection({ section, budget, onBudgetChange, theme, isDark }: Props) {
  const [editing, setEditing] = useState<EditState | null>(null);
  const [adding, setAdding] = useState<AddState>({ open: false });
  const [deleting, setDeleting] = useState<DeleteState | null>(null);

  const items = budget[section] as Array<{
    id: string;
    label: string;
    montant?: number;
    montant_annuel?: number;
  }>;
  const isAnnual = section === "depenses_annuelles";
  const total = sectionTotal(section, items);
  const colors = isDark ? DARK_SECTION_COLORS[section] : SECTION_COLORS[section];
  const s = styles(theme);

  async function handleEdit(label: string, montant: number) {
    if (!editing) return;
    const data = isAnnual ? { label, montant_annuel: montant } : { label, montant };
    try {
      await api.patchItem(section, editing.id, data);
      const newItems = items.map((i) =>
        i.id === editing.id ? { ...i, ...data } : i
      );
      onBudgetChange({ ...budget, [section]: newItems });
    } catch {
      Alert.alert("Erreur", "Impossible de modifier cet élément.");
    }
    setEditing(null);
  }

  async function handleAdd(label: string, montant: number) {
    const data = isAnnual ? { label, montant_annuel: montant } : { label, montant };
    try {
      const newItem = await api.addItem(section, data) as typeof items[0];
      onBudgetChange({ ...budget, [section]: [...items, newItem] });
    } catch {
      Alert.alert("Erreur", "Impossible d'ajouter cet élément.");
    }
    setAdding({ open: false });
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await api.deleteItem(section, deleting.id);
      onBudgetChange({
        ...budget,
        [section]: items.filter((i) => i.id !== deleting.id),
      });
    } catch {
      Alert.alert("Erreur", "Impossible de supprimer cet élément.");
    }
    setDeleting(null);
  }

  return (
    <View style={s.card}>
      {/* Section header */}
      <View style={s.cardHeader}>
        <Text style={s.sectionTitle}>{SECTION_LABELS[section]}</Text>
        <View style={[s.badge, { backgroundColor: colors.badge }]}>
          <Text style={[s.badgeText, { color: colors.badgeText }]}>{fmt(total)}</Text>
        </View>
      </View>

      {/* Rows */}
      {items.map((item, idx) => (
        <TouchableOpacity
          key={item.id}
          style={[s.row, idx === items.length - 1 && s.rowLast]}
          onPress={() =>
            setEditing({
              id: item.id,
              label: item.label,
              montant: isAnnual ? (item.montant_annuel ?? 0) : (item.montant ?? 0),
            })
          }
          onLongPress={() => setDeleting({ id: item.id, label: item.label })}
          activeOpacity={0.6}
        >
          <Text style={s.rowLabel} numberOfLines={1}>{item.label}</Text>
          <View style={s.rowRight}>
            {isAnnual ? (
              <View style={s.annualWrap}>
                <Text style={s.rowMontant}>{fmt(item.montant_annuel ?? 0)}/an</Text>
                <Text style={s.rowMontantSub}>{fmt((item.montant_annuel ?? 0) / 12)}/mois</Text>
              </View>
            ) : (
              <Text style={s.rowMontant}>{fmt(item.montant ?? 0)}</Text>
            )}
          </View>
        </TouchableOpacity>
      ))}

      {/* Add button */}
      <TouchableOpacity style={s.addRow} onPress={() => setAdding({ open: true })}>
        <Text style={[s.addText, { color: colors.accent }]}>+ Ajouter</Text>
      </TouchableOpacity>

      {/* Edit modal */}
      {editing && (
        <EditModal
          visible
          title={`Modifier — ${SECTION_LABELS[section]}`}
          initialLabel={editing.label}
          initialMontant={editing.montant}
          isAnnual={isAnnual}
          onSave={handleEdit}
          onCancel={() => setEditing(null)}
          theme={theme}
        />
      )}

      {/* Add modal */}
      <EditModal
        visible={adding.open}
        title={`Ajouter — ${SECTION_LABELS[section]}`}
        initialLabel=""
        initialMontant={0}
        isAnnual={isAnnual}
        onSave={handleAdd}
        onCancel={() => setAdding({ open: false })}
        theme={theme}
      />

      {/* Delete confirm */}
      {deleting && (
        <ConfirmModal
          visible
          label={deleting.label}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          theme={theme}
        />
      )}
    </View>
  );
}

const styles = (t: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      marginBottom: 16,
      overflow: "hidden",
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: t.text,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 20,
    },
    badgeText: {
      fontSize: 13,
      fontWeight: "700",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowLabel: {
      flex: 1,
      fontSize: 14,
      color: t.text,
      marginRight: 12,
    },
    rowRight: {
      alignItems: "flex-end",
    },
    rowMontant: {
      fontSize: 14,
      fontWeight: "600",
      color: t.text,
      fontVariant: ["tabular-nums"],
    },
    annualWrap: {
      alignItems: "flex-end",
    },
    rowMontantSub: {
      fontSize: 11.5,
      color: t.textMuted,
      fontVariant: ["tabular-nums"],
    },
    addRow: {
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderTopWidth: 1,
      borderTopColor: t.border,
    },
    addText: {
      fontSize: 13,
      fontWeight: "500",
    },
  });
