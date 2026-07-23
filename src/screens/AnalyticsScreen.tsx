import React, { useState, useMemo } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import AppText from '../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { PieChart as GiftedPieChart } from 'react-native-gifted-charts';
import { Svg, G, Path, Defs, Mask, Rect, Circle, Text as SvgText } from 'react-native-svg';
import { useThemeContext } from '../context/ThemeContext';
import { useExpenseContext } from '../context/ExpenseContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import FilterModal from '../components/FilterModal';
import { formatAmount } from '../utils/format';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { generateAnalyticsPDFHTML } from '../utils/pdfGenerator';
import { parseISOYear, parseISOMonth } from '../utils/dateUtils';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
let Notifications: any = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (e) { }
}

const screenWidth = Dimensions.get('window').width;

const darkenColor = (color: string, amount: number) => {
  let hex = color.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return color;
  let r = parseInt(hex.substring(0, 2), 16) - amount;
  let g = parseInt(hex.substring(2, 4), 16) - amount;
  let b = parseInt(hex.substring(4, 6), 16) - amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

type TimeFilter = 'This Month' | 'Last Month' | 'This Year' | 'All Time' | 'Custom';

export default function AnalyticsScreen() {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();
  const {
    expenses, categories, paymentModes, currency,
    analyticsChartType, chartStyle, downloadPathUri
  } = useExpenseContext();
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('This Month');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedPaymentModeIds, setSelectedPaymentModeIds] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Compute available filter options dynamically from expenses
  const availableYears = useMemo(() => {
    const years = new Set(expenses.map(e => parseISOYear(e.date)));
    return Array.from(years).sort((a, b) => b - a);
  }, [expenses]);

  const availableMonths = useMemo(() => {
    const months = new Set(expenses.map(e => parseISOMonth(e.date)));
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

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return expenses.filter(exp => {
      const expYear = parseISOYear(exp.date);
      const expMonth = parseISOMonth(exp.date);

      if (activeFilter === 'This Month') {
        if (!(expMonth === currentMonth && expYear === currentYear)) return false;
      } else if (activeFilter === 'Last Month') {
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        if (!(expMonth === lastMonthDate.getMonth() && expYear === lastMonthDate.getFullYear())) return false;
      } else if (activeFilter === 'This Year') {
        if (expYear !== currentYear) return false;
      } else if (activeFilter === 'Custom') {
        // Filter by Year
        if (selectedYears.length > 0 && !selectedYears.includes(expYear)) return false;
        // Filter by Month
        if (selectedMonths.length > 0 && !selectedMonths.includes(expMonth)) return false;
        // Filter by Category
        if (selectedCategoryIds.length > 0 && (!exp.categoryId || !selectedCategoryIds.includes(exp.categoryId))) return false;
        // Filter by Payment Mode
        if (selectedPaymentModeIds.length > 0 && (!exp.paymentModeId || !selectedPaymentModeIds.includes(exp.paymentModeId))) return false;
      }
      return true;
    });
  }, [expenses, activeFilter, selectedYears, selectedMonths, selectedCategoryIds, selectedPaymentModeIds]);

  const totalSpent = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);



  // Data for Pie Chart (Categories)
  const { pieChartData, fullCategoryData } = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    let categoryTotalSum = 0;
    filteredExpenses.forEach(exp => {
      const catId = exp.categoryId || 'uncategorized';
      categoryTotals[catId] = (categoryTotals[catId] || 0) + exp.amount;
      categoryTotalSum += exp.amount;
    });

    const allData = Object.keys(categoryTotals).map(catId => {
      const cat = categories.find(c => c.id === catId);
      const percentage = categoryTotalSum > 0 ? ((categoryTotals[catId] / categoryTotalSum) * 100).toFixed(2) + '%' : '0.00%';
      return {
        value: categoryTotals[catId],
        color: cat ? cat.color : '#888',
        text: percentage,
        name: cat ? cat.name : '',
        amount: categoryTotals[catId]
      };
    }).sort((a, b) => b.value - a.value);



    return { pieChartData: allData, fullCategoryData: allData };
  }, [filteredExpenses, categories]);

  // Data for Payment Modes
  const paymentModeData = useMemo(() => {
    const modeTotals: Record<string, number> = {};
    let modeTotalSum = 0;
    filteredExpenses.forEach(exp => {
      const modeId = exp.paymentModeId || 'unknown';
      modeTotals[modeId] = (modeTotals[modeId] || 0) + exp.amount;
      modeTotalSum += exp.amount;
    });

    return Object.keys(modeTotals).map(modeId => {
      const mode = paymentModes.find(m => m.id === modeId);
      const percentage = modeTotalSum > 0 ? ((modeTotals[modeId] / modeTotalSum) * 100).toFixed(2) + '%' : '0.00%';
      return {
        value: modeTotals[modeId],
        name: mode ? mode.name : '',
        amount: modeTotals[modeId],
        color: mode ? mode.color : '#888',
        text: percentage
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, paymentModes]);

  // Insights
  const highestExpense = useMemo(() => {
    if (filteredExpenses.length === 0) return null;
    return filteredExpenses.reduce((prev, current) => (prev.amount > current.amount) ? prev : current);
  }, [filteredExpenses]);

  const mostUsedCategory = fullCategoryData.length > 0 ? fullCategoryData[0] : null;

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const filterName = activeFilter === 'Custom' ? 'Custom Filter' : activeFilter;
      const html = generateAnalyticsPDFHTML(filterName, totalSpent, fullCategoryData, paymentModeData, currency, analyticsChartType, chartStyle);
      const { uri, base64 } = await Print.printToFileAsync({ html, base64: true });

      if (downloadPathUri && Platform.OS === 'android') {
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(downloadPathUri, `Analytics_Report_${new Date().getTime()}.pdf`, 'application/pdf');
        if (base64) {
          await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
          if (Notifications) {
            await Notifications.scheduleNotificationAsync({
              content: { title: "Download Complete", body: "Analytics report saved to your chosen downloads folder." },
              trigger: null,
            });
          }
          Alert.alert('Success', 'PDF saved automatically to your chosen download folder.');
        }
      } else {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (error) {
      if (Notifications) {
        await Notifications.scheduleNotificationAsync({
          content: { title: "Download Failed", body: `Failed to generate analytics report.` },
          trigger: null,
        });
      }
      Alert.alert('Error', 'Failed to generate or save PDF report.' + error);
    } finally {
      setIsDownloading(false);
    }
  };

  const renderChart = (data: any[]) => {
    const isDonut = analyticsChartType === 'Donut';
    const baseProps = {
      radius: 150,
      innerRadius: isDonut ? (chartStyle === '3D' ? 60 : 70) : 0,
      innerCircleColor: chartStyle === '3D' ? 'transparent' : colors.card,
      donut: isDonut,
      showText: false,
      semiCircle: chartStyle === 'Semi-Circle',
      strokeWidth: chartStyle === 'Spaced' ? 4 : 0,
      strokeColor: colors.card,
    };

    if (chartStyle === '3D') {
      const layers = 15;

      const total = data.reduce((sum, slice) => sum + slice.value, 0);
      let cumulativePercent = 0;
      const paths: { d: string, color: string }[] = [];

      data.forEach(slice => {
        const percent = total > 0 ? slice.value / total : 0;
        if (percent === 0) return;

        if (percent === 1) {
          paths.push({ d: `M 0 0 m -150, 0 a 150,150 0 1,0 300,0 a 150,150 0 1,0 -300,0`, color: slice.color });
          return;
        }

        const startX = 150 * Math.cos(2 * Math.PI * cumulativePercent);
        const startY = 150 * Math.sin(2 * Math.PI * cumulativePercent);
        cumulativePercent += percent;
        const endX = 150 * Math.cos(2 * Math.PI * cumulativePercent);
        const endY = 150 * Math.sin(2 * Math.PI * cumulativePercent);

        const largeArcFlag = percent > 0.5 ? 1 : 0;
        paths.push({ d: `M 0 0 L ${startX} ${startY} A 150 150 0 ${largeArcFlag} 1 ${endX} ${endY} Z`, color: slice.color });
      });

      return (
        <View style={{ alignItems: 'center', marginVertical: 0, height: 160, justifyContent: 'center', overflow: 'visible', marginTop: 20 }}>
          <View style={{ transform: [{ scaleY: 0.5 }] }}>
            <Svg width={300} height={400} viewBox="-150 -150 300 400">
              <Defs>
                <Mask id="donut-mask">
                  <Rect x="-150" y="-150" width="300" height="400" fill="white" />
                  <Circle cx="0" cy="0" r="75" fill="black" />
                </Mask>
              </Defs>

              {Array.from({ length: layers }).map((_, i) => {
                const shiftY = i * 4;
                const isTop = i === 0;
                return (
                  <G key={i} y={shiftY}>
                    <G rotation="-90" mask={isDonut ? "url(#donut-mask)" : undefined}>
                      {paths.map((p, j) => (
                        <Path key={j} d={p.d} fill={isTop ? p.color : darkenColor(p.color, 40)} />
                      ))}
                    </G>
                  </G>
                );
              }).reverse()}
            </Svg>
          </View>
        </View>
      );
    }

    return (
      <View style={{ alignItems: 'center', marginVertical: chartStyle === 'Semi-Circle' ? 10 : 30 }}>
        <GiftedPieChart
          {...baseProps}
          data={data}
          isThreeD={false}
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {(['This Month', 'Last Month', 'This Year', 'All Time'] as TimeFilter[]).map(filter => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterPill,
                {
                  backgroundColor: activeFilter === filter ? colors.primary : (colors.border),
                  marginRight: 10
                }
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <AppText style={{ color: activeFilter === filter ? '#fff' : colors.text, fontWeight: '600' }}>{filter}</AppText>
            </TouchableOpacity>
          ))}

          {/* Custom Filter Button */}
          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor: activeFilter === 'Custom' ? colors.primary : (colors.border),
                marginRight: 20,
                flexDirection: 'row',
                alignItems: 'center'
              }
            ]}
            onPress={() => {
              setActiveFilter('Custom');
              setIsFilterModalVisible(true);
            }}
          >
            <AppText style={{ color: activeFilter === 'Custom' ? '#fff' : colors.text, fontWeight: '600', marginRight: 4 }}>Custom</AppText>
            <Ionicons name="filter" size={16} color={activeFilter === 'Custom' ? '#fff' : colors.text} />
          </TouchableOpacity>
        </ScrollView>

        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText style={styles.cardLabel}>Total Spent ({activeFilter === 'Custom' ? 'Filtered' : activeFilter})</AppText>
            <TouchableOpacity onPress={handleDownloadPDF} style={{ padding: 4 }} disabled={isDownloading}>
              {isDownloading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="download-outline" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
          <AppText style={[styles.totalSpent, { color: colors.text }]}>{currency}{formatAmount(totalSpent)}</AppText>
        </View>

        {filteredExpenses.length === 0 ? (
          <View style={styles.emptyState}>
            <AppText style={styles.emptyText}>No data for this period.</AppText>
          </View>
        ) : (
          <>


            {/* Category Breakdown */}
            <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow, overflow: 'visible' }]}>
              <AppText style={[styles.cardTitle, { color: colors.text }]}>Category Breakdown</AppText>

              {renderChart(pieChartData)}

              <View style={{ marginTop: 20 }}>
                {fullCategoryData.map((cat, index) => (
                  <View key={index} style={styles.paymentModeRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
                      <AppText style={{ color: colors.text, fontSize: 12 }}>{cat.name} ({cat.text})</AppText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <AppText style={{ color: colors.text, fontWeight: 'bold', fontSize: 12 }}>{currency}{formatAmount(cat.amount)}</AppText>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Payment Modes */}
            <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow, marginBottom: 40 }]}>
              <AppText style={[styles.cardTitle, { color: colors.text }]}>Payment Modes</AppText>

              {renderChart(paymentModeData)}

              <View style={{ marginTop: 20 }}>
                {paymentModeData.map((mode, index) => (
                  <View key={index} style={styles.paymentModeRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.colorDot, { backgroundColor: mode.color }]} />
                      <AppText style={{ color: colors.text, fontSize: 12 }}>{mode.name} ({mode.text})</AppText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <AppText style={{ color: colors.text, fontWeight: 'bold', fontSize: 12 }}>{currency}{formatAmount(mode.amount)}</AppText>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

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
        onClearAll={() => setActiveFilter('This Month')}
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
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  cardLabel: {
    fontSize: 14,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  totalSpent: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    fontStyle: 'italic',
  },
  highlightsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  highlightCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 5,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  highlightLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  highlightValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  highlightSub: {
    fontSize: 12,
    color: '#888',
  },
  paymentModeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
});

