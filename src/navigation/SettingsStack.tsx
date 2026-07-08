import React from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View } from 'react-native';
import AppText from '../components/AppText';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CurrencyScreen from '../screens/CurrencyScreen';
import BudgetScreen from '../screens/BudgetScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import PaymentModesScreen from '../screens/PaymentModesScreen';
import AnalyticsChartSettingsScreen from '../screens/AnalyticsChartSettingsScreen';

const Stack = createNativeStackNavigator();

export default function SettingsStack() {
  const colors = useThemeColors();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="SettingsMain" 
        component={SettingsScreen} 
        options={{ 
          headerShown: true,
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="settings" size={22} color={colors.text} style={{ marginRight: 8 }} />
              <AppText style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Settings</AppText>
            </View>
          )
        }} 
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'User Profile' }} 
      />
      <Stack.Screen 
        name="Currency" 
        component={CurrencyScreen} 
        options={{ title: 'Select Currency' }} 
      />
      <Stack.Screen 
        name="Budget" 
        component={BudgetScreen} 
        options={{ title: 'Set Budget' }} 
      />
      <Stack.Screen 
        name="Categories" 
        component={CategoriesScreen} 
        options={{ title: 'Manage Categories' }} 
      />
      <Stack.Screen 
        name="PaymentModes" 
        component={PaymentModesScreen} 
        options={{ title: 'Payment Modes' }} 
      />
      <Stack.Screen 
        name="AnalyticsChartSettings" 
        component={AnalyticsChartSettingsScreen} 
        options={{ title: 'Analytics Chart' }} 
      />
    </Stack.Navigator>
  );
}

