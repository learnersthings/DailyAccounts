import React, { useState } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import AppText from '../components/AppText';
import { useThemeContext } from '../context/ThemeContext';
import { useTransactionContext } from '../context/TransactionContext';
import { Ionicons } from '@expo/vector-icons';
import EmptyState from '../components/EmptyState';

export default function ManageAccountsScreen() {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();
  const { accounts, addManualAccount, deleteAccount } = useTransactionContext();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [error, setError] = useState('');

  const handleOpenAddModal = () => {
    setNewAccountName('');
    setError('');
    setIsModalVisible(true);
  };

  const handleSaveAccount = async () => {
    const trimmed = newAccountName.trim();
    if (!trimmed) {
      setError('Account name is required.');
      return;
    }
    if (accounts.includes(trimmed)) {
      setError('An account with this name already exists.');
      return;
    }

    await addManualAccount(trimmed);
    setIsModalVisible(false);
  };

  const handleDeleteAccount = (accountName: string) => {
    Alert.alert(
      "Delete Account",
      `Are you sure you want to delete "${accountName}"? All transactions associated with this account will also be deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteAccount(accountName);
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {accounts.length === 0 ? (
        <EmptyState
          icon="business-outline"
          title="No Accounts"
          message="You haven't added any accounts yet. Click the + button to add one manually!"
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <AppText style={[styles.title, { color: colors.text }]}>Your Accounts</AppText>
            <AppText style={styles.subtitle}>Manage your accounts. Adding an account here lets you prepare your dashboard before adding transactions.</AppText>
          </View>

          <View style={styles.list}>
            {accounts.map((acc) => (
              <View
                key={acc}
                style={[styles.accountCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
                    <Ionicons name="card" size={24} color="#fff" />
                  </View>
                  <AppText style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>{acc}</AppText>
                </View>
                <TouchableOpacity onPress={() => handleDeleteAccount(acc)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={20} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={handleOpenAddModal}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal visible={isModalVisible} transparent animationType="slide" onRequestClose={() => setIsModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[styles.modalContent, { backgroundColor: colors.background }]}
            >
              <View style={styles.modalHeader}>
                <AppText style={[styles.modalTitle, { color: colors.text }]}>Add Account</AppText>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrapper}>
                <AppText style={[styles.label, { color: colors.text }]}>Account Name</AppText>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="Account Name"
                  placeholderTextColor={colors.textMuted}
                  value={newAccountName}
                  onChangeText={(text) => {
                    setNewAccountName(text);
                    setError('');
                  }}
                  autoFocus
                />
                {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
              </View>

              <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSaveAccount}>
                <AppText style={styles.saveButtonText}>Add Account</AppText>
              </TouchableOpacity>

            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    lineHeight: 20,
  },
  list: {
    gap: 12,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  deleteBtn: {
    padding: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputWrapper: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
