import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import AccountTransactionsScreen from '../screens/AccountTransactionsScreen';
import { useThemeColors } from '../hooks/useThemeColors';

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  const colors = useThemeColors();
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="AccountTransactions" component={AccountTransactionsScreen} />
    </Stack.Navigator>
  );
}
