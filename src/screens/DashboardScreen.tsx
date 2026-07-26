import React, { useState, useMemo } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import AppText from '../components/AppText';
import { useThemeContext } from '../context/ThemeContext';
import { useExpenseContext } from '../context/ExpenseContext';
import { formatAmount } from '../utils/format';
import Svg, { Circle } from 'react-native-svg';
import PremiumCardBackground from '../components/PremiumCardBackground';
import { parseISOYear, parseISOMonth } from '../utils/dateUtils';
import SingleFilterModal from '../components/SingleFilterModal';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();
  const { expenses, currency, monthlyBudget, yearlyBudget, showMonthlyBudget, showYearlyBudget, showYearCard } = useExpenseContext();

  const currentMonthIndex = new Date().getMonth();
  const currentYearVal = new Date().getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIndex);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearVal);

  const [selectedYearOnly, setSelectedYearOnly] = useState<number>(currentYearVal);

  const [isMonthFilterVisible, setIsMonthFilterVisible] = useState(false);
  const [isYearFilterVisible, setIsYearFilterVisible] = useState(false);

  const availableYears = useMemo(() => {
    const years = new Set(expenses.map(e => parseISOYear(e.date)));
    if (!years.has(currentYearVal)) years.add(currentYearVal);
    return Array.from(years).sort((a, b) => b - a);
  }, [expenses, currentYearVal]);

  const availableMonths = useMemo(() => {
    const months = new Set(expenses.map(e => parseISOMonth(e.date)));
    if (!months.has(currentMonthIndex)) months.add(currentMonthIndex);
    return Array.from(months).sort((a, b) => a - b);
  }, [expenses, currentMonthIndex]);

  const total = useMemo(() => {
    return expenses
      .filter((expense) => {
        return parseISOMonth(expense.date) === selectedMonth && parseISOYear(expense.date) === selectedYear;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses, selectedMonth, selectedYear]);

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonthName = `${MONTHS[selectedMonth]} ${selectedYear}`;

  const daysToConsiderMonthly = useMemo(() => {
    const now = new Date();
    if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth()) {
      return Math.max(now.getDate() - 1, 1);
    } else {
      return new Date(selectedYear, selectedMonth + 1, 0).getDate();
    }
  }, [selectedYear, selectedMonth]);

  const monthlyDailyAverage = total / daysToConsiderMonthly;

  const currentYearTotal = useMemo(() => {
    return expenses
      .filter(exp => parseISOYear(exp.date) === selectedYearOnly)
      .reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses, selectedYearOnly]);

  const monthsToConsider = useMemo(() => {
    const now = new Date();
    if (selectedYearOnly === now.getFullYear()) {
      return Math.max(now.getMonth(), 1);
    } else if (selectedYearOnly < now.getFullYear()) {
      return 12;
    }
    return 1;
  }, [selectedYearOnly]);

  const yearlyMonthlyAverage = currentYearTotal / monthsToConsider;

  const monthlyTimeProgress = useMemo(() => {
    const now = new Date();
    const totalDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    if (selectedYear < now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth < now.getMonth())) {
      return 1;
    }
    if (selectedYear > now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth > now.getMonth())) {
      return 0;
    }
    return Math.max(0, now.getDate() - 1) / totalDays;
  }, [selectedYear, selectedMonth]);

  const yearlyTimeProgress = useMemo(() => {
    const now = new Date();
    if (selectedYearOnly < now.getFullYear()) return 1;
    if (selectedYearOnly > now.getFullYear()) return 0;

    return now.getMonth() / 12;
  }, [selectedYearOnly]);

  const renderCards = () => (
    <View>
      {/* Monthly Spending Card */}
      <PremiumCardBackground color={colors.primary}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <TouchableOpacity onPress={() => setIsMonthFilterVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <AppText style={{ fontSize: 14, color: '#FFF', opacity: 0.9, fontWeight: '600', textTransform: 'uppercase' }} numberOfLines={1} adjustsFontSizeToFit>{currentMonthName} Spending</AppText>
              <Ionicons name="chevron-down" size={14} color="#FFF" style={{ marginLeft: 4, opacity: 0.9 }} />
            </TouchableOpacity>
            <AppText style={{ fontSize: 32, fontWeight: 'bold', color: monthlyBudget > 0 ? (total > monthlyBudget ? '#ff4444' : (total >= monthlyBudget * 0.8 ? '#ffcccc' : '#FFF')) : '#FFF', marginBottom: monthlyBudget > 0 && showMonthlyBudget ? 12 : 0 }} numberOfLines={1} adjustsFontSizeToFit>
              {currency}{formatAmount(total)}
            </AppText>
            {monthlyBudget > 0 && showMonthlyBudget && (
              <View style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <AppText style={{ fontSize: 10, color: '#FFF', opacity: 0.8, textTransform: 'uppercase', fontWeight: '600' }}>Time Elapsed</AppText>
                  <AppText style={{ fontSize: 10, color: '#FFF', opacity: 0.8, fontWeight: '600' }}>{Math.round(monthlyTimeProgress * 100)}%</AppText>
                </View>
                <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, width: '100%', overflow: 'hidden', position: 'relative' }}>
                  <View style={{ height: '100%', backgroundColor: '#FFF', width: `${monthlyTimeProgress * 100}%` }} />
                </View>
              </View>
            )}
            <AppText style={{ fontSize: 13, color: '#FFF', opacity: 0.8 }}>
              Daily Avg: {currency}{formatAmount(monthlyDailyAverage)}
            </AppText>
          </View>

          {monthlyBudget > 0 && showMonthlyBudget && (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={120} height={120}>
                <Circle stroke="rgba(255,255,255,0.2)" cx={60} cy={60} r={56} strokeWidth={8} fill="none" />
                <Circle
                  stroke={total >= monthlyBudget * 0.8 ? '#ffcccc' : '#FFF'}
                  cx={60} cy={60} r={56} strokeWidth={8}
                  strokeDasharray={`${2 * Math.PI * 56} ${2 * Math.PI * 56}`}
                  strokeDashoffset={2 * Math.PI * 56 - (Math.min((total / monthlyBudget) * 100, 100) / 100) * 2 * Math.PI * 56}
                  strokeLinecap="round" fill="none" transform="rotate(-90 60 60)"
                />
                {total > monthlyBudget && (
                  <Circle
                    stroke="#ff4444"
                    cx={60} cy={60} r={56} strokeWidth={8}
                    strokeDasharray={`${2 * Math.PI * 56} ${2 * Math.PI * 56}`}
                    strokeDashoffset={2 * Math.PI * 56 - (Math.min(((total - monthlyBudget) / monthlyBudget) * 100, 100) / 100) * 2 * Math.PI * 56}
                    strokeLinecap="round" fill="none" transform="rotate(-90 60 60)"
                  />
                )}
              </Svg>
              <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                <AppText style={{ fontSize: 15, fontWeight: 'bold', color: total > monthlyBudget ? '#ff4444' : (total >= monthlyBudget * 0.8 ? '#ffcccc' : '#FFF') }}>
                  {`${String(((total / monthlyBudget) * 100).toFixed(2)).padStart(5, '0')}%`}
                </AppText>
                <AppText style={{ fontSize: 10, color: '#FFF', opacity: 0.8, marginTop: 2 }}>
                  of {currency}{formatAmount(monthlyBudget)}
                </AppText>
              </View>
            </View>
          )}
        </View>
      </PremiumCardBackground>

      {/* Yearly Spending Card */}
      {showYearCard && (
        <PremiumCardBackground color={colors.primary}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <TouchableOpacity onPress={() => setIsYearFilterVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <AppText style={{ fontSize: 14, color: '#FFF', opacity: 0.9, fontWeight: '600', textTransform: 'uppercase' }} numberOfLines={1} adjustsFontSizeToFit>{selectedYearOnly} Total Spending</AppText>
                <Ionicons name="chevron-down" size={14} color="#FFF" style={{ marginLeft: 4, opacity: 0.9 }} />
              </TouchableOpacity>
              <AppText style={{ fontSize: 32, fontWeight: 'bold', color: yearlyBudget > 0 ? (currentYearTotal > yearlyBudget ? '#ff4444' : (currentYearTotal >= yearlyBudget * 0.8 ? '#ffcccc' : '#FFF')) : '#FFF', marginBottom: yearlyBudget > 0 && showYearlyBudget ? 12 : 0 }} numberOfLines={1} adjustsFontSizeToFit>
                {currency}{formatAmount(currentYearTotal)}
              </AppText>
              {yearlyBudget > 0 && showYearlyBudget && (
                <View style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <AppText style={{ fontSize: 10, color: '#FFF', opacity: 0.8, textTransform: 'uppercase', fontWeight: '600' }}>Time Elapsed</AppText>
                    <AppText style={{ fontSize: 10, color: '#FFF', opacity: 0.8, fontWeight: '600' }}>{Math.round(yearlyTimeProgress * 100)}%</AppText>
                  </View>
                  <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, width: '100%', overflow: 'hidden', position: 'relative' }}>
                    <View style={{ height: '100%', backgroundColor: '#FFF', width: `${yearlyTimeProgress * 100}%` }} />
                  </View>
                </View>
              )}
              <AppText style={{ fontSize: 13, color: '#FFF', opacity: 0.8 }}>
                Monthly Avg: {currency}{formatAmount(yearlyMonthlyAverage)}
              </AppText>
            </View>

            {yearlyBudget > 0 && showYearlyBudget && (
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={120} height={120}>
                  <Circle stroke="rgba(255,255,255,0.2)" cx={60} cy={60} r={56} strokeWidth={8} fill="none" />
                  <Circle
                    stroke={currentYearTotal >= yearlyBudget * 0.8 ? '#ffcccc' : '#FFF'}
                    cx={60} cy={60} r={56} strokeWidth={8}
                    strokeDasharray={`${2 * Math.PI * 56} ${2 * Math.PI * 56}`}
                    strokeDashoffset={2 * Math.PI * 56 - (Math.min((currentYearTotal / yearlyBudget) * 100, 100) / 100) * 2 * Math.PI * 56}
                    strokeLinecap="round" fill="none" transform="rotate(-90 60 60)"
                  />
                  {currentYearTotal > yearlyBudget && (
                    <Circle
                      stroke="#ff4444"
                      cx={60} cy={60} r={56} strokeWidth={8}
                      strokeDasharray={`${2 * Math.PI * 56} ${2 * Math.PI * 56}`}
                      strokeDashoffset={2 * Math.PI * 56 - (Math.min(((currentYearTotal - yearlyBudget) / yearlyBudget) * 100, 100) / 100) * 2 * Math.PI * 56}
                      strokeLinecap="round" fill="none" transform="rotate(-90 60 60)"
                    />
                  )}
                </Svg>
                <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                  <AppText style={{ fontSize: 15, fontWeight: 'bold', color: currentYearTotal > yearlyBudget ? '#ff4444' : (currentYearTotal >= yearlyBudget * 0.8 ? '#ffcccc' : '#FFF') }}>
                    {`${String(((currentYearTotal / yearlyBudget) * 100).toFixed(2)).padStart(5, '0')}%`}
                  </AppText>
                  <AppText style={{ fontSize: 10, color: '#FFF', opacity: 0.8, marginTop: 2 }}>
                    of {currency}{formatAmount(yearlyBudget)}
                  </AppText>
                </View>
              </View>
            )}
          </View>
        </PremiumCardBackground>
      )}

      <SingleFilterModal
        visible={isMonthFilterVisible}
        onClose={() => setIsMonthFilterVisible(false)}
        availableYears={availableYears}
        availableMonths={availableMonths}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        onClearAll={() => {
          setSelectedMonth(currentMonthIndex);
          setSelectedYear(currentYearVal);
        }}
      />

      <SingleFilterModal
        visible={isYearFilterVisible}
        onClose={() => setIsYearFilterVisible(false)}
        availableYears={availableYears}
        selectedYear={selectedYearOnly}
        setSelectedYear={setSelectedYearOnly}
        onClearAll={() => {
          setSelectedYearOnly(currentYearVal);
        }}
      />
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {renderCards()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 20,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  }
});

