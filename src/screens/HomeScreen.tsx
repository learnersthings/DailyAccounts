import React from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet } from 'react-native';
import AppText from '../components/AppText';
export default function HomeScreen() {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppText style={[styles.text, { color: colors.text }]}>Home Screen</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

