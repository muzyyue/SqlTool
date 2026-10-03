import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { getInitialTheme } from "@/design/theme.js";

export const useThemeStore = defineStore("theme", () => {
  const initialTheme = getInitialTheme();
  const isDark = ref(initialTheme === "dark");

  const toggle = () => {
    setTheme(isDark.value ? "light" : "dark");
  };

  const setTheme = (themeName) => {
    if (themeName !== "light" && themeName !== "dark") return;

    isDark.value = themeName === "dark";
    document.documentElement.setAttribute("data-theme", themeName);
    localStorage.setItem("theme", themeName);
  };

  watch(
    isDark,
    (newIsDark) => {
      setTheme(newIsDark ? "dark" : "light");
    },
    { immediate: true },
  );

  return {
    isDark,
    toggle,
    setTheme,
  };
});
