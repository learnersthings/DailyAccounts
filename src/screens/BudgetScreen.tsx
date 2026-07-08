import React, { useState } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Switch } from 'react-native';
import AppText from '../components/AppText';
import { useThemeContext } from '../context/ThemeContext';
import { useExpenseContext } from '../context/ExpenseContext';

export default function BudgetScreen({ navigation }: any) {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();
  const { currency, monthlyBudget, yearlyBudget, updateBudgets, showMonthlyBudget, showYearlyBudget, showYearCard, toggleShowMonthlyBudget, toggleShowYearlyBudget, toggleShowYearCard } = useExpenseContext();

  const [monthVal, setMonthVal] = useState(monthlyBudget > 0 ? monthlyBudget.toString() : '');
  const [yearVal, setYearVal] = useState(yearlyBudget > 0 ? yearlyBudget.toString() : '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const placeholderColor = colors.textMuted;

  const handleSave = async () => {
    setError('');
    setSuccess('');

    const m = Number(monthVal);
    const y = Number(yearVal);

    if (isNaN(m) || isNaN(y) || m < 0 || y < 0) {
      setError('Please enter valid positive numbers.');
      return;
    }

    try {
      await updateBudgets(m, y);
      setSuccess('Budgets saved successfully!');
      setTimeout(() => navigation.goBack(), 1500);
    } catch (e) {
      setError('Failed to save budgets.');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: colors.background }]} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          
          <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
            <AppText style={[styles.title, { color: colors.text }]}>Set Your Budgets</AppText>
            <AppText style={styles.subtitle}>These limits will help you track your spending.</AppText>

            {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
            {success ? <AppText style={styles.successText}>{success}</AppText> : null}

            <View style={styles.inputContainer}>
              <AppText style={styles.label}>Monthly Budget ({currency})</AppText>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. 500"
                placeholderTextColor={placeholderColor}
                keyboardType="numeric"
                value={monthVal}
                onChangeText={(t) => { setMonthVal(t); setError(''); setSuccess(''); }}
              />
            </View>

            <View style={styles.inputContainer}>
              <AppText style={styles.label}>Yearly Budget ({currency})</AppText>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. 6000"
                placeholderTextColor={placeholderColor}
                keyboardType="numeric"
                value={yearVal}
                onChangeText={(t) => { setYearVal(t); setError(''); setSuccess(''); }}
              />
            </View>

            <View style={styles.toggleContainer}>
              <AppText style={[styles.label, { color: colors.text, marginBottom: 0 }]}>Show Monthly Budget on Dashboard</AppText>
              <Switch
                trackColor={{ false: '#767577', true: colors.primary }}
                thumbColor={showMonthlyBudget ? '#ffffff' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                onValueChange={toggleShowMonthlyBudget}
                value={showMonthlyBudget}
              />
            </View>

            <View style={styles.toggleContainer}>
              <AppText style={[styles.label, { color: colors.text, marginBottom: 0 }]}>Show Yearly Budget on Dashboard</AppText>
              <Switch
                trackColor={{ false: '#767577', true: colors.primary }}
                thumbColor={showYearlyBudget ? '#ffffff' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                onValueChange={toggleShowYearlyBudget}
                value={showYearlyBudget}
              />
            </View>

            <View style={styles.toggleContainer}>
              <AppText style={[styles.label, { color: colors.text, marginBottom: 0 }]}>Show Entire Year Card on Dashboard</AppText>
              <Switch
                trackColor={{ false: '#767577', true: colors.primary }}
                thumbColor={showYearCard ? '#ffffff' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                onValueChange={toggleShowYearCard}
                value={showYearCard}
              />
            </View>

            <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <AppText style={styles.saveButtonText}>Save Budgets</AppText>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff4444',
    marginBottom: 16,
    fontWeight: '600',
  },
  successText: {
    color: '#00C851',
    marginBottom: 16,
    fontWeight: '600',
  },
});

