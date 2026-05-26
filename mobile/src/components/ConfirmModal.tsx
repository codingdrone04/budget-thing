import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import type { Theme } from "../theme";

interface Props {
  visible: boolean;
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
  theme: Theme;
}

export function ConfirmModal({ visible, label, onConfirm, onCancel, theme }: Props) {
  const s = styles(theme);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.backdrop}>
        <View style={s.box}>
          <Text style={s.title}>Supprimer</Text>
          <Text style={s.body}>
            Supprimer <Text style={s.bold}>{label}</Text> ?
          </Text>
          <View style={s.actions}>
            <TouchableOpacity style={s.btnSecondary} onPress={onCancel}>
              <Text style={s.btnSecondaryText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnDanger} onPress={onConfirm}>
              <Text style={s.btnDangerText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
      marginBottom: 10,
    },
    body: {
      fontSize: 14,
      color: t.text,
      lineHeight: 22,
      marginBottom: 20,
    },
    bold: { fontWeight: "600" },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
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
    btnDanger: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: t.red,
    },
    btnDangerText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#fff",
    },
  });
