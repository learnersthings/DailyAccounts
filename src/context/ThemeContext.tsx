import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthContext } from './AuthContext';

interface ThemeContextType {
  isDarkTheme: boolean;
  accentColor: string;
  toggleTheme: () => void;
  setAccentColor: (color: string) => Promise<void>;
  refreshTheme: () => Promise<void>;
}

export const ACCENT_COLORS = [
  '#3B82F6', // Royal Blue
  '#6366F1', // Indigo
  '#10B981', // Emerald Green
  '#06B6D4', // Cyan
  '#8B5CF6', // Amethyst Purple
  '#F59E0B', // Amber Orange
  '#14B8A6', // Teal
  '#EAB308', // Yellow
  '#64748B', // Slate Grey
  '#84CC16', // Lime Green
  '#8B4513', // Brown
  '#0EA5E9', // Sky Blue
  '#34D399', // Mint
  '#F97316', // Orange
  '#EF4444', // Red
  '#A8A29E', // Warm Gray
  '#0F172A', // Slate Dark
];

const ThemeContext = createContext<ThemeContextType>({
  isDarkTheme: true,
  accentColor: ACCENT_COLORS[0],
  toggleTheme: () => { },
  setAccentColor: async () => { },
  refreshTheme: async () => { },
});

export const useThemeContext = () => useContext(ThemeContext);

const THEME_KEY = '@app_theme_is_dark';
const ACCENT_KEY = '@app_theme_accent_color';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const { user } = useAuthContext();
  const themeKey = user ? `${THEME_KEY}_${user.email}` : THEME_KEY;
  const accentKey = user ? `${ACCENT_KEY}_${user.email}` : ACCENT_KEY;

  // Default to system theme or true (dark) if system is unavailable
  const [isDarkTheme, setIsDarkTheme] = useState(systemColorScheme === 'dark' || systemColorScheme == null);
  const [accentColor, setAccentColorState] = useState(ACCENT_COLORS[0]);
  const [isReady, setIsReady] = useState(false);

  const loadTheme = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(themeKey);
      if (storedTheme !== null) {
        setIsDarkTheme(JSON.parse(storedTheme));
      } else {
        const defaultTheme = systemColorScheme === 'dark' || systemColorScheme == null;
        setIsDarkTheme(defaultTheme);
        await AsyncStorage.setItem(themeKey, JSON.stringify(defaultTheme));
      }

      const storedAccent = await AsyncStorage.getItem(accentKey);
      if (storedAccent !== null) {
        setAccentColorState(storedAccent);
      } else {
        setAccentColorState(ACCENT_COLORS[0]);
        await AsyncStorage.setItem(accentKey, ACCENT_COLORS[0]);
      }
    } catch (e) {
      console.error('Failed to load theme.', e);
    } finally {
      setIsReady(true);
    }
  };

  useEffect(() => {
    loadTheme();
  }, [themeKey, accentKey]);

  const toggleTheme = async () => {
    const newTheme = !isDarkTheme;
    setIsDarkTheme(newTheme);
    await AsyncStorage.setItem(themeKey, JSON.stringify(newTheme));
  };

  const setAccentColor = async (color: string) => {
    setAccentColorState(color);
    await AsyncStorage.setItem(accentKey, color);
  };

  if (!isReady) return null;

  return (
    <ThemeContext.Provider value={{ isDarkTheme, accentColor, toggleTheme, setAccentColor, refreshTheme: loadTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};


