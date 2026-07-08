import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashScreenProps {
  accentColor: string;
}

export default function AnimatedSplashScreen({ accentColor }: AnimatedSplashScreenProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Background pulse effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fade and scale in the logo
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate the loading bar
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2500, // Duration of the loading bar
      useNativeDriver: false,
    }).start();
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const bgScale1 = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const bgScale2 = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.2, 1],
  });

  const bgOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.25],
  });

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#000000']} // Premium dark gradient background
      style={styles.container}
    >
      {/* Animated Background Effects */}
      <Animated.View style={[
        styles.bgCircle,
        {
          backgroundColor: accentColor,
          top: -height * 0.2,
          left: -width * 0.3,
          transform: [{ scale: bgScale1 }],
          opacity: bgOpacity
        }
      ]} />
      <Animated.View style={[
        styles.bgCircle,
        {
          backgroundColor: accentColor,
          bottom: -height * 0.2,
          right: -width * 0.4,
          transform: [{ scale: bgScale2 }],
          opacity: bgOpacity
        }
      ]} />

      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center', width: '100%' }}>
        <Image
          source={require('../../assets/icon.png')}
          style={[styles.logo, { borderRadius: 20, width: 200, height: 200 }]}
          resizeMode="contain"
        />

        {/* Loading Bar */}
        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBar, { backgroundColor: accentColor, width: progressWidth }]} />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgCircle: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
  },
  logo: {
    width: width * 0.45,
    height: width * 0.45,
    marginBottom: 60,
  },
  progressBarContainer: {
    width: '50%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});
