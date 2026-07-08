import React, { useState } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import AppText from '../components/AppText';
import { useAuthContext } from '../context/AuthContext';
import { useTransactionContext } from '../context/TransactionContext';
import { useExpenseContext } from '../context/ExpenseContext';
import { Ionicons } from '@expo/vector-icons';
import { formatAmount } from '../utils/format';
import AddTransactionModal from '../components/AddTransactionModal';

export default function HomeScreen({ navigation }: any) {
  const colors = useThemeColors();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { user } = useAuthContext();
  const { accounts, getAccountStats, updateAccountOrder, deleteAccount, excludedFromTotal, showCardStats } = useTransactionContext();
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

  let totalBalance = 0;
  let totalCredit = 0;
  let totalDebit = 0;

  accounts.forEach(acc => {
    if (!excludedFromTotal.includes(acc)) {
      const stats = getAccountStats(acc);
      totalBalance += stats.balance;
      totalCredit += stats.totalCredit;
      totalDebit += stats.totalDebit;
    }
  });

  const handleDragEnd = async ({ data }: { data: string[] }) => {
    await updateAccountOrder(data);
  };

  const handleDeleteAccount = (accountName: string) => {
    setActiveDropdown(null);
    Alert.alert(
      "Delete Account",
      `Are you sure you want to delete "${accountName}" and ALL of its transactions? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteAccount(accountName) }
      ]
    );
  };

  const renderItem = ({ item: acc, drag, isActive }: RenderItemParams<string>) => {
    const stats = getAccountStats(acc);
    return (
      <ScaleDecorator>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card, elevation: isActive ? 8 : 4, zIndex: activeDropdown === acc ? 100 : 1 }]}
          onPress={() => {
            if (activeDropdown) {
              setActiveDropdown(null);
            } else {
              navigation.navigate('AccountTransactions', { account: acc });
            }
          }}
          onLongPress={drag}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="card" size={24} color={colors.primary} style={{ marginRight: 8 }} />
              <AppText style={[styles.cardTitle, { color: colors.text }]}>{acc}</AppText>
            </View>

            <View style={{ position: 'relative' }}>
              <TouchableOpacity
                onPress={() => setActiveDropdown(activeDropdown === acc ? null : acc)}
                style={{ padding: 4 }}
              >
                <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              {activeDropdown === acc && (
                <View style={[styles.dropdownMenu, { backgroundColor: colors.surface }]}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setActiveDropdown(null);
                      navigation.navigate('AccountTransactions', { account: acc });
                    }}
                  >
                    <Ionicons name="eye-outline" size={18} color={colors.text} style={{ marginRight: 8 }} />
                    <AppText style={{ color: colors.text }}>View</AppText>
                  </TouchableOpacity>

                  <View style={{ height: 1, backgroundColor: colors.border }} />

                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => handleDeleteAccount(acc)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ff4444" style={{ marginRight: 8 }} />
                    <AppText style={{ color: '#ff4444' }}>Delete</AppText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          <View style={styles.cardBody}>
            <AppText style={styles.balanceLabel}>Available Balance</AppText>
            <AppText style={[styles.balanceAmount, { color: stats.balance >= 0 ? colors.text : '#ff4444' }]}>
              {currency}{formatAmount(stats.balance)}
            </AppText>

            {showCardStats && (
              <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="arrow-down-circle" size={16} color="#4CAF50" style={{ marginRight: 4 }} />
                    <AppText style={{ fontSize: 12, color: colors.textMuted }}>CREDIT</AppText>
                  </View>
                  <AppText style={{ fontSize: 16, fontWeight: 'bold', color: '#4CAF50' }}>{currency}{formatAmount(stats.totalCredit)}</AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="arrow-up-circle" size={16} color="#F44336" style={{ marginRight: 4 }} />
                    <AppText style={{ fontSize: 12, color: colors.textMuted }}>DEBIT</AppText>
                  </View>
                  <AppText style={{ fontSize: 16, fontWeight: 'bold', color: '#F44336' }}>{currency}{formatAmount(stats.totalDebit)}</AppText>
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  const listHeader = accounts.length > 0 ? (
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

        {showCardStats && (
          <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="arrow-down-circle" size={16} color="rgba(255,255,255,0.9)" style={{ marginRight: 4 }} />
                <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>TOTAL CREDIT</AppText>
              </View>
              <AppText style={{ fontSize: 16, fontWeight: 'bold', color: '#fff' }}>{currency}{formatAmount(totalCredit)}</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="arrow-up-circle" size={16} color="rgba(255,255,255,0.9)" style={{ marginRight: 4 }} />
                <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>TOTAL DEBIT</AppText>
              </View>
              <AppText style={{ fontSize: 16, fontWeight: 'bold', color: '#fff' }}>{currency}{formatAmount(totalDebit)}</AppText>
            </View>
          </View>
        )}
      </View>
    </View>
  ) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <AppText style={[styles.greetingText, { color: colors.text }]}>
          {greeting}, {user?.firstName || 'User'}!
        </AppText>
      </View>

      <DraggableFlatList
        data={accounts}
        keyExtractor={item => item}
        onDragEnd={handleDragEnd}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.scrollContent}
        activationDistance={20}
      />
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
  dropdownMenu: {
    position: 'absolute',
    top: 30,
    right: 0,
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    minWidth: 120,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
  },
});
