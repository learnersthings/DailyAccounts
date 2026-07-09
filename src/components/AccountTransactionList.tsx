import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, TouchableOpacity, Alert, TextInput, ActivityIndicator, Platform } from 'react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import AppText from '../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../context/ThemeContext';
import { useTransactionContext, AccountTransaction } from '../context/TransactionContext';
import { useExpenseContext } from '../context/ExpenseContext';
import { formatAmount } from '../utils/format';
import AddTransactionModal from './AddTransactionModal';
import AccountFilterModal from './AccountFilterModal';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { generateAccountTransactionsPDFHTML } from '../utils/pdfGenerator';

interface TransactionListItemProps {
  tx: AccountTransaction;
  drag: () => void;
  isActive: boolean;
  isSelected: boolean;
  isSelectMode: boolean;
  colors: any;
  currency: string;
  accountFilter?: string;
  handleRowPress: (tx: AccountTransaction) => void;
  draggedItemDateRef: React.MutableRefObject<string | null>;
}

const TransactionListItem = React.memo(({
  tx,
  drag,
  isActive,
  isSelected,
  isSelectMode,
  colors,
  currency,
  accountFilter,
  handleRowPress,
  draggedItemDateRef,
}: TransactionListItemProps) => {
  const isCredit = tx.type === 'Credit';
  return (
    <ScaleDecorator>
      <TouchableOpacity
        style={[styles.expenseRow, { backgroundColor: isSelected ? colors.surface : colors.card, elevation: isSelected ? 4 : (isActive ? 8 : 0) }]}
        onPress={() => handleRowPress(tx)}
        onLongPress={() => {
          draggedItemDateRef.current = new Date(tx.date).toDateString();
          drag();
        }}
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
            <AppText style={[styles.expenseDesc, { color: colors.text }]} numberOfLines={1}>{tx.description}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <AppText style={styles.expenseDate}>{new Date(tx.date).toLocaleDateString()}</AppText>
              {!accountFilter && (
                <>
                  <AppText style={styles.dotSeparator}>•</AppText>
                  <AppText style={[styles.accountText, { color: colors.primary }]} numberOfLines={1}>{tx.account}</AppText>
                </>
              )}
            </View>
          </View>
        </View>
        <AppText style={[styles.expenseAmount, { color: isCredit ? '#00C851' : '#ff4444' }]}>
          {isCredit ? '+' : '-'}{currency}{formatAmount(tx.amount)}
        </AppText>
      </TouchableOpacity>
    </ScaleDecorator>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.tx === nextProps.tx &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isSelectMode === nextProps.isSelectMode &&
    prevProps.currency === nextProps.currency &&
    prevProps.accountFilter === nextProps.accountFilter
  );
});

interface AccountTransactionListProps {
  accountFilter?: string;
}

