import React from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import AppText from '../components/AppText';
import { useThemeContext } from '../context/ThemeContext';
import { useExpenseContext } from '../context/ExpenseContext';
import { Ionicons } from '@expo/vector-icons';

const CURRENCIES = [
  { symbol: '$', name: 'US Dollar (USD)' },
  { symbol: '€', name: 'Euro (EUR)' },
  { symbol: '£', name: 'British Pound (GBP)' },
  { symbol: '¥', name: 'Japanese Yen (JPY)' },
  { symbol: '₹', name: 'Indian Rupee (INR)' },
  { symbol: 'A$', name: 'Australian Dollar (AUD)' },
  { symbol: 'C$', name: 'Canadian Dollar (CAD)' },
  { symbol: 'Fr', name: 'Swiss Franc (CHF)' },
  { symbol: 'R$', name: 'Brazilian Real (BRL)' },
  { symbol: '₽', name: 'Russian Ruble (RUB)' },
];

export default function CurrencyScreen({ navigation }: any) {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();
  const { currency, updateCurrency } = useExpenseContext();

  const handleSelect = async (sym: string) => {
    await updateCurrency(sym);
    navigation.goBack();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
        {CURRENCIES.map((c, index) => {
          const isSelected = currency === c.symbol;
          return (
            <TouchableOpacity 
              key={c.symbol} 
              style={[
                styles.row, 
                index !== CURRENCIES.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDarkTheme ? '#333' : '#eee' }
              ]}
              onPress={() => handleSelect(c.symbol)}
            >
              <View style={styles.left}>
                <AppText style={[styles.symbol, { color: colors.primary }]}>{c.symbol}</AppText>
                <AppText style={[styles.name, { color: colors.text }]}>{c.name}</AppText>
              </View>
              {isSelected && <Ionicons name="checkmark" size={24} color={colors.primary} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    borderRadius: 16,
    paddingVertical: 8,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  symbol: {
    fontSize: 20,
    fontWeight: 'bold',
    width: 40, // fixed width for alignment
  },
  name: {
    fontSize: 16,
  },
});

