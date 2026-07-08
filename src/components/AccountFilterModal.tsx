import React from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../context/ThemeContext';

interface AccountFilterModalProps {
  visible: boolean;
  onClose: () => void;
  availableYears: number[];
  availableMonths: number[];

  selectedYears: number[];
  setSelectedYears: (val: number[]) => void;

  selectedMonths: number[];
  setSelectedMonths: (val: number[]) => void;

  selectedTypes: string[];
  setSelectedTypes: (val: string[]) => void;
  onClearAll?: () => void;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TRANSACTION_TYPES = ['Credit', 'Debit'];

export default function AccountFilterModal(props: AccountFilterModalProps) {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();

  const toggleYear = (y: number) => {
    if (props.selectedYears.includes(y)) {
      props.setSelectedYears(props.selectedYears.filter(year => year !== y));
    } else {
      props.setSelectedYears([...props.selectedYears, y]);
    }
  };

  const toggleMonth = (m: number) => {
    if (props.selectedMonths.includes(m)) {
      props.setSelectedMonths(props.selectedMonths.filter(month => month !== m));
    } else {
      props.setSelectedMonths([...props.selectedMonths, m]);
    }
  };

  const toggleType = (type: string) => {
    if (props.selectedTypes.includes(type)) {
      props.setSelectedTypes(props.selectedTypes.filter(t => t !== type));
    } else {
      props.setSelectedTypes([...props.selectedTypes, type]);
    }
  };

  const handleClearAll = () => {
    props.setSelectedYears([]);
    props.setSelectedMonths([]);
    props.setSelectedTypes([]);
    if (props.onClearAll) {
      props.onClearAll();
    }
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
            <AppText style={{ color: '#ff4444', fontSize: 16, fontWeight: 'bold' }}>Clear</AppText>
          </TouchableOpacity>
          <AppText style={[styles.headerTitle, { color: colors.text }]}>Filters</AppText>
          <TouchableOpacity onPress={props.onClose} style={styles.headerButton}>
            <AppText style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold' }}>Done</AppText>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>

          {/* Types */}
          <View style={styles.section}>
            <AppText style={[styles.sectionTitle, { color: colors.text }]}>Transaction Type</AppText>
            <View style={styles.chipContainer}>
              {TRANSACTION_TYPES.map(t => renderChip(t, props.selectedTypes.includes(t), () => toggleType(t)))}
            </View>
          </View>

          {/* Years */}
          {props.availableYears.length > 0 && (
            <View style={styles.section}>
              <AppText style={[styles.sectionTitle, { color: colors.text }]}>Year</AppText>
              <View style={styles.chipContainer}>
                {props.availableYears.map(y => renderChip(y.toString(), props.selectedYears.includes(y), () => toggleYear(y)))}
              </View>
            </View>
          )}

          {/* Months */}
          {props.availableMonths.length > 0 && (
            <View style={styles.section}>
              <AppText style={[styles.sectionTitle, { color: colors.text }]}>Month</AppText>
              <View style={styles.chipContainer}>
                {props.availableMonths.map(m => renderChip(MONTH_NAMES[m], props.selectedMonths.includes(m), () => toggleMonth(m)))}
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
