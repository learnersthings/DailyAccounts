import React from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, Modal, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../components/AppText';
import { useThemeContext } from '../context/ThemeContext';
import ExpenseList from './ExpenseList';

interface DayExpensesModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string | null;
}

export default function DayExpensesModal({ visible, onClose, selectedDate }: DayExpensesModalProps) {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();

  const formattedDate = selectedDate ? new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
        <View style={[styles.header, { borderBottomColor: isDarkTheme ? '#333' : '#eee' }]}>
          <View style={styles.headerButton} />
          <AppText style={[styles.headerTitle, { color: colors.text }]}>{formattedDate}</AppText>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <AppText style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold' }}>Close</AppText>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }}>
          {selectedDate ? <ExpenseList hideTitle={true} isExpensesScreen={true} dateFilter={selectedDate} /> : null}
        </View>
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerButton: {
    padding: 5,
    minWidth: 50,
    alignItems: 'flex-end'
  },
});
