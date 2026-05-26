import { Appearance } from "react-native";

const light = {
  bg: "#f7f7f5",
  surface: "#ffffff",
  surfaceHover: "#f0f0ee",
  border: "#e8e8e5",
  text: "#1a1a1a",
  textMuted: "#6b6b6b",
  accent: "#d97757",
  accentLight: "#fdf1ec",
  green: "#2d9e6b",
  greenLight: "#edf7f3",
  red: "#c94a4a",
  redLight: "#fdf0f0",
  blue: "#4a7fc9",
  blueLight: "#f0f4fd",
};

const dark = {
  bg: "#1a1a1a",
  surface: "#242424",
  surfaceHover: "#2e2e2e",
  border: "#333333",
  text: "#ececec",
  textMuted: "#888888",
  accent: "#e08866",
  accentLight: "#2d1f18",
  green: "#3dbf82",
  greenLight: "#172b22",
  red: "#e06060",
  redLight: "#2b1717",
  blue: "#6a96d9",
  blueLight: "#18213a",
};

export type Theme = typeof light;

export function getTheme(): Theme {
  return Appearance.getColorScheme() === "dark" ? dark : light;
}
