import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import BankTransactionList from '../components/BankTransactionList';
import { useThemeColors } from '../hooks/useThemeColors';
import AppText from '../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import AddTransactionModal from '../components/AddTransactionModal';

export default function AccountTransactionsScreen({ route }: any) {
  const { account } = route.params;
  const colors = useThemeColors();
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <AppText style={[styles.title, { color: colors.text }]}>{account} Transactions</AppText>
      </View>
      <BankTransactionList accountFilter={account} />
      
      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={() => setIsAddModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <AddTransactionModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        initialAccount={account}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#888',
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
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
