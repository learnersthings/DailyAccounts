import React from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View } from 'react-native';
import AppText from '../components/AppText';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/DashboardScreen';
import HomeStack from './HomeStack';
import TransactionsScreen from '../screens/TransactionsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import SettingsStack from './SettingsStack';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  const colors = useThemeColors();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: colors.card,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: colors.text,
        headerTitle: (props) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Dashboard') iconName = 'grid';
          else if (route.name === 'Transactions') iconName = 'newspaper';
          else if (route.name === 'Analytics') iconName = 'stats-chart';
          else if (route.name === 'Settings') iconName = 'settings';
          else iconName = 'ellipse';

          return (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name={iconName} size={22} color={colors.text} style={{ marginRight: 8 }} />
              <AppText style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>{props.children}</AppText>
            </View>
          );
        },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Transactions') {
            iconName = focused ? 'newspaper' : 'newspaper-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack} 
        options={{ headerShown: false }}
      />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}

