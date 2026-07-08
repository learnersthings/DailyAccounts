import React from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet } from 'react-native';
import AppText from '../components/AppText';
import { useAuthContext } from '../context/AuthContext';

export default function HomeScreen() {
  const colors = useThemeColors();
  const { user } = useAuthContext();

  const currentHour = new Date().getHours();
  let greeting = '';
  if (currentHour >= 5 && currentHour < 12) {
    greeting = 'Good Morning';
  } else if (currentHour >= 12 && currentHour < 18) {
    greeting = 'Good Afternoon';
  } else if (currentHour >= 18 && currentHour < 22) {
    greeting = 'Good Evening';
  } else {
    greeting = 'Hello';
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppText style={[styles.text, { color: colors.text }]}>
        {greeting}, {user?.firstName || 'User'}!
      </AppText>
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
    fontSize: 24,
    fontWeight: 'bold',
  },
});