export default function AccountTransactionList({ accountFilter }: AccountTransactionListProps) {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();
  const { transactions, deleteTransaction, bulkDeleteTransactions, reorderTransactionsByDate } = useTransactionContext();
  const { currency, downloadPathUri } = useExpenseContext();
  
  const [selectedTransaction, setSelectedTransaction] = useState<AccountTransaction | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [displayCount, setDisplayCount] = useState(50);

  const [flatDataState, setFlatDataState] = useState<AccountTransaction[]>([]);
  const draggedItemDateRef = React.useRef<string | null>(null);

  // Compute available filter options
  const baseTransactions = useMemo(() => {
    if (!accountFilter) return transactions;
    return transactions.filter(t => t.account === accountFilter);
  }, [transactions, accountFilter]);

  const availableYears = useMemo(() => {
    const years = new Set(baseTransactions.map(e => new Date(e.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [baseTransactions]);

  const availableMonths = useMemo(() => {
    const months = new Set(baseTransactions.map(e => new Date(e.date).getMonth()));
    return Array.from(months).sort((a, b) => a - b);
  }, [baseTransactions]);

  const filteredTransactions = useMemo(() => {
    return baseTransactions.filter(tx => {
      // Filter by Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchDesc = tx.description.toLowerCase().includes(query);
        const matchAmt = formatAmount(tx.amount).includes(query);
        const matchDate = new Date(tx.date).toLocaleDateString().toLowerCase().includes(query);

        if (!matchDesc && !matchAmt && !matchDate) {
          return false;
        }
      }

      // Filter by Year
      const txYear = new Date(tx.date).getFullYear();
      if (selectedYears.length > 0 && !selectedYears.includes(txYear)) {
        return false;
      }

      // Filter by Month
      const txMonth = new Date(tx.date).getMonth();
      if (selectedMonths.length > 0 && !selectedMonths.includes(txMonth)) {
        return false;
      }

      // Filter by Type
      if (selectedTypes.length > 0 && !selectedTypes.includes(tx.type)) {
        return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [baseTransactions, searchQuery, selectedYears, selectedMonths, selectedTypes]);

  React.useEffect(() => {
    setFlatDataState(filteredTransactions.slice(0, displayCount));
  }, [filteredTransactions, displayCount]);

  const handleDragEnd = async ({ data, from, to }: { data: AccountTransaction[], from: number, to: number }) => {
    const draggedDate = draggedItemDateRef.current;
    if (!draggedDate) return;
    
    if (from !== to) {
      let crossedDifferentDate = false;
      const minIdx = Math.min(from, to);
      const maxIdx = Math.max(from, to);
      
      for (let i = minIdx; i <= maxIdx; i++) {
        if (i === to) continue;
        const item = data[i];
        if (new Date(item.date).toDateString() !== draggedDate) {
          crossedDifferentDate = true;
          break;
        }
      }

      if (crossedDifferentDate) {
        setFlatDataState(data);
        Alert.alert(
          "Invalid Move", 
          "You can only reorder transactions within the same date.",
          [
            {
              text: "OK",
              onPress: () => {
                setFlatDataState([...filteredTransactions]);
                draggedItemDateRef.current = null;
              }
            }
          ]
        );
        return;
      }
    }

    setFlatDataState(data);
    const reorderedDayTransactions = data.filter(item => new Date(item.date).toDateString() === draggedDate);
    await reorderTransactionsByDate(draggedDate, reorderedDayTransactions);
    draggedItemDateRef.current = null;
  };

  const isSelectModeRef = useRef(isSelectMode);
  useEffect(() => { isSelectModeRef.current = isSelectMode; }, [isSelectMode]);

  const handleRowPress = useCallback((tx: AccountTransaction) => {
    if (isSelectModeRef.current) {
      setSelectedIds(prev => prev.includes(tx.id) ? prev.filter(id => id !== tx.id) : [...prev, tx.id]);
    } else {
      setSelectedTransaction(tx);
      setIsModalVisible(true);
    }
  }, []);

  const handleSelectAll = () => {
    const currentlyDisplayedIds = flatDataState.map(t => t.id);
    if (selectedIds.length === currentlyDisplayedIds.length && currentlyDisplayedIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentlyDisplayedIds);
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

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const html = generateAccountTransactionsPDFHTML(filteredTransactions, currency, accountFilter);
      const { uri, base64 } = await Print.printToFileAsync({ html, base64: true });

      if (downloadPathUri && Platform.OS === 'android') {
        const prefix = accountFilter ? accountFilter.replace(/\s+/g, '_') : 'All';
        const fileName = `${prefix}_Transactions_${new Date().getTime()}.pdf`;
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(downloadPathUri, fileName, 'application/pdf');
        if (base64) {
          await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
          Alert.alert('Success', 'PDF saved automatically to your chosen download folder.');
        }
      } else {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate or save PDF report.');
    } finally {
      setIsDownloading(false);
    }
  };

  const renderItem = useCallback(({ item: tx, drag, isActive }: RenderItemParams<AccountTransaction>) => {
    return (
      <TransactionListItem
        tx={tx}
        drag={drag}
        isActive={isActive}
        isSelected={selectedIds.includes(tx.id)}
        isSelectMode={isSelectMode}
        colors={colors}
        currency={currency}
        accountFilter={accountFilter}
        handleRowPress={handleRowPress}
        draggedItemDateRef={draggedItemDateRef}
      />
    );
  }, [selectedIds, isSelectMode, colors, currency, accountFilter, handleRowPress]);

  const listHeader = (
    <View style={{ marginBottom: 16 }}>
      {filteredTransactions.length > 0 && (
        <View style={styles.searchFilterContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search transactions..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <>
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.surface, borderColor: colors.border, marginRight: 10 }]}
              onPress={handleDownloadPDF}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Ionicons name="download-outline" size={22} color={colors.text} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setIsFilterModalVisible(true)}
            >
              <Ionicons
                name="options-outline"
                size={22}
                color={(selectedYears.length > 0 || selectedMonths.length > 0 || selectedTypes.length > 0) ? colors.primary : colors.text}
              />
              {(selectedYears.length > 0 || selectedMonths.length > 0 || selectedTypes.length > 0) && (
                <View style={[styles.filterBadge, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.surface, borderColor: colors.border, marginLeft: 10 }]}
              onPress={() => {
                if (isSelectMode) {
                  setIsSelectMode(false);
                  setSelectedIds([]);
                } else {
                  setIsSelectMode(true);
                }
              }}
            >
              <Ionicons
                name={isSelectMode ? "checkmark-circle" : "checkmark-circle-outline"}
                size={22}
                color={isSelectMode ? colors.primary : colors.text}
              />
            </TouchableOpacity>
          </>
        </View>
      )}

      {/* ACTION BAR FOR SELECTION */}
      {isSelectMode && flatDataState.length > 0 && (
        <View style={styles.bulkActions}>
          <TouchableOpacity onPress={handleSelectAll} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons
              name={selectedIds.length === flatDataState.length && flatDataState.length > 0 ? "checkmark-circle" : "ellipse-outline"}
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
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DraggableFlatList
        data={flatDataState}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.scrollContent}
        activationDistance={20}
        initialNumToRender={15}
        maxToRenderPerBatch={15}
        windowSize={5}
        updateCellsBatchingPeriod={30}
        removeClippedSubviews={Platform.OS === 'android'}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <AppText style={styles.emptyStateText}>No transactions found.</AppText>
          </View>
        }
        ListFooterComponent={
          filteredTransactions.length > displayCount ? (
            <TouchableOpacity
              style={[styles.loadMoreButton, { backgroundColor: isDarkTheme ? '#2a2a2a' : '#f0f0f0' }]}
              onPress={() => setDisplayCount(prev => prev + 50)}
            >
              <AppText style={[styles.loadMoreText, { color: colors.primary }]}>Load More</AppText>
              <Ionicons name="chevron-down" size={16} color={colors.primary} />
            </TouchableOpacity>
          ) : null
        }
      />
      <AddTransactionModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        transactionToEdit={selectedTransaction}
      />
      <AccountFilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        availableYears={availableYears}
        availableMonths={availableMonths}
        selectedYears={selectedYears}
        setSelectedYears={setSelectedYears}
        selectedMonths={selectedMonths}
        setSelectedMonths={setSelectedMonths}
        selectedTypes={selectedTypes}
        setSelectedTypes={setSelectedTypes}
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
  searchFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bulkActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
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
  loadMoreButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 4,
  },
});
