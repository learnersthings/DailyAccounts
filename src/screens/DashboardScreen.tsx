import React, { useState, useMemo } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import AppText from '../components/AppText';
import { useThemeContext } from '../context/ThemeContext';
import { useExpenseContext } from '../context/ExpenseContext';
import { formatAmount } from '../utils/format';
import Svg, { Circle, G, Line } from 'react-native-svg';
import PremiumCardBackground from '../components/PremiumCardBackground';
import { parseISOYear, parseISOMonth } from '../utils/dateUtils';
import SingleFilterModal from '../components/SingleFilterModal';
import DayExpensesModal from '../components/DayExpensesModal';
import { Ionicons } from '@expo/vector-icons';

const formatCompact = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'k';
  return Number(num).toFixed(2);
};

const SpendingVelocityCard = ({ colors, timeElapsedRatio, budgetSpentRatio, monthlyBudget, currency }: any) => {
  if (monthlyBudget <= 0) return null;

  const isTooFast = budgetSpentRatio > timeElapsedRatio + 0.1;
  const isSlightlyFast = budgetSpentRatio > timeElapsedRatio && !isTooFast;

  const statusColor = isTooFast ? '#ff4444' : (isSlightlyFast ? '#ffeb3b' : '#00C851');
  const statusMessage = isTooFast 
    ? `Slow down! You've spent ${(budgetSpentRatio * 100).toFixed(0)}% of your budget, but only ${(timeElapsedRatio * 100).toFixed(0)}% of the month has passed.`
    : isSlightlyFast 
      ? `Careful. You are spending slightly faster than the month is progressing.`
      : `Great job! Your spending is perfectly on track for the month.`;

  const radius = 80;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  const semiCircumference = circumference / 2;
  const clampedBudgetSpentRatio = Math.min(budgetSpentRatio, 1);
  const filledLength = clampedBudgetSpentRatio * semiCircumference;
  
  const angleRad = Math.PI + timeElapsedRatio * Math.PI;
  const markerX = 100 + (radius + strokeWidth/2 + 5) * Math.cos(angleRad);
  const markerY = 100 + (radius + strokeWidth/2 + 5) * Math.sin(angleRad);
  const innerMarkerX = 100 + (radius - strokeWidth/2 - 5) * Math.cos(angleRad);
  const innerMarkerY = 100 + (radius - strokeWidth/2 - 5) * Math.sin(angleRad);

  return (
    <PremiumCardBackground color={colors.primary}>
      <AppText style={{ fontSize: 16, fontWeight: 'bold', color: '#FFF', marginBottom: 16 }}>
        Spending Velocity
      </AppText>
      <View style={{ alignItems: 'center' }}>
        <Svg width={200} height={110}>
          <G transform="rotate(180 100 100)">
            <Circle
              cx={100} cy={100} r={radius}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${semiCircumference} ${circumference}`}
              fill="none"
            />
            <Circle
              cx={100} cy={100} r={radius}
              stroke={statusColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${filledLength} ${circumference}`}
              fill="none"
            />
          </G>
          
          <Line
            x1={innerMarkerX} y1={innerMarkerY}
            x2={markerX} y2={markerY}
            stroke="#FFF"
            strokeWidth={3}
            strokeLinecap="round"
          />
          
          <AppText style={{ position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center', fontSize: 24, fontWeight: 'bold', color: statusColor }}>
            {(budgetSpentRatio * 100).toFixed(2).padStart(5, '0')}%
          </AppText>
        </Svg>
        
        <View style={{ marginTop: 4, paddingHorizontal: 16 }}>
          <AppText style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>
            {statusMessage}
          </AppText>
        </View>
      </View>
    </PremiumCardBackground>
  );
};

const MonthlySpendingCalendar = ({ expenses, selectedMonth, selectedYear, colors, onPrevMonth, onNextMonth, onDayPress, isCalendarHidden, setIsCalendarHidden }: any) => {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();

  const today = new Date();
  const isCurrentMonth = today.getMonth() === selectedMonth && today.getFullYear() === selectedYear;
  const currentDay = today.getDate();

  const dayTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    expenses.forEach((e: any) => {
      const d = new Date(e.date);
      if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
        const day = d.getDate();
        totals[day] = (totals[day] || 0) + e.amount;
      }
    });
    return totals;
  }, [expenses, selectedMonth, selectedYear]);

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const gridCells = [];

  // Padding for first row
  for (let i = 0; i < firstDayOfMonth; i++) {
    gridCells.push(<View key={`pad-${i}`} style={{ width: '14.28%', aspectRatio: 1, padding: 2 }} />);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = isCurrentMonth && day === currentDay;
    const total = dayTotals[day] || 0;

    const cellDate = new Date(selectedYear, selectedMonth, day);
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isFutureDay = cellDate > todayDateOnly;

    gridCells.push(
      <TouchableOpacity
        key={`day-${day}`}
        style={{ width: '14.28%', aspectRatio: 1, padding: 2 }}
        onPress={() => onDayPress && onDayPress(day, total)}
      >
        <View style={{
          flex: 1,
          backgroundColor: isToday ? 'rgba(255,255,255,0.2)' : 'transparent',
          borderRadius: 6,
          padding: 2,
          borderWidth: 1,
          borderColor: isToday ? '#FFF' : 'rgba(255,255,255,0.2)',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <AppText style={{ fontSize: 10, color: isToday ? '#FFF' : 'rgba(255,255,255,0.8)', position: 'absolute', top: 2, left: 4, fontWeight: isToday ? 'bold' : 'normal' }}>
            {day}
          </AppText>
          {(!isFutureDay || total > 0) && (
            <View style={{ marginTop: 8, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <AppText style={{ fontSize: 9, color: total > 0 ? colors.notification : '#FFF', fontWeight: total > 0 ? 'bold' : 'normal', textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit>
                {isCalendarHidden ? '•••' : formatCompact(total)}
              </AppText>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <PremiumCardBackground color={colors.primary}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginLeft: 4, marginRight: 4 }}>
        <AppText style={{ fontSize: 16, fontWeight: 'bold', color: '#FFF' }}>
          Daily Spending
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AppText style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginRight: 8 }}>
            {MONTHS[selectedMonth]} {selectedYear}
          </AppText>
          <TouchableOpacity onPress={() => setIsCalendarHidden(!isCalendarHidden)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Ionicons name={isCalendarHidden ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ position: 'relative' }}>
        <TouchableOpacity style={{ position: 'absolute', top: -4, left: -4, padding: 4, zIndex: 10 }} onPress={onPrevMonth}>
          <Ionicons name="chevron-back" size={16} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={{ position: 'absolute', top: -4, right: -4, padding: 4, zIndex: 10 }} onPress={onNextMonth}>
          <Ionicons name="chevron-forward" size={16} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          {daysOfWeek.map((d, i) => (
            <AppText key={i} style={{ flex: 1, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
              {d}
            </AppText>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {gridCells}
        </View>
      </View>
    </PremiumCardBackground>
  );
};

export default function DashboardScreen() {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();
  const { expenses, currency, monthlyBudget, yearlyBudget, showMonthlyBudget, showYearlyBudget, showYearCard } = useExpenseContext();

  const currentMonthIndex = new Date().getMonth();
  const currentYearVal = new Date().getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIndex);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearVal);

  const [isMonthFilterVisible, setIsMonthFilterVisible] = useState(false);
  const [isYearFilterVisible, setIsYearFilterVisible] = useState(false);

  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [isDayModalVisible, setIsDayModalVisible] = useState(false);

  const [isMonthlyHidden, setIsMonthlyHidden] = useState(true);
  const [isYearlyHidden, setIsYearlyHidden] = useState(true);
  const [isCalendarHidden, setIsCalendarHidden] = useState(true);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastOpacity] = useState(new Animated.Value(0));

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastMessage(null));
  };

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
      .filter(exp => parseISOYear(exp.date) === selectedYear)
      .reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses, selectedYear]);

  const monthsToConsider = useMemo(() => {
    const now = new Date();
    if (selectedYear === now.getFullYear()) {
      return Math.max(now.getMonth(), 1);
    } else if (selectedYear < now.getFullYear()) {
      return 12;
    }
    return 1;
  }, [selectedYear]);

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
    if (selectedYear < now.getFullYear()) return 1;
    if (selectedYear > now.getFullYear()) return 0;

    return now.getMonth() / 12;
  }, [selectedYear]);

  const budgetSpentRatio = monthlyBudget > 0 ? total / monthlyBudget : 0;

  const renderCards = () => (
    <View>
      {/* Monthly Spending Card */}
      <PremiumCardBackground color={colors.primary}>
        <TouchableOpacity style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }} onPress={() => setIsMonthlyHidden(!isMonthlyHidden)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Ionicons name={isMonthlyHidden ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <TouchableOpacity onPress={() => setIsMonthFilterVisible(true)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppText style={{ fontSize: 14, color: '#FFF', opacity: 0.9, fontWeight: '600', textTransform: 'uppercase' }} numberOfLines={1} adjustsFontSizeToFit>{currentMonthName} Spending</AppText>
                <Ionicons name="chevron-down" size={14} color="#FFF" style={{ marginLeft: 4, opacity: 0.9 }} />
              </TouchableOpacity>
            </View>
            <AppText style={{ fontSize: 32, fontWeight: 'bold', color: monthlyBudget > 0 ? (total > monthlyBudget ? '#ff4444' : (total >= monthlyBudget * 0.8 ? '#ffcccc' : '#FFF')) : '#FFF', marginBottom: monthlyBudget > 0 && showMonthlyBudget ? 12 : 0 }} numberOfLines={1} adjustsFontSizeToFit>
              {isMonthlyHidden ? '••••••' : `${currency}${formatAmount(total)}`}
            </AppText>
            {monthlyBudget > 0 && showMonthlyBudget && (
              <View style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <AppText style={{ fontSize: 10, color: '#FFF', opacity: 0.8, textTransform: 'uppercase', fontWeight: '600' }}>Time Elapsed</AppText>
                  <AppText style={{ fontSize: 10, color: '#FFF', opacity: 0.8, fontWeight: '600' }}>{(monthlyTimeProgress * 100).toFixed(2).padStart(5, '0')}%</AppText>
                </View>
                <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, width: '100%', overflow: 'hidden', position: 'relative' }}>
                  <View style={{ height: '100%', backgroundColor: '#FFF', width: `${monthlyTimeProgress * 100}%` }} />
                </View>
              </View>
            )}
            <AppText style={{ fontSize: 13, color: '#FFF', opacity: 0.8 }}>
              Daily Avg: {isMonthlyHidden ? '••••' : `${currency}${formatAmount(monthlyDailyAverage)}`}
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
                  {isMonthlyHidden ? '••%' : `${String(((total / monthlyBudget) * 100).toFixed(2)).padStart(5, '0')}%`}
                </AppText>
                <AppText style={{ fontSize: 10, color: '#FFF', opacity: 0.8, marginTop: 2 }}>
                  of {isMonthlyHidden ? '••••' : `${currency}${formatAmount(monthlyBudget)}`}
                </AppText>
              </View>
            </View>
          )}
        </View>
      </PremiumCardBackground>

      {/* Yearly Spending Card */}
      {showYearCard && (
        <PremiumCardBackground color={colors.primary}>
          <TouchableOpacity style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }} onPress={() => setIsYearlyHidden(!isYearlyHidden)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Ionicons name={isYearlyHidden ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TouchableOpacity onPress={() => setIsYearFilterVisible(true)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppText style={{ fontSize: 14, color: '#FFF', opacity: 0.9, fontWeight: '600', textTransform: 'uppercase' }} numberOfLines={1} adjustsFontSizeToFit>{selectedYear} Total Spending</AppText>
                  <Ionicons name="chevron-down" size={14} color="#FFF" style={{ marginLeft: 4, opacity: 0.9 }} />
                </TouchableOpacity>
              </View>
              <AppText style={{ fontSize: 32, fontWeight: 'bold', color: yearlyBudget > 0 ? (currentYearTotal > yearlyBudget ? '#ff4444' : (currentYearTotal >= yearlyBudget * 0.8 ? '#ffcccc' : '#FFF')) : '#FFF', marginBottom: yearlyBudget > 0 && showYearlyBudget ? 12 : 0 }} numberOfLines={1} adjustsFontSizeToFit>
                {isYearlyHidden ? '••••••' : `${currency}${formatAmount(currentYearTotal)}`}
              </AppText>
              {yearlyBudget > 0 && showYearlyBudget && (
                <View style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <AppText style={{ fontSize: 10, color: '#FFF', opacity: 0.8, textTransform: 'uppercase', fontWeight: '600' }}>Time Elapsed</AppText>
                    <AppText style={{ fontSize: 10, color: '#FFF', opacity: 0.8, fontWeight: '600' }}>{(yearlyTimeProgress * 100).toFixed(2).padStart(5, '0')}%</AppText>
                  </View>
                  <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, width: '100%', overflow: 'hidden', position: 'relative' }}>
                    <View style={{ height: '100%', backgroundColor: '#FFF', width: `${yearlyTimeProgress * 100}%` }} />
                  </View>
                </View>
              )}
              <AppText style={{ fontSize: 13, color: '#FFF', opacity: 0.8 }}>
                Monthly Avg: {isYearlyHidden ? '••••' : `${currency}${formatAmount(yearlyMonthlyAverage)}`}
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
                    {isYearlyHidden ? '••%' : `${String(((currentYearTotal / yearlyBudget) * 100).toFixed(2)).padStart(5, '0')}%`}
                  </AppText>
                  <AppText style={{ fontSize: 10, color: '#FFF', opacity: 0.8, marginTop: 2 }}>
                    of {isYearlyHidden ? '••••' : `${currency}${formatAmount(yearlyBudget)}`}
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
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        onClearAll={() => {
          setSelectedYear(currentYearVal);
        }}
      />
    </View>
  );

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleDayPress = (day: number, total: number) => {
    if (total > 0) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      setSelectedDayDate(dateStr);
      setIsDayModalVisible(true);
    } else {
      showToast('No transaction found.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {renderCards()}
        <MonthlySpendingCalendar
          expenses={expenses}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          colors={colors}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onDayPress={handleDayPress}
          isCalendarHidden={isCalendarHidden}
          setIsCalendarHidden={setIsCalendarHidden}
        />
        {monthlyBudget > 0 && showMonthlyBudget && (
          <SpendingVelocityCard 
            colors={colors}
            timeElapsedRatio={monthlyTimeProgress}
            budgetSpentRatio={budgetSpentRatio}
            monthlyBudget={monthlyBudget}
            currency={currency}
          />
        )}
      </ScrollView>

      {toastMessage && (
        <Animated.View style={{
          position: 'absolute',
          bottom: 50,
          alignSelf: 'center',
          backgroundColor: 'rgba(0,0,0,0.7)',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 20,
          opacity: toastOpacity,
          zIndex: 9999,
        }}>
          <AppText style={{ color: 'white', fontSize: 14 }}>{toastMessage}</AppText>
        </Animated.View>
      )}

      <DayExpensesModal
        visible={isDayModalVisible}
        onClose={() => setIsDayModalVisible(false)}
        selectedDate={selectedDayDate}
        isHidden={isCalendarHidden}
      />
    </View>
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

