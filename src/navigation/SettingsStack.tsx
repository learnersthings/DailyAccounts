import React from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, Platform } from 'react-native';
import AppText from '../components/AppText';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CurrencyScreen from '../screens/CurrencyScreen';
import BudgetScreen from '../screens/BudgetScreen';
import IncomeScreen from '../screens/IncomeScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import PaymentModesScreen from '../screens/PaymentModesScreen';
import ManageAccountsScreen from '../screens/ManageAccountsScreen';
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
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: Platform.OS === 'android' ? -20 : 0 }}>
              <Ionicons name="person" size={22} color={colors.text} style={{ marginRight: 8 }} />
              <AppText style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>User Profile</AppText>
            </View>
          )
        }}
      />
      <Stack.Screen
        name="Currency"
        component={CurrencyScreen}
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: Platform.OS === 'android' ? -20 : 0 }}>
              <Ionicons name="cash" size={22} color={colors.text} style={{ marginRight: 8 }} />
              <AppText style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Select Currency</AppText>
            </View>
          )
        }}
      />
      <Stack.Screen 
        name="Budget" 
        component={BudgetScreen} 
        options={{ 
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: Platform.OS === 'android' ? -20 : 0 }}>
              <Ionicons name="wallet" size={22} color={colors.text} style={{ marginRight: 8 }} />
              <AppText style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Budget</AppText>
            </View>
          )
        }} 
      />
      <Stack.Screen 
        name="Income" 
        component={IncomeScreen} 
        options={{ 
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: Platform.OS === 'android' ? -20 : 0 }}>
              <Ionicons name="cash" size={22} color={colors.text} style={{ marginRight: 8 }} />
              <AppText style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Monthly Income</AppText>
            </View>
          )
        }} 
      />
      <Stack.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: Platform.OS === 'android' ? -20 : 0 }}>
              <Ionicons name="pricetag" size={22} color={colors.text} style={{ marginRight: 8 }} />
              <AppText style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Manage Categories</AppText>
            </View>
          )
        }}
      />
      <Stack.Screen
        name="ManageAccounts"
        component={ManageAccountsScreen}
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: Platform.OS === 'android' ? -20 : 0 }}>
              <Ionicons name="business" size={22} color={colors.text} style={{ marginRight: 8 }} />
              <AppText style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Manage Accounts</AppText>
            </View>
          )
        }}
      />
      <Stack.Screen
        name="PaymentModes"
        component={PaymentModesScreen}
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: Platform.OS === 'android' ? -20 : 0 }}>
              <Ionicons name="card" size={22} color={colors.text} style={{ marginRight: 8 }} />
              <AppText style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Payment Modes</AppText>
            </View>
          )
        }}
      />
      <Stack.Screen
        name="AnalyticsChartSettings"
        component={AnalyticsChartSettingsScreen}
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: Platform.OS === 'android' ? -20 : 0 }}>
              <Ionicons name="bar-chart" size={22} color={colors.text} style={{ marginRight: 8 }} />
              <AppText style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Analytics Chart</AppText>
            </View>
          )
        }}
      />
    </Stack.Navigator>
  );
}

