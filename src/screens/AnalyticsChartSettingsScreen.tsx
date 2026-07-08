import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import AppText from '../components/AppText';
import { useThemeColors } from '../hooks/useThemeColors';
import { useExpenseContext } from '../context/ExpenseContext';
import { Ionicons } from '@expo/vector-icons';

export default function AnalyticsChartSettingsScreen() {
  const colors = useThemeColors();
  const { analyticsChartType, updateAnalyticsChartType, chartStyle, updateChartStyle } = useExpenseContext();

  const handleSelectType = (type: 'Pie' | 'Donut') => {
    updateAnalyticsChartType(type);
  };

  const handleSelectStyle = (style: 'Classic' | '3D' | 'Spaced' | 'Semi-Circle') => {
    updateChartStyle(style);
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
        <AppText style={[styles.title, { color: colors.text }]}>Select Chart Type</AppText>
        <AppText style={styles.subtitle}>Choose how you want your analytics data to be visualized.</AppText>

        <TouchableOpacity
          style={[styles.optionRow, { borderBottomColor: colors.border }]}
          onPress={() => handleSelectType('Pie')}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="pie-chart-outline" size={24} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.optionText, { color: colors.text }]}>Pie Chart</AppText>
          </View>
          {analyticsChartType === 'Pie' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionRow, { borderBottomWidth: 0 }]}
          onPress={() => handleSelectType('Donut')}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="aperture-outline" size={24} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.optionText, { color: colors.text }]}>Donut Chart</AppText>
          </View>
          {analyticsChartType === 'Donut' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow, marginTop: 20 }]}>
        <AppText style={[styles.title, { color: colors.text }]}>Select Chart Style</AppText>
        <AppText style={styles.subtitle}>Customize the visual appearance of your charts.</AppText>

        <TouchableOpacity
          style={[styles.optionRow, { borderBottomColor: colors.border }]}
          onPress={() => handleSelectStyle('Classic')}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="disc-outline" size={24} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.optionText, { color: colors.text }]}>Classic</AppText>
          </View>
          {chartStyle === 'Classic' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionRow, { borderBottomColor: colors.border }]}
          onPress={() => handleSelectStyle('3D')}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="cube-outline" size={24} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.optionText, { color: colors.text }]}>3D Effect</AppText>
          </View>
          {chartStyle === '3D' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionRow, { borderBottomColor: colors.border }]}
          onPress={() => handleSelectStyle('Spaced')}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="grid-outline" size={24} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.optionText, { color: colors.text }]}>Spaced</AppText>
          </View>
          {chartStyle === 'Spaced' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionRow, { borderBottomWidth: 0 }]}
          onPress={() => handleSelectStyle('Semi-Circle')}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="speedometer-outline" size={24} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.optionText, { color: colors.text }]}>Semi-Circle</AppText>
          </View>
          {chartStyle === 'Semi-Circle' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 16,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
