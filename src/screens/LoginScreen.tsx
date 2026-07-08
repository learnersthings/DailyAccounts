import React, { useState } from 'react';
import AppText from '../components/AppText';
import { useThemeColors } from '../hooks/useThemeColors';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useAuthContext } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';

export default function LoginScreen({ navigation }: any) {
  const colors = useThemeColors();
  const { login } = useAuthContext();
  const { isDarkTheme } = useThemeContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const placeholderColor = colors.textMuted;

  const handleLogin = async () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!emailRegex.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    }

    if (!isValid) return;

    try {
      await login(email, password);
    } catch (error: any) {
      setGeneralError(error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.headerContainer}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <AppText style={[styles.title, { color: colors.text }]}>Welcome</AppText>
          <AppText style={styles.subtitle}>Sign in to continue</AppText>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          {generalError ? <AppText style={styles.errorTextCenter}>{generalError}</AppText> : null}

          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: emailError ? '#ff4444' : (colors.border) }
              ]}
              placeholder="Email"
              placeholderTextColor={placeholderColor}
              value={email}
              onChangeText={(text) => { setEmail(text); setEmailError(''); setGeneralError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {emailError ? <AppText style={styles.errorText}>{emailError}</AppText> : null}
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: passwordError ? '#ff4444' : (colors.border) }
              ]}
              placeholder="Password"
              placeholderTextColor={placeholderColor}
              value={password}
              onChangeText={(text) => { setPassword(text); setPasswordError(''); setGeneralError(''); }}
              secureTextEntry
            />
            {passwordError ? <AppText style={styles.errorText}>{passwordError}</AppText> : null}
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleLogin}
          >
            <AppText style={styles.buttonText}>Log In</AppText>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.footer} onPress={() => navigation.navigate('Signup')}>
          <AppText style={[styles.link, { color: colors.text }]}>
            Don't have an account? <AppText style={{ color: colors.primary, fontWeight: 'bold' }}>Sign up</AppText>
          </AppText>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
    borderRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  card: {
    borderRadius: 16,
    padding: 24,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    marginBottom: 24,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  errorTextCenter: {
    color: '#ff4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  button: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 10,
  },
  link: {
    fontSize: 15,
  },
});


