import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';

export default function AppText({ style, ...props }: TextProps) {
  const { colors } = useTheme();
  const flatStyle = StyleSheet.flatten(style) || {};
  
  let fontFamily = 'Inter_400Regular';
  if (flatStyle.fontWeight === 'bold' || flatStyle.fontWeight === '700') {
    fontFamily = 'Inter_700Bold';
  } else if (flatStyle.fontWeight === '600') {
    fontFamily = 'Inter_600SemiBold';
  }

  return (
    <Text
      {...props}
      style={[{ color: colors.text }, style, { fontFamily }]} // fontFamily overrides fontWeight
    />
  );
}
