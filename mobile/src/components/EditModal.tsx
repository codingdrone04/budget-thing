import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import type { Theme } from "../theme";

interface Props {
  visible: boolean;
  title: string;
  initialLabel: string;
  initialMontant: number;
  isAnnual?: boolean;
  onSave: (label: string, montant: number) => void;
  onCancel: () => void;
  theme: Theme;
}

export function EditModal({
  visible,
  title,
  initialLabel,
  initialMontant,
  isAnnual = false,
  onSave,
  onCancel,
  theme,
}: Props) {
  const [label, setLabel] = useState(initialLabel);
  const [montant, setMontant] = useState(String(initialMontant));
  const s = styles(theme);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.backdrop}
      >
        <View style={s.box}>
          <Text style={s.title}>{title}</Text>

          <Text style={s.fieldLabel}>Libellé</Text>
          <TextInput
            style={s.input}
            value={label}
            onChangeText={setLabel}
            placeholderTextColor={theme.textMuted}
            autoFocus
          />

          <Text style={s.fieldLabel}>{isAnnual ? "Montant annuel (€)" : "Montant (€)"}</Text>
          <TextInput
            style={s.input}
            value={montant}
            onChangeText={setMontant}
            keyboardType="decimal-pad"
            placeholderTextColor={theme.textMuted}
          />

          <View style={s.actions}>
            <TouchableOpacity style={s.btnSecondary} onPress={onCancel}>
              <Text style={s.btnSecondaryText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.btnPrimary}
              onPress={() => {
                const val = parseFloat(montant.replace(",", "."));
                if (!label.trim() || isNaN(val)) return;
                onSave(label.trim(), val);
              }}
            >
              <Text style={s.btnPrimaryText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = (t: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    box: {
      width: "100%",
      backgroundColor: t.surface,
      borderRadius: 12,
      padding: 24,
    },
    title: {
      fontSize: 16,
      fontWeight: "600",
      color: t.text,
      marginBottom: 18,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: "500",
      color: t.textMuted,
      marginBottom: 6,
    },
    input: {
      backgroundColor: t.bg,
      borderWidth: 1.5,
      borderColor: t.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: t.text,
      marginBottom: 14,
    },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 4,
    },
    btnSecondary: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surfaceHover,
    },
    btnSecondaryText: {
      fontSize: 14,
      fontWeight: "500",
      color: t.text,
    },
    btnPrimary: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: t.accent,
    },
    btnPrimaryText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#fff",
    },
  });
