import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import AppText from './AppText';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useThemeColors } from '../hooks/useThemeColors';
import { useThemeContext } from '../context/ThemeContext';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();

  return (
    <View style={styles.container}>
      <View style={styles.illustrationContainer}>
        {/* Abstract Blob Background */}
        <Svg width={240} height={240} viewBox="0 0 200 200" style={styles.svg}>
          <Defs>
            <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity={isDarkTheme ? "0.3" : "0.2"} />
              <Stop offset="100%" stopColor={colors.primary} stopOpacity={isDarkTheme ? "0.1" : "0.05"} />
            </LinearGradient>
          </Defs>
          <Path
            d="M48.2,-58.5C62.5,-45.5,74.1,-30.4,78.9,-13.6C83.8,3.2,81.9,21.8,71.7,35C61.4,48.2,42.8,56,23.8,61.9C4.8,67.8,-14.7,71.8,-33.3,66C-51.9,60.2,-69.7,44.7,-78.9,25.4C-88.1,6.1,-88.8,-17,-78.6,-34.5C-68.4,-52,-47.4,-63.9,-29.2,-68.8C-11,-73.8,4.5,-71.8,17.2,-65.7C30,-59.6,33.9,-71.5,48.2,-58.5Z"
            transform="translate(100 100) scale(1.1)"
            fill="url(#grad)"
          />
          <Path
            d="M25,-42.5C36.5,-31.5,43,-15.8,46,1.8C49,19.3,48.5,38.7,37,48.5C25.5,58.3,3,58.7,-16,53.2C-35,47.7,-50.5,36.3,-58,20.5C-65.5,4.7,-65,-15.3,-55.5,-28.8C-46,-42.3,-27.5,-49.3,-5.5,-42.8C16.5,-36.3,13.5,-53.5,25,-42.5Z"
            transform="translate(100 100) scale(1.3)"
            fill="url(#grad)"
          />
        </Svg>
        {/* Foreground Icon */}
        <View style={[
          styles.iconWrapper, 
          { 
            backgroundColor: colors.card,
            shadowColor: isDarkTheme ? '#000' : colors.primary
          }
        ]}>
          <Ionicons name={icon} size={48} color={colors.primary} />
        </View>
      </View>
      
      <AppText style={[styles.title, { color: colors.text }]}>{title}</AppText>
      <AppText style={[styles.message, { color: colors.textMuted }]}>{message}</AppText>
      
      {actionLabel && onAction && (
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={onAction}>
          <AppText style={styles.buttonText}>{actionLabel}</AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
    marginBottom: 40,
  },
  illustrationContainer: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  svg: {
    position: 'absolute',
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 15,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
