import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LIGHT_THEME, DARK_THEME } from "../theme/colors";

interface ThemeContextData {
  theme: typeof LIGHT_THEME;
  darkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextData | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const theme = darkMode ? DARK_THEME : LIGHT_THEME;

  // Carrega o tema salvo ao iniciar o app
  useEffect(() => {
    async function loadTheme() {
      try {
        const storedTheme = await AsyncStorage.getItem("@theme:darkMode");
        if (storedTheme !== null) {
          setDarkMode(storedTheme === "true");
        }
      } catch (error) {
        console.log("Erro ao carregar tema:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTheme();
  }, []);

  // Salva o tema sempre que mudar
  useEffect(() => {
    AsyncStorage.setItem("@theme:darkMode", darkMode.toString());
  }, [darkMode]);

  function toggleTheme() {
    setDarkMode((prev) => !prev);
  }

  if (loading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, darkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme deve ser usado dentro de um ThemeProvider");
  }

  return context;
}
