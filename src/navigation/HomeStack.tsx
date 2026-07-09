import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import AccountTransactionsScreen from '../screens/AccountTransactionsScreen';
import { useThemeColors } from '../hooks/useThemeColors';
import AppText from '../components/AppText';
import { View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  const colors = useThemeColors();
  
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background } 
      }}
    >
      <Stack.Screen 
        name="HomeScreen" 
        component={HomeScreen} 
        options={{ 
          headerShown: true,
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="home" size={22} color={colors.text} style={{ marginRight: 8 }} />
              <AppText style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Home</AppText>
            </View>
          )
        }} 
      />
      <Stack.Screen 
        name="AccountTransactions" 
        component={AccountTransactionsScreen} 
        options={({ route }: any) => ({
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: Platform.OS === 'android' ? -20 : 0 }}>
              <Ionicons name="card" size={22} color={colors.text} style={{ marginRight: 8 }} />
              <AppText style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>
                {route.params.account} Transactions
              </AppText>
            </View>
          ),
          headerBackTitleVisible: false,
        })}
      />
    </Stack.Navigator>
  );
}
