import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

interface PremiumCardBackgroundProps {
  children: React.ReactNode;
  color: string;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'reversed';
}

// Maps base accent colors to rich, multi-hue gradients
const getVibrantGradient = (hex: string): readonly [string, string, ...string[]] => {
  const map: Record<string, readonly [string, string, ...string[]]> = {
    '#3B82F6': ['#3B82F6', '#8B5CF6', '#4F46E5'], // Royal Blue -> Purple -> Indigo
    '#6366F1': ['#6366F1', '#4F46E5', '#312E81'], // Indigo -> Deep Indigo -> Dark Indigo
    '#10B981': ['#10B981', '#34D399', '#0EA5E9'], // Emerald -> Mint -> Sky Blue
    '#8B5CF6': ['#8B5CF6', '#6D28D9', '#4F46E5'], // Purple -> Deep Purple -> Indigo
    '#06B6D4': ['#06B6D4', '#0EA5E9', '#3B82F6'], // Cyan -> Sky Blue -> Royal Blue
    '#F59E0B': ['#F59E0B', '#F97316', '#EF4444'], // Amber -> Orange -> Red
    '#14B8A6': ['#14B8A6', '#0EA5E9', '#3B82F6'], // Teal -> Sky Blue -> Royal Blue
    '#EAB308': ['#EAB308', '#F97316', '#EF4444'], // Yellow -> Orange -> Red
    '#64748B': ['#64748B', '#94A3B8', '#CBD5E1'], // Slate Grey (Metallic)
    '#84CC16': ['#84CC16', '#10B981', '#14B8A6'], // Lime -> Emerald -> Teal
    '#8B4513': ['#8B4513', '#A16207', '#D97706'], // Brown -> Dark Orange -> Amber
    '#0EA5E9': ['#0EA5E9', '#3B82F6', '#6366F1'], // Sky Blue -> Royal Blue -> Indigo
    '#34D399': ['#34D399', '#14B8A6', '#0EA5E9'], // Mint -> Teal -> Sky Blue
    '#F97316': ['#F97316', '#EF4444', '#EAB308'], // Orange -> Red -> Yellow
    '#EF4444': ['#EF4444', '#F97316', '#EAB308'], // Red -> Orange -> Yellow
    '#A8A29E': ['#A8A29E', '#D6D3D1', '#F5F5F4'], // Warm Gray (Silver)
    '#0F172A': ['#0F172A', '#334155', '#64748B'], // Slate Dark
  };
  return map[hex.toUpperCase()] || [hex, hex, hex];
};

export default function PremiumCardBackground({ children, color, style, variant = 'default' }: PremiumCardBackgroundProps) {
  const baseGradient = getVibrantGradient(color);
  const gradientColors = (variant === 'reversed' ? [...baseGradient].reverse() : baseGradient) as readonly [string, string, ...string[]];

  return (
    <View style={[styles.container, style, { shadowColor: color }]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Abstract SVG Waves Overlay */}
        <View style={[StyleSheet.absoluteFillObject, variant === 'reversed' && { transform: [{ scaleX: -1 }] }]}>
          <Svg height="100%" width="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
            {/* Bottom flowing waves */}
            <Path d="M-50 250 C 100 100, 200 300, 450 50" stroke="rgba(255,255,255,0.25)" strokeWidth="1" fill="none" />
            <Path d="M-50 260 C 110 110, 210 310, 450 60" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />
            <Path d="M-50 270 C 120 120, 220 320, 450 70" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" />
            <Path d="M-50 280 C 130 130, 230 330, 450 80" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none" />
            <Path d="M-50 290 C 140 140, 240 340, 450 90" stroke="rgba(255,255,255,0.05)" strokeWidth="1" fill="none" />

            {/* Top flowing waves */}
            <Path d="M 450 -50 C 300 100, 200 -100, -50 150" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" />
            <Path d="M 450 -40 C 310 110, 210 -90, -50 160" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none" />
            <Path d="M 450 -30 C 320 120, 220 -80, -50 170" stroke="rgba(255,255,255,0.05)" strokeWidth="1" fill="none" />
          </Svg>
        </View>
        <View style={styles.content}>
          {children}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  gradient: {
    width: '100%',
  },
  content: {
    padding: 20,
    zIndex: 1,
  }
});
