import React, { useState, useMemo } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, TouchableOpacity, Alert, FlatList } from 'react-native';
import AppText from '../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../context/ThemeContext';
import { useTransactionContext, BankTransaction } from '../context/TransactionContext';
import { useExpenseContext } from '../context/ExpenseContext';
import { formatAmount } from '../utils/format';
import AddTransactionModal from './AddTransactionModal';

interface BankTransactionListProps {
  accountFilter?: string;
}

export default function BankTransactionList({ accountFilter }: BankTransactionListProps) {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();
  const { transactions, deleteTransaction, bulkDeleteTransactions } = useTransactionContext();
  const { currency } = useExpenseContext();
  
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredTransactions = useMemo(() => {
    if (!accountFilter) return transactions;
    return transactions.filter(t => t.account === accountFilter);
  }, [transactions, accountFilter]);

  const handleRowPress = (tx: BankTransaction) => {
    if (isSelectMode) {
      if (selectedIds.includes(tx.id)) {
        setSelectedIds(selectedIds.filter(id => id !== tx.id));
      } else {
        setSelectedIds([...selectedIds, tx.id]);
      }
    } else {
      setSelectedTransaction(tx);
      setIsModalVisible(true);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map(t => t.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      "Delete Transactions",
      `Are you sure you want to delete ${selectedIds.length} selected transactions?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await bulkDeleteTransactions(selectedIds);
            setIsSelectMode(false);
            setSelectedIds([]);
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: BankTransaction }) => {
    const isCredit = item.type === 'Credit';
    const isSelected = selectedIds.includes(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.expenseRow, { backgroundColor: isSelected ? colors.surface : colors.card, elevation: isSelected ? 4 : 0 }]}
        onPress={() => handleRowPress(item)}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {isSelectMode && (
            <View style={[styles.checkbox, { borderColor: colors.primary, backgroundColor: isSelected ? colors.primary : 'transparent' }]}>
              {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
          )}
          <View style={[styles.expenseIcon, { backgroundColor: isCredit ? '#00C851' : '#ff4444' }]}>
            <Ionicons name={isCredit ? "arrow-down" : "arrow-up"} size={20} color="#fff" />
          </View>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <AppText style={[styles.expenseDesc, { color: colors.text }]} numberOfLines={1}>{item.description}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <AppText style={styles.expenseDate}>{new Date(item.date).toLocaleDateString()}</AppText>
              {!accountFilter && (
                <>
                  <AppText style={styles.dotSeparator}>•</AppText>
                  <AppText style={[styles.accountText, { color: colors.primary }]} numberOfLines={1}>{item.account}</AppText>
                </>
              )}
            </View>
          </View>
        </View>
        <AppText style={[styles.expenseAmount, { color: isCredit ? '#00C851' : '#ff4444' }]}>
          {isCredit ? '+' : '-'}{currency}{formatAmount(item.amount)}
        </AppText>
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <>
      {filteredTransactions.length > 0 && (
        <View style={styles.headerBar}>
          {!isSelectMode ? (
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setIsSelectMode(true)}
            >
              <Ionicons name="checkmark-circle-outline" size={22} color={colors.text} />
              <AppText style={{ marginLeft: 8, color: colors.text, fontWeight: '600' }}>Select</AppText>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
              <TouchableOpacity onPress={handleSelectAll} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons
                  name={selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0 ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={colors.primary}
                />
                <AppText style={{ marginLeft: 8, color: colors.primary, fontWeight: '600' }}>Select All</AppText>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => { setIsSelectMode(false); setSelectedIds([]); }} style={{ marginRight: 16 }}>
                  <AppText style={{ color: colors.textMuted, fontWeight: '500' }}>Cancel</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeleteSelected}
                  disabled={selectedIds.length === 0}
                  style={{ opacity: selectedIds.length === 0 ? 0.5 : 1 }}
                >
                  <AppText style={{ color: '#ff4444', fontWeight: '600' }}>Delete ({selectedIds.length})</AppText>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredTransactions}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.scrollContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <AppText style={styles.emptyStateText}>No transactions found.</AppText>
          </View>
        }
      />
      <AddTransactionModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        transactionToEdit={selectedTransaction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  filterButton: {
    flexDirection: 'row',
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#888',
    fontStyle: 'italic',
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseDesc: {
    fontSize: 16,
    fontWeight: '600',
  },
  expenseDate: {
    fontSize: 12,
    color: '#888',
  },
  dotSeparator: {
    fontSize: 12,
    color: '#888',
    marginHorizontal: 4,
  },
  accountText: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
