import { useTheme } from '@react-navigation/native';
import { useThemeContext } from '../context/ThemeContext';

export function useThemeColors() {
  const { colors } = useTheme();
  const { isDarkTheme, accentColor } = useThemeContext();

  return {
    ...colors,
    surface: isDarkTheme ? '#1e1e1e' : '#f5f5f5',
    surfaceVariant: isDarkTheme ? '#2a2a2a' : '#eaeaea',
    textMuted: isDarkTheme ? '#888' : '#aaa',
    shadow: isDarkTheme ? accentColor : '#000000',
    border: isDarkTheme ? '#333333' : '#e0e0e0',
  };
}