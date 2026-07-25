import React from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../components/AppText';
import { useThemeContext } from '../context/ThemeContext';

interface SingleFilterModalProps {
  visible: boolean;
  onClose: () => void;
  availableYears: number[];
  availableMonths?: number[]; // optional, if not provided, it's a yearly filter only
  
  selectedYear: number;
  setSelectedYear: (val: number) => void;
  
  selectedMonth?: number;
  setSelectedMonth?: (val: number) => void;
  
  onClearAll?: () => void; // maybe reset to current
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function SingleFilterModal(props: SingleFilterModalProps) {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();

  const handleClearAll = () => {
    if (props.onClearAll) {
      props.onClearAll();
    }
    props.onClose();
  };

  const renderChip = (label: string, isSelected: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={label}
      style={[
        styles.chip,
        { backgroundColor: isSelected ? colors.primary : (colors.border) }
      ]}
      onPress={onPress}
    >
      <AppText style={[styles.chipText, { color: isSelected ? '#fff' : colors.text }]}>{label}</AppText>
    </TouchableOpacity>
  );

  return (
    <Modal visible={props.visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
        <View style={[styles.header, { borderBottomColor: isDarkTheme ? '#333' : '#eee' }]}>
          <TouchableOpacity onPress={handleClearAll} style={styles.headerButton}>
            <AppText style={{ color: '#ff4444', fontSize: 16, fontWeight: 'bold' }}>Reset</AppText>
          </TouchableOpacity>
          <AppText style={[styles.headerTitle, { color: colors.text }]}>Filter</AppText>
          <TouchableOpacity onPress={props.onClose} style={styles.headerButton}>
            <AppText style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold' }}>Done</AppText>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Years */}
          {props.availableYears.length > 0 && (
            <View style={styles.section}>
              <AppText style={[styles.sectionTitle, { color: colors.text }]}>Year</AppText>
              <View style={styles.chipContainer}>
                {props.availableYears.map(y => renderChip(y.toString(), props.selectedYear === y, () => props.setSelectedYear(y)))}
              </View>
            </View>
          )}

          {/* Months */}
          {props.availableMonths && props.availableMonths.length > 0 && props.setSelectedMonth && props.selectedMonth !== undefined && (
            <View style={styles.section}>
              <AppText style={[styles.sectionTitle, { color: colors.text }]}>Month</AppText>
              <View style={styles.chipContainer}>
                {props.availableMonths.map(m => renderChip(MONTH_NAMES[m], props.selectedMonth === m, () => props.setSelectedMonth!(m)))}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerButton: {
    padding: 5,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
