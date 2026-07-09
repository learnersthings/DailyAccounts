import React, { useState, useMemo } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../components/AppText';
import { useThemeContext } from '../context/ThemeContext';
import { useExpenseContext } from '../context/ExpenseContext';
import { Ionicons } from '@expo/vector-icons';
import { formatAmount } from '../utils/format';
import PremiumCardBackground from '../components/PremiumCardBackground';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function IncomeScreen() {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();
  const { expenses, monthlyIncomes, updateMonthlyIncome, currency } = useExpenseContext();
  const insets = useSafeAreaInsets();

  const currentYear = new Date().getFullYear();
  const startYear = 2022;
  const years = Array.from({ length: currentYear - startYear + 2 }, (_, i) => currentYear + 1 - i);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<{ monthIndex: number; monthName: string } | null>(null);
  const [incomeInput, setIncomeInput] = useState('');
  const [error, setError] = useState('');

  const monthlyStats = useMemo(() => {
    return MONTHS.map((monthName, index) => {
      const monthNumber = index + 1;
      const key = `${selectedYear}-${String(monthNumber).padStart(2, '0')}`;

      const income = monthlyIncomes[key] || 0;

      const expense = expenses
        .filter(e => {
          const d = new Date(e.date);
          return d.getFullYear() === selectedYear && d.getMonth() === index;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      const balance = income - expense;

      return {
        monthIndex: monthNumber,
        monthName,
        income,
        expense,
        balance
      };
    });
  }, [selectedYear, expenses, monthlyIncomes]);

  const yearlyTotals = useMemo(() => {
    return monthlyStats.reduce(
      (acc, curr) => {
        acc.income += curr.income;
        acc.expense += curr.expense;
        acc.balance += curr.balance;
        return acc;
      },
      { income: 0, expense: 0, balance: 0 }
    );
  }, [monthlyStats]);

  const handleOpenModal = (monthIndex: number, monthName: string, currentIncome: number) => {
    setSelectedMonth({ monthIndex, monthName });
    setIncomeInput(currentIncome > 0 ? currentIncome.toString() : '');
    setError('');
    setIsModalVisible(true);
  };

  const handleSaveIncome = async () => {
    if (!selectedMonth) return;

    const amountStr = incomeInput.trim();
    if (!amountStr) {
      // If empty, save as 0
      await updateMonthlyIncome(selectedYear, selectedMonth.monthIndex, 0);
      setIsModalVisible(false);
      return;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < 0) {
      setError('Please enter a valid positive number.');
      return;
    }

    await updateMonthlyIncome(selectedYear, selectedMonth.monthIndex, amount);
    setIsModalVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.yearSelectorContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearScroll}>
          {years.map(year => (
            <TouchableOpacity
              key={year}
              style={[
                styles.yearChip,
                { backgroundColor: selectedYear === year ? colors.primary : colors.surface }
              ]}
              onPress={() => setSelectedYear(year)}
            >
              <AppText style={[styles.yearChipText, { color: selectedYear === year ? '#fff' : colors.text }]}>
                {year}
              </AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <AppText style={[styles.title, { color: colors.text }]}>Monthly Income</AppText>
          <AppText style={styles.subtitle}>Set your income for each month to calculate your available balance against your tracked expenses.</AppText>
        </View>

        <PremiumCardBackground color={colors.primary} style={styles.yearlySummaryCard}>
          <View style={{ marginBottom: 16 }}>
            <AppText style={{ fontSize: 16, color: '#FFF', fontWeight: 'bold' }}>
              {selectedYear} Overview
            </AppText>
          </View>
          <View style={styles.yearlyStatsRow}>
            <View style={styles.yearlyStatColumn}>
              <AppText style={styles.statLabelWhite}>Total Income</AppText>
              <AppText style={[styles.statValue, { color: yearlyTotals.income === 0 ? '#FFF' : '#00C851' }]} numberOfLines={1}>
                {currency}{formatAmount(yearlyTotals.income)}
              </AppText>
            </View>
            <View style={styles.yearlyStatColumn}>
              <AppText style={styles.statLabelWhite}>Total Expense</AppText>
              <AppText style={[styles.statValue, { color: yearlyTotals.expense === 0 ? '#FFF' : '#ff4444' }]} numberOfLines={1}>
                {currency}{formatAmount(yearlyTotals.expense)}
              </AppText>
            </View>
            <View style={[styles.yearlyStatColumn, { alignItems: 'flex-end' }]}>
              <AppText style={styles.statLabelWhite}>Available</AppText>
              <AppText style={[styles.statValue, { color: yearlyTotals.balance === 0 ? '#FFF' : (yearlyTotals.balance > 0 ? '#00C851' : '#ff4444') }]} numberOfLines={1}>
                {yearlyTotals.balance === 0 ? '' : (yearlyTotals.balance > 0 ? '+' : '-')}{currency}{formatAmount(Math.abs(yearlyTotals.balance))}
              </AppText>
            </View>
          </View>
        </PremiumCardBackground>

        <View style={{ height: 2, backgroundColor: colors.accent, borderRadius: 1, marginBottom: 16 }} />

        <View style={styles.list}>
          {monthlyStats.map((stat, index) => (
            <TouchableOpacity
              key={stat.monthIndex}
              onPress={() => handleOpenModal(stat.monthIndex, stat.monthName, stat.income)}
            >
              <PremiumCardBackground color={colors.primary} style={styles.monthCard}>
                <View style={styles.cardHeader}>
                  <AppText style={[styles.monthName, { color: '#FFF' }]}>{stat.monthName}</AppText>
                  <Ionicons name="pencil" size={18} color="#FFF" />
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statColumn}>
                    <AppText style={styles.statLabelWhite}>Income</AppText>
                    <AppText style={[styles.statValue, { color: stat.income === 0 ? '#FFF' : '#00C851' }]} numberOfLines={1}>
                      {currency}{formatAmount(stat.income)}
                    </AppText>
                  </View>

                  <View style={styles.statColumn}>
                    <AppText style={styles.statLabelWhite}>Expense</AppText>
                    <AppText style={[styles.statValue, { color: stat.expense === 0 ? '#FFF' : '#ff4444' }]} numberOfLines={1}>
                      {currency}{formatAmount(stat.expense)}
                    </AppText>
                  </View>

                  <View style={[styles.statColumn, { alignItems: 'flex-end' }]}>
                    <AppText style={styles.statLabelWhite}>Available</AppText>
                    <AppText
                      style={[styles.statValue, { color: stat.balance === 0 ? '#FFF' : (stat.balance > 0 ? '#00C851' : '#ff4444') }]}
                      numberOfLines={1}
                    >
                      {stat.balance === 0 ? '' : (stat.balance > 0 ? '+' : '-')}{currency}{formatAmount(Math.abs(stat.balance))}
                    </AppText>
                  </View>
                </View>
              </PremiumCardBackground>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal visible={isModalVisible} transparent animationType="slide" onRequestClose={() => setIsModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[styles.modalContent, { backgroundColor: colors.background, paddingBottom: Math.max(24, insets.bottom + 16) }]}
            >
              <View style={styles.modalHeader}>
                <AppText style={[styles.modalTitle, { color: colors.text }]}>
                  Income for {selectedMonth?.monthName} {selectedYear}
                </AppText>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrapper}>
                <AppText style={[styles.label, { color: colors.text }]}>Income Amount</AppText>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={incomeInput}
                  onChangeText={(text) => {
                    setIncomeInput(text);
                    setError('');
                  }}
                  autoFocus
                />
                {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
              </View>

              <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSaveIncome}>
                <AppText style={styles.saveButtonText}>Save Income</AppText>
              </TouchableOpacity>

            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  yearSelectorContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  yearScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  yearChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  yearChipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
  yearlySummaryCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  yearlyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  yearlyStatColumn: {
    flex: 1,
  },
  list: {
    gap: 0,
  },
  monthCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statColumn: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 4,
    fontWeight: '600',
  },
  statLabelWhite: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    marginBottom: 4,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputWrapper: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
