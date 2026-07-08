import React, { useState } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, TextInput, TouchableOpacity, StyleSheet, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView, Alert } from 'react-native';
import AppText from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTransactionContext, BankTransaction } from '../context/TransactionContext';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  transactionToEdit?: BankTransaction | null;
  initialAccount?: string;
}

export default function AddTransactionModal({ visible, onClose, transactionToEdit, initialAccount }: AddTransactionModalProps) {
  const colors = useThemeColors();
  const { addTransaction, updateTransaction, deleteTransaction, accounts } = useTransactionContext();
  const insets = useSafeAreaInsets();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [type, setType] = useState<'Debit' | 'Credit' | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [typeError, setTypeError] = useState('');
  const [accountError, setAccountError] = useState('');

  const clearErrors = () => {
    setAmountError('');
    setDescriptionError('');
    setTypeError('');
    setAccountError('');
  };

  React.useEffect(() => {
    if (visible) {
      if (transactionToEdit) {
        setAmount(transactionToEdit.amount.toString());
        setDescription(transactionToEdit.description);
        setDate(new Date(transactionToEdit.date));
        setType(transactionToEdit.type);
        setAccount(transactionToEdit.account);
      } else {
        setAmount('');
        setDescription('');
        setDate(new Date());
        setType(null);
        setAccount(initialAccount || null);
      }
      clearErrors();
    }
  }, [visible, transactionToEdit, initialAccount]);

  const placeholderColor = colors.textMuted;

  const handleSave = async () => {
    clearErrors();
    let hasError = false;

    if (!amount.trim() || isNaN(Number(amount))) {
      setAmountError('Please enter a valid amount.');
      hasError = true;
    }
    if (!description.trim()) {
      setDescriptionError('Please enter a description.');
      hasError = true;
    }
    if (!type) {
      setTypeError('Please select a transaction type (Debit or Credit).');
      hasError = true;
    }
    if (!account) {
      setAccountError('Please select an account.');
      hasError = true;
    }

    if (hasError) return;

    try {
      if (transactionToEdit) {
        await updateTransaction(transactionToEdit.id, Number(amount), description, date, type!, account!);
      } else {
        await addTransaction(Number(amount), description, date, type!, account!);
      }
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save transaction.');
    }
  };

  const handleDelete = () => {
    if (transactionToEdit) {
      Alert.alert(
        "Delete Transaction",
        "Are you sure you want to delete this transaction? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteTransaction(transactionToEdit.id);
                onClose();
              } catch (e: any) {
                Alert.alert('Error', e.message || 'Failed to delete transaction.');
              }
            }
          }
        ]
      );
    }
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.modalContent, { backgroundColor: colors.background, paddingBottom: Math.max(24, insets.bottom + 16) }]}
          >
            <View style={styles.header}>
              <AppText style={[styles.title, { color: colors.text }]}>
                {transactionToEdit ? 'Edit Transaction' : 'Add Transaction'}
              </AppText>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrapper}>
              <AppText style={styles.label}>Type</AppText>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={[styles.typeButton, { borderColor: type === 'Debit' ? '#ff4444' : colors.border, backgroundColor: type === 'Debit' ? '#ff4444' : 'transparent' }]}
                  onPress={() => { setType('Debit'); setTypeError(''); }}
                >
                  <AppText style={{ color: type === 'Debit' ? '#fff' : colors.text, fontWeight: '600' }}>Debit (-)</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, { borderColor: type === 'Credit' ? '#00C851' : colors.border, backgroundColor: type === 'Credit' ? '#00C851' : 'transparent' }]}
                  onPress={() => { setType('Credit'); setTypeError(''); }}
                >
                  <AppText style={{ color: type === 'Credit' ? '#fff' : colors.text, fontWeight: '600' }}>Credit (+)</AppText>
                </TouchableOpacity>
              </View>
              {typeError ? <AppText style={styles.fieldErrorText}>{typeError}</AppText> : null}
            </View>

            <View style={styles.inputWrapper}>
              <AppText style={styles.label}>Amount</AppText>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="0.00"
                placeholderTextColor={placeholderColor}
                keyboardType="numeric"
                value={amount}
                onChangeText={(text) => { setAmount(text); setAmountError(''); }}
              />
              {amountError ? <AppText style={styles.fieldErrorText}>{amountError}</AppText> : null}
            </View>

            <View style={styles.inputWrapper}>
              <AppText style={styles.label}>Description</AppText>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="Description"
                placeholderTextColor={placeholderColor}
                value={description}
                onChangeText={(text) => { setDescription(text); setDescriptionError(''); }}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              {descriptionError ? <AppText style={styles.fieldErrorText}>{descriptionError}</AppText> : null}
            </View>

            <View style={styles.inputWrapper}>
              <AppText style={styles.label}>Date</AppText>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <AppText style={{ color: colors.text, fontSize: 16 }}>{date.toLocaleDateString()}</AppText>
                <Ionicons name="calendar-outline" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Only show Account selector if there is no initialAccount locked in */}
            {!initialAccount && (
              <View style={styles.inputWrapper}>
                <AppText style={styles.label}>Account</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                  {accounts.map((acc) => (
                    <TouchableOpacity
                      key={acc}
                      style={[
                        styles.categoryChip,
                        { backgroundColor: account === acc ? colors.primary : colors.surface }
                      ]}
                      onPress={() => { setAccount(acc); setAccountError(''); }}
                    >
                      <Ionicons name="card-outline" size={16} color={account === acc ? '#fff' : colors.text} style={{ marginRight: 6 }} />
                      <AppText style={{ color: account === acc ? '#fff' : colors.text, fontWeight: '600' }}>{acc}</AppText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {accountError ? <AppText style={styles.fieldErrorText}>{accountError}</AppText> : null}
              </View>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onChangeDate}
              />
            )}

            <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <AppText style={styles.saveButtonText}>
                {transactionToEdit ? 'Update Transaction' : 'Save Transaction'}
              </AppText>
            </TouchableOpacity>

            {transactionToEdit && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={20} color="#ff4444" style={{ marginRight: 8 }} />
                <AppText style={styles.deleteButtonText}>Delete Transaction</AppText>
              </TouchableOpacity>
            )}

          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  fieldErrorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    marginLeft: 4,
    fontWeight: '600',
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    paddingBottom: 12,
  },
  dateButton: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeButton: {
    flex: 1,
    height: 48,
    borderWidth: 2,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryScroll: {
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
  },
  saveButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ff4444',
    backgroundColor: 'transparent',
  },
  deleteButtonText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
