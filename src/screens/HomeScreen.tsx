import React, { useState } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import AppText from '../components/AppText';
import { useAuthContext } from '../context/AuthContext';
import { useTransactionContext } from '../context/TransactionContext';
import { useExpenseContext } from '../context/ExpenseContext';
import { Ionicons } from '@expo/vector-icons';
import { formatAmount } from '../utils/format';
import AddTransactionModal from '../components/AddTransactionModal';

export default function HomeScreen({ navigation }: any) {
  const colors = useThemeColors();
  const { user } = useAuthContext();
  const { accounts, getAccountBalance } = useTransactionContext();
  const { currency } = useExpenseContext();

  const currentHour = new Date().getHours();
  let greeting = '';
  if (currentHour >= 5 && currentHour < 12) {
    greeting = 'Good Morning';
  } else if (currentHour >= 12 && currentHour < 18) {
    greeting = 'Good Afternoon';
  } else if (currentHour >= 18 && currentHour < 22) {
    greeting = 'Good Evening';
  } else {
    greeting = 'Hello';
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + getAccountBalance(acc), 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <AppText style={[styles.greetingText, { color: colors.text }]}>
          {greeting}, {user?.firstName || 'User'}!
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {accounts.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.primary, marginBottom: 24 }]}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="wallet" size={24} color="#fff" style={{ marginRight: 8 }} />
                <AppText style={[styles.cardTitle, { color: '#fff' }]}>Total Balance</AppText>
              </View>
            </View>
            <View style={styles.cardBody}>
              <AppText style={[styles.balanceLabel, { color: 'rgba(255,255,255,0.8)' }]}>Overall Available Balance</AppText>
              <AppText style={[styles.balanceAmount, { color: '#fff', fontSize: 32 }]}>
                {currency}{formatAmount(totalBalance)}
              </AppText>
            </View>
          </View>
        )}

        {accounts.map(acc => {
          const balance = getAccountBalance(acc);
          return (
            <TouchableOpacity
              key={acc}
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('AccountTransactions', { account: acc })}
            >
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="card" size={24} color={colors.primary} style={{ marginRight: 8 }} />
                  <AppText style={[styles.cardTitle, { color: colors.text }]}>{acc}</AppText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
              <View style={styles.cardBody}>
                <AppText style={styles.balanceLabel}>Available Balance</AppText>
                <AppText style={[styles.balanceAmount, { color: balance >= 0 ? colors.text : '#ff4444' }]}>
                  {currency}{formatAmount(balance)}
                </AppText>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // padding for FAB
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardBody: {
    marginTop: 4,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
  },
});
