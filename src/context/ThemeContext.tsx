import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
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

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const { user } = useAuthContext();

  const [isDarkTheme, setIsDarkTheme] = useState(systemColorScheme === 'dark' || systemColorScheme == null);
  const [accentColor, setAccentColorState] = useState(ACCENT_COLORS[0]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let unsubscribe: () => void;

    const initTheme = () => {
      if (user && user.uid) {
        setIsReady(false);
        unsubscribe = onSnapshot(doc(db, 'users', user.uid, 'settings', 'preferences'), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.isDarkTheme !== undefined) setIsDarkTheme(data.isDarkTheme);
            if (data.accentColor !== undefined) setAccentColorState(data.accentColor);
          }
          setIsReady(true);
        }, (error) => {
          console.error("Theme snapshot error:", error);
          setIsReady(true);
        });
      } else {
        // Fallback if not logged in
        setIsDarkTheme(systemColorScheme === 'dark' || systemColorScheme == null);
        setAccentColorState(ACCENT_COLORS[0]);
        setIsReady(true);
      }
    };

    initTheme();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, systemColorScheme]);

  const toggleTheme = async () => {
    const newTheme = !isDarkTheme;
    // Optimistic update
    setIsDarkTheme(newTheme);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), {
        isDarkTheme: newTheme
      }, { merge: true }).catch(console.error);
    }
  };

  const setAccentColor = async (color: string) => {
    // Optimistic update
    setAccentColorState(color);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), {
        accentColor: color
      }, { merge: true }).catch(console.error);
    }
  };

  if (!isReady) return null;

  return (
    <ThemeContext.Provider value={{ isDarkTheme, accentColor, toggleTheme, setAccentColor, refreshTheme: async () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
};


