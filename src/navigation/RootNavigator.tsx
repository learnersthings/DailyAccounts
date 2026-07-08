import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { useThemeContext } from '../context/ThemeContext';
import { useAuthContext } from '../context/AuthContext';
import BottomTabs from './BottomTabs';
import AuthStack from './AuthStack';
import AnimatedSplashScreen from '../components/AnimatedSplashScreen';

export default function RootNavigator() {
  const { isDarkTheme, accentColor } = useThemeContext();
  const { isLoggedIn, isAuthLoading } = useAuthContext();
  const [isSplashAnimationDone, setIsSplashAnimationDone] = useState(false);

  const CustomDarkTheme = {
    ...DarkTheme,
    colors: { ...DarkTheme.colors, primary: accentColor },
  };

  const CustomLightTheme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, primary: accentColor },
  };

  useEffect(() => {
    // Hide the static native splash screen as soon as this mounts
    SplashScreen.hideAsync().catch(() => {});
    
    // Keep our animated splash screen visible for 2.5 seconds (matches the animation duration)
    const timer = setTimeout(() => {
      setIsSplashAnimationDone(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (isAuthLoading || !isSplashAnimationDone) {
    return <AnimatedSplashScreen accentColor={accentColor} />;
  }

  return (
    <NavigationContainer theme={isDarkTheme ? CustomDarkTheme : CustomLightTheme}>
      <StatusBar style={isDarkTheme ? 'light' : 'dark'} />
      {isLoggedIn ? <BottomTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

