import React from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet } from 'react-native';
import AppText from '../components/AppText';
import { useThemeContext } from '../context/ThemeContext';
import { useExpenseContext } from '../context/ExpenseContext';
import { formatAmount } from '../utils/format';
import Svg, { Circle } from 'react-native-svg';
import ExpenseList from '../components/ExpenseList';
import PremiumCardBackground from '../components/PremiumCardBackground';

export default function DashboardScreen() {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();
  const { getCurrentMonthTotal, expenses, currency, monthlyBudget, yearlyBudget, showMonthlyBudget, showYearlyBudget, showYearCard } = useExpenseContext();

  const total = getCurrentMonthTotal();
  const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  const currentYear = new Date().getFullYear();
  const currentYearTotal = expenses
    .filter(exp => new Date(exp.date).getFullYear() === currentYear)
    .reduce((sum, exp) => sum + exp.amount, 0);

  const renderCards = () => (
    <View>
      {/* Monthly Spending Card */}
      <PremiumCardBackground color={colors.primary}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <AppText style={{ fontSize: 14, color: '#FFF', opacity: 0.9, marginBottom: 8, fontWeight: '600', textTransform: 'uppercase' }}>{currentMonthName} Spending</AppText>
            <AppText style={{ fontSize: 32, fontWeight: 'bold', color: monthlyBudget > 0 && total > monthlyBudget ? '#ff4444' : '#FFF', marginBottom: monthlyBudget > 0 && showMonthlyBudget ? 16 : 0 }} numberOfLines={1} adjustsFontSizeToFit>
              {currency}{formatAmount(total)}
            </AppText>
            {monthlyBudget > 0 && showMonthlyBudget && (
              <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, width: '100%', overflow: 'hidden', position: 'relative' }}>
                <View style={{ height: '100%', backgroundColor: total > monthlyBudget ? '#ffcccc' : '#FFF', width: `${Math.min((total / monthlyBudget) * 100, 100)}%` }} />
                {total > monthlyBudget && (
                  <View style={{ position: 'absolute', left: 0, top: 0, height: '100%', backgroundColor: '#ff4444', width: `${Math.min(((total - monthlyBudget) / monthlyBudget) * 100, 100)}%` }} />
                )}
              </View>
            )}
          </View>

          {monthlyBudget > 0 && showMonthlyBudget && (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={120} height={120}>
                <Circle stroke="rgba(255,255,255,0.2)" cx={60} cy={60} r={50} strokeWidth={8} fill="none" />
                <Circle
                  stroke={total > monthlyBudget ? '#ffcccc' : '#FFF'}
                  cx={60} cy={60} r={50} strokeWidth={8}
                  strokeDasharray={`${2 * Math.PI * 50} ${2 * Math.PI * 50}`}
                  strokeDashoffset={2 * Math.PI * 50 - (Math.min((total / monthlyBudget) * 100, 100) / 100) * 2 * Math.PI * 50}
                  strokeLinecap="round" fill="none" transform="rotate(-90 60 60)"
                />
                {total > monthlyBudget && (
                  <Circle
                    stroke="#ff4444"
                    cx={60} cy={60} r={50} strokeWidth={8}
                    strokeDasharray={`${2 * Math.PI * 50} ${2 * Math.PI * 50}`}
                    strokeDashoffset={2 * Math.PI * 50 - (Math.min(((total - monthlyBudget) / monthlyBudget) * 100, 100) / 100) * 2 * Math.PI * 50}
                    strokeLinecap="round" fill="none" transform="rotate(-90 60 60)"
                  />
                )}
              </Svg>
              <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                <AppText style={{ fontSize: 15, fontWeight: 'bold', color: total > monthlyBudget ? '#ff4444' : '#FFF' }}>
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
              <AppText style={{ fontSize: 14, color: '#FFF', opacity: 0.9, marginBottom: 8, fontWeight: '600', textTransform: 'uppercase' }}>{currentYear} Total Spending</AppText>
              <AppText style={{ fontSize: 32, fontWeight: 'bold', color: yearlyBudget > 0 && currentYearTotal > yearlyBudget ? '#ff4444' : '#FFF', marginBottom: yearlyBudget > 0 && showYearlyBudget ? 16 : 0 }} numberOfLines={1} adjustsFontSizeToFit>
                {currency}{formatAmount(currentYearTotal)}
              </AppText>
              {yearlyBudget > 0 && showYearlyBudget && (
                <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, width: '100%', overflow: 'hidden', position: 'relative' }}>
                  <View style={{ height: '100%', backgroundColor: currentYearTotal > yearlyBudget ? '#ffcccc' : '#FFF', width: `${Math.min((currentYearTotal / yearlyBudget) * 100, 100)}%` }} />
                  {currentYearTotal > yearlyBudget && (
                    <View style={{ position: 'absolute', left: 0, top: 0, height: '100%', backgroundColor: '#ff4444', width: `${Math.min(((currentYearTotal - yearlyBudget) / yearlyBudget) * 100, 100)}%` }} />
                  )}
                </View>
              )}
            </View>

            {yearlyBudget > 0 && showYearlyBudget && (
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={120} height={120}>
                  <Circle stroke="rgba(255,255,255,0.2)" cx={60} cy={60} r={50} strokeWidth={8} fill="none" />
                  <Circle
                    stroke={currentYearTotal > yearlyBudget ? '#ffcccc' : '#FFF'}
                    cx={60} cy={60} r={50} strokeWidth={8}
                    strokeDasharray={`${2 * Math.PI * 50} ${2 * Math.PI * 50}`}
                    strokeDashoffset={2 * Math.PI * 50 - (Math.min((currentYearTotal / yearlyBudget) * 100, 100) / 100) * 2 * Math.PI * 50}
                    strokeLinecap="round" fill="none" transform="rotate(-90 60 60)"
                  />
                  {currentYearTotal > yearlyBudget && (
                    <Circle
                      stroke="#ff4444"
                      cx={60} cy={60} r={50} strokeWidth={8}
                      strokeDasharray={`${2 * Math.PI * 50} ${2 * Math.PI * 50}`}
                      strokeDashoffset={2 * Math.PI * 50 - (Math.min(((currentYearTotal - yearlyBudget) / yearlyBudget) * 100, 100) / 100) * 2 * Math.PI * 50}
                      strokeLinecap="round" fill="none" transform="rotate(-90 60 60)"
                    />
                  )}
                </Svg>
                <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                  <AppText style={{ fontSize: 15, fontWeight: 'bold', color: currentYearTotal > yearlyBudget ? '#ff4444' : '#FFF' }}>
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
    </View>
  );

  return <ExpenseList ListHeaderComponent={renderCards()} />;
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

