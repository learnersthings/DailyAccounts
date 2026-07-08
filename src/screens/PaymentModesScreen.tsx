import React, { useState } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import AppText from '../components/AppText';
import { useThemeContext } from '../context/ThemeContext';
import { useExpenseContext, PaymentMode } from '../context/ExpenseContext';
import { Ionicons } from '@expo/vector-icons';
import AddPaymentModeModal from '../components/AddPaymentModeModal';

export default function PaymentModesScreen() {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();
  const { paymentModes } = useExpenseContext();
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedMode, setSelectedMode] = useState<PaymentMode | null>(null);

  const handleOpenAddModal = () => {
    setSelectedMode(null);
    setIsModalVisible(true);
  };

  const handleEditMode = (mode: PaymentMode) => {
    setSelectedMode(mode);
    setIsModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.header}>
          <AppText style={[styles.title, { color: colors.text }]}>Payment Modes</AppText>
          <AppText style={styles.subtitle}>Manage how you pay for expenses.</AppText>
        </View>

        {paymentModes.length === 0 ? (
          <View style={styles.emptyState}>
            <AppText style={styles.emptyText}>No payment modes found. Add one!</AppText>
          </View>
        ) : (
          <View style={styles.grid}>
            {paymentModes.map((mode) => (
              <TouchableOpacity 
                key={mode.id} 
                style={[styles.modeCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
                onPress={() => handleEditMode(mode)}
              >
                <View style={[styles.iconContainer, { backgroundColor: mode.color }]}>
                  <Ionicons name={mode.icon as any} size={28} color="#fff" />
                </View>
                <AppText style={[styles.modeName, { color: colors.text }]} numberOfLines={1}>{mode.name}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={handleOpenAddModal}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <AddPaymentModeModal 
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        modeToEdit={selectedMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingBottom: 100, // For FAB
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modeCard: {
    width: '48%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeName: {
    fontSize: 16,
    fontWeight: '600',
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
});

