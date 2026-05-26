import React, { useEffect, useState, useCallback } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  useColorScheme,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { api } from "./src/api";
import { getTheme } from "./src/theme";
import type { Budget } from "./src/types";
import { BudgetSection } from "./src/components/BudgetSection";
import { SummaryPanel } from "./src/components/SummaryPanel";

const SECTIONS = [
  "revenus",
  "depenses_communes",
  "depenses_fixes",
  "depenses_annuelles",
] as const;

export default function App() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getTheme();

  const [budget, setBudget] = useState<Budget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getBudget();
      setBudget(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const s = styles(theme);

  if (error) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.errorTitle}>Impossible de charger</Text>
          <Text style={s.errorSub}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!budget) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator color={theme.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.bg}
      />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent}
          />
        }
      >
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>budget-thing</Text>
          <Text style={s.pageSub}>
            Appuyer sur une ligne pour modifier · Maintenir pour supprimer
          </Text>
        </View>

        <SummaryPanel budget={budget} theme={theme} />

        {SECTIONS.map((section) => (
          <BudgetSection
            key={section}
            section={section}
            budget={budget}
            onBudgetChange={setBudget}
            theme={theme}
            isDark={isDark}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (t: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: t.bg,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 40,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    pageHeader: {
      marginBottom: 16,
    },
    pageTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: t.text,
      letterSpacing: -0.3,
      marginBottom: 4,
    },
    pageSub: {
      fontSize: 12,
      color: t.textMuted,
      lineHeight: 18,
    },
    errorTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: t.text,
      marginBottom: 8,
      textAlign: "center",
    },
    errorSub: {
      fontSize: 13,
      color: t.textMuted,
      textAlign: "center",
    },
  });
