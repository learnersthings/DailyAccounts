import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, TouchableOpacity, Alert, TextInput, Platform, ActivityIndicator, Animated } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../components/AppText';
import { useTheme, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../context/ThemeContext';
import { useExpenseContext, Expense } from '../context/ExpenseContext';
import AddExpenseModal from '../components/AddExpenseModal';
import FilterModal from '../components/FilterModal';
import EmptyState from '../components/EmptyState';
import { formatAmount } from '../utils/format';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { generateDashboardPDFHTML } from '../utils/pdfGenerator';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

export type ListItem =
  | { type: 'header'; id: string; title: string; totalAmount?: number }
  | { type: 'expense'; id: string; expense: Expense };

interface ExpenseListProps {
  ListHeaderComponent?: React.ReactNode;
  hideTitle?: boolean;
  isExpensesScreen?: boolean;
}

export default function ExpenseList({ ListHeaderComponent, hideTitle, isExpensesScreen }: ExpenseListProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<any>();
  const { isDarkTheme } = useThemeContext();
  const { getCurrentMonthTotal, getPreviousMonthTotal, expenses, categories, paymentModes, currency, monthlyBudget, yearlyBudget, bulkDeleteExpenses, showMonthlyBudget, showYearlyBudget, downloadPathUri, reorderExpensesByDate } = useExpenseContext();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [displayCount, setDisplayCount] = useState(10);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const draggedItemDateRef = useRef<string | null>(null);
  const [flatDataState, setFlatDataState] = useState<ListItem[]>([]);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedPaymentModeIds, setSelectedPaymentModeIds] = useState<string[]>([]);

  // Compute available filter options dynamically from expenses
  const availableYears = useMemo(() => {
    const years = new Set(expenses.map(e => new Date(e.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [expenses]);

  const availableMonths = useMemo(() => {
    const months = new Set(expenses.map(e => new Date(e.date).getMonth()));
    return Array.from(months).sort((a, b) => a - b);
  }, [expenses]);

  const availableCategories = useMemo(() => {
    const usedIds = new Set(expenses.map(e => e.categoryId).filter(Boolean));
    return categories.filter(c => usedIds.has(c.id));
  }, [expenses, categories]);

  const availablePaymentModes = useMemo(() => {
    const usedIds = new Set(expenses.map(e => e.paymentModeId).filter(Boolean));
    return paymentModes.filter(p => usedIds.has(p.id));
  }, [expenses, paymentModes]);

  // Derived filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // Filter by Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const cat = categories.find(c => c.id === exp.categoryId);
        const pMode = paymentModes.find(m => m.id === exp.paymentModeId);

        const matchDesc = exp.description.toLowerCase().includes(query);
        const matchAmt = formatAmount(exp.amount).includes(query);
        const matchCat = cat && cat.name.toLowerCase().includes(query);
        const matchMode = pMode && pMode.name.toLowerCase().includes(query);
        const matchDate = new Date(exp.date).toLocaleDateString().toLowerCase().includes(query);

        if (!matchDesc && !matchAmt && !matchCat && !matchMode && !matchDate) {
          return false;
        }
      }

      // Filter by Year
      const expYear = new Date(exp.date).getFullYear();
      if (selectedYears.length > 0 && !selectedYears.includes(expYear)) {
        return false;
      }

      // Filter by Month
      const expMonth = new Date(exp.date).getMonth();
      if (selectedMonths.length > 0 && !selectedMonths.includes(expMonth)) {
        return false;
      }

      // Filter by Category
      if (selectedCategoryIds.length > 0 && (!exp.categoryId || !selectedCategoryIds.includes(exp.categoryId))) {
        return false;
      }

      // Filter by Payment Mode
      if (selectedPaymentModeIds.length > 0 && (!exp.paymentModeId || !selectedPaymentModeIds.includes(exp.paymentModeId))) {
        return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchQuery, selectedYears, selectedMonths, selectedCategoryIds, selectedPaymentModeIds, categories, paymentModes]);

  const total = getCurrentMonthTotal();
  const prevTotal = getPreviousMonthTotal();
  const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  const currentYear = new Date().getFullYear();
  const currentYearTotal = expenses
    .filter(exp => new Date(exp.date).getFullYear() === currentYear)
    .reduce((sum, exp) => sum + exp.amount, 0);

  // Calculate percentage diff
  let diffPercent = null;
  let diffColor = colors.text;
  let diffPrefix = '';

  if (prevTotal > 0) {
    const diff = ((prevTotal - total) / prevTotal) * 100;
    diffPercent = Math.abs(diff).toFixed(1);
    if (diff > 0) {
      // Saved money
      diffColor = '#00C851'; // Green
      diffPrefix = '+';
    } else if (diff < 0) {
      // Spent more
      diffColor = '#ff4444'; // Red
      diffPrefix = '-';
    } else {
      diffColor = '#888';
      diffPrefix = '';
    }
  }

  const handleOpenAddModal = () => {
    setSelectedExpense(null);
    setIsModalVisible(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsModalVisible(true);
  };

  const handleRowPress = (exp: Expense) => {
    if (isSelectMode) {
      if (selectedExpenseIds.includes(exp.id)) {
        setSelectedExpenseIds(selectedExpenseIds.filter(id => id !== exp.id));
      } else {
        setSelectedExpenseIds([...selectedExpenseIds, exp.id]);
      }
    } else {
      handleEditExpense(exp);
    }
  };

  const handleSelectAll = () => {
    const currentlyDisplayedIds = filteredExpenses.slice(0, displayCount).map(e => e.id);
    if (selectedExpenseIds.length === currentlyDisplayedIds.length && currentlyDisplayedIds.length > 0) {
      setSelectedExpenseIds([]);
    } else {
      setSelectedExpenseIds(currentlyDisplayedIds);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedExpenseIds.length === 0) return;
    Alert.alert(
      "Delete Expenses",
      `Are you sure you want to delete ${selectedExpenseIds.length} selected expenses?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await bulkDeleteExpenses(selectedExpenseIds);
            setIsSelectMode(false);
            setSelectedExpenseIds([]);
          }
        }
      ]
    );
  };

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const html = generateDashboardPDFHTML(filteredExpenses, categories, paymentModes, currency);
      const { uri, base64 } = await Print.printToFileAsync({ html, base64: true });

      if (downloadPathUri && Platform.OS === 'android') {
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(downloadPathUri, `Expense_Report_${new Date().getTime()}.pdf`, 'application/pdf');
        if (base64) {
          await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
          Alert.alert('Success', 'PDF saved automatically to your chosen download folder.');
        }
      } else {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate or save PDF report.' + error);
    } finally {
      setIsDownloading(false);
    }
  };

  const derivedFlatData = useMemo(() => {
    const visibleExpenses = filteredExpenses.slice(0, displayCount);
    const data: ListItem[] = [];
    let lastGroupTitle = '';

    const monthTotals: Record<string, number> = {};
    filteredExpenses.forEach(exp => {
      const monthYear = new Date(exp.date).toLocaleString('default', { month: 'long', year: 'numeric' });
      monthTotals[monthYear] = (monthTotals[monthYear] || 0) + exp.amount;
    });

    visibleExpenses.forEach(exp => {
      const monthYear = new Date(exp.date).toLocaleString('default', { month: 'long', year: 'numeric' });
      if (monthYear !== lastGroupTitle) {
        data.push({ type: 'header', id: `header-${monthYear}`, title: monthYear, totalAmount: monthTotals[monthYear] });
        lastGroupTitle = monthYear;
      }
      data.push({ type: 'expense', id: exp.id, expense: exp });
    });
    return data;
  }, [filteredExpenses, displayCount]);

  React.useEffect(() => {
    setFlatDataState(derivedFlatData);
  }, [derivedFlatData]);

  const handleDragEnd = async ({ data, from, to }: { data: ListItem[], from: number, to: number }) => {
    const draggedDate = draggedItemDateRef.current;
    if (!draggedDate) return;

    if (from !== to) {
      let crossedDifferentDate = false;
      const minIdx = Math.min(from, to);
      const maxIdx = Math.max(from, to);

      for (let i = minIdx; i <= maxIdx; i++) {
        if (i === to) continue;
        const item = data[i];
        if (item.type === 'header') {
          crossedDifferentDate = true;
          break;
        } else if (item.type === 'expense') {
          if (new Date(item.expense.date).toDateString() !== draggedDate) {
            crossedDifferentDate = true;
            break;
          }
        }
      }

      if (crossedDifferentDate) {
        // Temporarily accept the invalid data so the list internal state syncs up
        setFlatDataState(data);
        Alert.alert(
          "Invalid Move",
          "You can only reorder transactions within the same date.",
          [
            {
              text: "OK",
              onPress: () => {
                setFlatDataState([...derivedFlatData]); // Revert UI
                draggedItemDateRef.current = null;
              }
            }
          ]
        );
        return;
      }
    }

    setFlatDataState(data);
    const reorderedDayExpenses = data
      .filter(item => item.type === 'expense' && new Date((item as any).expense.date).toDateString() === draggedDate)
      .map(item => (item as any).expense as Expense);
    await reorderExpensesByDate(draggedDate, reorderedDayExpenses);
    draggedItemDateRef.current = null;
  };

  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<ListItem>) => {
    if (item.type === 'header') {
      return (
        <View style={styles.monthHeaderContainer}>
          <AppText style={[styles.monthHeader, { color: colors.text }]}>{item.title}</AppText>
          {item.totalAmount !== undefined && (
            <AppText style={[styles.monthHeaderTotal, { color: '#ff4444' }]}>
              {currency}{formatAmount(item.totalAmount)}
            </AppText>
          )}
        </View>
      );
    }

    const exp = item.expense;
    const category = categories.find(c => c.id === exp.categoryId);
    const paymentMode = paymentModes.find(m => m.id === exp.paymentModeId);

    const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
      const trans = dragX.interpolate({
        inputRange: [-80, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      });
      return (
        <TouchableOpacity
          style={[styles.swipeAction, { backgroundColor: '#ff4444', marginLeft: 10 }]}
          onPress={() => {
            Alert.alert(
              "Delete Expense",
              "Are you sure you want to delete this expense?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => bulkDeleteExpenses([exp.id])
                }
              ]
            );
          }}
        >
          <Animated.View style={{ transform: [{ scale: trans }] }}>
            <Ionicons name="trash" size={24} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      );
    };

    const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
      const trans = dragX.interpolate({
        inputRange: [0, 80],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });
      return (
        <TouchableOpacity
          style={[styles.swipeAction, { backgroundColor: colors.primary, marginRight: 10 }]}
          onPress={() => handleEditExpense(exp)}
        >
          <Animated.View style={{ transform: [{ scale: trans }] }}>
            <Ionicons name="pencil" size={24} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      );
    };

    return (
      <ScaleDecorator>
        <Swipeable
          renderRightActions={isSelectMode ? undefined : renderRightActions}
          renderLeftActions={isSelectMode ? undefined : renderLeftActions}
          enabled={!isSelectMode}
        >
          <TouchableOpacity
            style={[styles.expenseRow, { backgroundColor: isActive ? colors.surface : colors.card, elevation: isActive ? 10 : 0 }]}
            onPress={() => handleRowPress(exp)}
            onLongPress={() => {
              if (isSelectMode) return;
              draggedItemDateRef.current = new Date(exp.date).toDateString();
              drag();
            }}
            disabled={isActive}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {isSelectMode && (
                <View style={[styles.checkbox, { borderColor: colors.primary, backgroundColor: selectedExpenseIds.includes(exp.id) ? colors.primary : 'transparent' }]}>
                  {selectedExpenseIds.includes(exp.id) && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
              )}
              {category ? (
                <View style={[styles.expenseIcon, { backgroundColor: category.color }]}>
                  <Ionicons name={category.icon as any} size={20} color="#fff" />
                </View>
              ) : (
                <View style={[styles.expenseIcon, { backgroundColor: isDarkTheme ? '#333' : '#eee' }]}>
                  <Ionicons name="cash-outline" size={20} color={colors.text} />
                </View>
              )}
              <View style={{ flex: 1, paddingRight: 10 }}>
                <AppText style={[styles.expenseDesc, { color: colors.text }]} numberOfLines={1}>{exp.description}</AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <AppText style={styles.expenseDate}>{new Date(exp.date).toLocaleDateString()}</AppText>
                  {paymentMode && (
                    <>
                      <AppText style={styles.dotSeparator}>•</AppText>
                      <Ionicons name={paymentMode.icon as any} size={12} color={paymentMode.color} style={{ marginRight: 4 }} />
                      <AppText style={[styles.paymentModeText, { color: paymentMode.color }]} numberOfLines={1}>{paymentMode.name}</AppText>
                    </>
                  )}
                </View>
              </View>
            </View>
            <AppText style={[styles.expenseAmount, { color: '#ff4444' }]}>-{currency}{formatAmount(exp.amount)}</AppText>
          </TouchableOpacity>
        </Swipeable>
      </ScaleDecorator>
    );
  }, [categories, paymentModes, colors, isDarkTheme, isSelectMode, selectedExpenseIds, currency, bulkDeleteExpenses]);

  const listHeader = (
    <>
      {ListHeaderComponent}

      {!isExpensesScreen && (
        <View style={styles.sectionHeader}>
          {!hideTitle && <AppText style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</AppText>}
          {expenses.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Expenses')}>
              <AppText style={{ color: colors.primary, fontWeight: '600' }}>See All</AppText>
            </TouchableOpacity>
          )}
        </View>
      )}

      {expenses.length > 0 && (
        <View style={styles.searchFilterContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search..."
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
          {isExpensesScreen && (
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
                  color={(selectedYears.length > 0 || selectedMonths.length > 0 || selectedCategoryIds.length > 0 || selectedPaymentModeIds.length > 0) ? colors.primary : colors.text}
                />
                {(selectedYears.length > 0 || selectedMonths.length > 0 || selectedCategoryIds.length > 0 || selectedPaymentModeIds.length > 0) && (
                  <View style={[styles.filterBadge, { backgroundColor: colors.primary }]} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, { backgroundColor: colors.surface, borderColor: colors.border, marginLeft: 10 }]}
                onPress={() => {
                  if (isSelectMode) {
                    setIsSelectMode(false);
                    setSelectedExpenseIds([]);
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
          )}
        </View>
      )}

      {/* ACTION BAR FOR SELECTION */}
      {isSelectMode && expenses.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 4 }}>
          {/* Left Side: Select All */}
          <TouchableOpacity onPress={handleSelectAll} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons
              name={selectedExpenseIds.length === filteredExpenses.slice(0, displayCount).length && filteredExpenses.length > 0 ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={colors.primary}
            />
            <AppText style={{ marginLeft: 8, color: colors.primary, fontWeight: '600' }}>Select All</AppText>
          </TouchableOpacity>

          {/* Right Side: Actions */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => { setIsSelectMode(false); setSelectedExpenseIds([]); }} style={{ marginRight: 16 }}>
              <AppText style={{ color: colors.textMuted, fontWeight: '500' }}>Cancel</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeleteSelected}
              disabled={selectedExpenseIds.length === 0}
              style={{ opacity: selectedExpenseIds.length === 0 ? 0.5 : 1 }}
            >
              <AppText style={{ color: '#ff4444', fontWeight: '600' }}>Delete ({selectedExpenseIds.length})</AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );

  const listFooter = (
    <>
      {filteredExpenses.length > displayCount && (
        <TouchableOpacity
          style={[styles.loadMoreButton, { backgroundColor: isDarkTheme ? '#2a2a2a' : '#f0f0f0' }]}
          onPress={() => setDisplayCount(prev => prev + 20)}
        >
          <AppText style={[styles.loadMoreText, { color: colors.primary }]}>Load More</AppText>
          <Ionicons name="chevron-down" size={16} color={colors.primary} />
        </TouchableOpacity>
      )}
    </>
  );

  const listEmpty = (
    <EmptyState
      icon={expenses.length === 0 ? "wallet-outline" : "search-outline"}
      title={expenses.length === 0 ? "No Expenses Yet" : "No Results"}
      message={expenses.length === 0 ? "Start tracking your spending by adding your first expense." : "We couldn't find any expenses matching your search or filters."}
      actionLabel={expenses.length === 0 ? "Add Expense" : undefined}
      onAction={expenses.length === 0 ? handleOpenAddModal : undefined}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DraggableFlatList
        data={flatDataState}
        onDragEnd={handleDragEnd}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={styles.scrollContent}
        activationDistance={20}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={handleOpenAddModal}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <AddExpenseModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        expenseToEdit={selectedExpense}
      />

      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        availableYears={availableYears}
        availableMonths={availableMonths}
        availableCategories={availableCategories}
        availablePaymentModes={availablePaymentModes}
        selectedYears={selectedYears}
        setSelectedYears={setSelectedYears}
        selectedMonths={selectedMonths}
        setSelectedMonths={setSelectedMonths}
        selectedCategoryIds={selectedCategoryIds}
        setSelectedCategoryIds={setSelectedCategoryIds}
        selectedPaymentModeIds={selectedPaymentModeIds}
        setSelectedPaymentModeIds={setSelectedPaymentModeIds}
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
    paddingBottom: 100, // padding for FAB
  },
  card: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 30,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  diffText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 15,
  },
  summaryItem: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: '70%',
    alignSelf: 'center',
    marginHorizontal: 15,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 6,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  budgetSubtext: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  progressSection: {
    width: '100%',
    marginTop: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressPercent: {
    fontSize: 12,
    color: '#888',
    fontWeight: 'bold',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
  monthHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
    marginRight: 4,
  },
  monthHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    opacity: 0.8,
  },
  monthHeaderTotal: {
    fontSize: 15,
    fontWeight: 'bold',
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
  paymentModeText: {
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
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginBottom: 12,
  },
});

