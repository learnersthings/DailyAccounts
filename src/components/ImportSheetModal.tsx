import React, { useState } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, TextInput, TouchableOpacity, StyleSheet, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ActivityIndicator, Alert } from 'react-native';
import AppText from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../context/ThemeContext';
import { useExpenseContext, Expense, Category, PaymentMode } from '../context/ExpenseContext';
import { Ionicons } from '@expo/vector-icons';
import Papa from 'papaparse';

interface ImportSheetModalProps {
  visible: boolean;
  onClose: () => void;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const PRESET_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#E91E63', '#673AB7', '#00BCD4', '#009688', '#8BC34A', '#FFC107', '#795548'];
const PRESET_ICONS = ['pricetag', 'bag', 'card', 'cash', 'cart', 'folder', 'star', 'albums'];

export default function ImportSheetModal({ visible, onClose }: ImportSheetModalProps) {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();
  const { bulkImport, categories, paymentModes } = useExpenseContext();
  const insets = useSafeAreaInsets();

  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const getRandomItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

  const handleImport = async () => {
    setError('');
    setIsLoading(true);
    setProgress('Extracting Sheet ID...');

    // Extract Sheet ID
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = match ? match[1] : null;

    if (!sheetId) {
      setError('Invalid Google Sheet URL. Please ensure it is a valid link.');
      setIsLoading(false);
      return;
    }

    try {
      const newExpenses: Expense[] = [];
      const newCategories: Category[] = [];
      const newPaymentModes: PaymentMode[] = [];

      const existingCatNames = categories.map(c => c.name.toLowerCase());
      const existingModeNames = paymentModes.map(m => m.name.toLowerCase());

      for (const month of MONTHS) {
        setProgress(`Fetching ${month}...`);
        const fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${month}`;

        const response = await fetch(fetchUrl);
        if (!response.ok) {
          console.log(`Failed to fetch ${month}, skipping.`);
          continue;
        }

        const csvText = await response.text();

        // If the sheet doesn't exist or is not public, it might return HTML (login page) or error text
        if (csvText.includes('<html') || csvText.trim() === '') {
          continue;
        }

        const parsed = Papa.parse(csvText, { header: false, skipEmptyLines: true });
        const rows: any[] = parsed.data;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];

          // Skip header row
          if (i === 0 && String(row[0]).toLowerCase().includes('date')) continue;

          // Skip empty rows or total rows
          if (!row[0] || String(row[0]).toLowerCase().includes('total')) continue;

          const dateStr = String(row[0]).trim();
          const amountStr = String(row[1]).replace(/,/g, '').trim();
          const descStr = String(row[2] || '').trim();
          const catStr = String(row[3] || '').trim();
          const modeStr = String(row[4] || '').trim();

          const amount = parseFloat(amountStr);
          if (isNaN(amount) || amount === 0) continue; // Skip invalid or zero amounts

          // Parse date DD-MM-YY or DD-MM-YYYY
          const dateParts = dateStr.split('-');
          let parsedDate = new Date();
          if (dateParts.length === 3) {
            const day = parseInt(dateParts[0], 10);
            const monthIndex = parseInt(dateParts[1], 10) - 1;
            let year = parseInt(dateParts[2], 10);
            if (year < 100) year += 2000;
            // Add 'i' seconds to the date so that rows further down the sheet on the same day 
            // get slightly later timestamps, resulting in a descending order in the UI.
            parsedDate = new Date(year, monthIndex, day, 0, 0, i);
          }

          let catId: string | undefined = undefined;
          if (catStr) {
            const existingCat = categories.find(c => c.name.toLowerCase() === catStr.toLowerCase())
              || newCategories.find(c => c.name.toLowerCase() === catStr.toLowerCase());

            if (existingCat) {
              catId = existingCat.id;
            } else {
              catId = 'cat_' + Date.now().toString() + Math.random().toString();
              newCategories.push({
                id: catId,
                name: catStr,
                icon: getRandomItem(PRESET_ICONS),
                color: getRandomItem(PRESET_COLORS)
              });
            }
          }

          let modeId: string | undefined = undefined;
          if (modeStr) {
            const existingMode = paymentModes.find(m => m.name.toLowerCase() === modeStr.toLowerCase())
              || newPaymentModes.find(m => m.name.toLowerCase() === modeStr.toLowerCase());

            if (existingMode) {
              modeId = existingMode.id;
            } else {
              modeId = 'mode_' + Date.now().toString() + Math.random().toString();
              newPaymentModes.push({
                id: modeId,
                name: modeStr,
                icon: getRandomItem(PRESET_ICONS),
                color: getRandomItem(PRESET_COLORS)
              });
            }
          }

          newExpenses.push({
            id: 'exp_' + Date.now().toString() + Math.random().toString(),
            amount,
            description: descStr,
            date: parsedDate.toISOString(),
            categoryId: catId,
            paymentModeId: modeId
          });
        }
      }

      if (newExpenses.length === 0) {
        setError('No valid data found. Ensure the sheet is public and formatted correctly.');
        setIsLoading(false);
        return;
      }

      setProgress('Saving to storage...');
      await bulkImport(newExpenses, newCategories, newPaymentModes);

      setIsLoading(false);
      Alert.alert(
        "Import Successful",
        `Imported ${newExpenses.length} expenses, ${newCategories.length} new categories, and ${newPaymentModes.length} new payment modes.`,
        [{ text: "OK", onPress: onClose }]
      );

    } catch (e: any) {
      setError(e.message || 'An error occurred during import.');
      setIsLoading(false);
    }
  };

  const placeholderColor = colors.textMuted;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.modalContent, { backgroundColor: colors.background, paddingBottom: Math.max(24, insets.bottom + 16) }]}
          >
            <View style={styles.header}>
              <AppText style={[styles.title, { color: colors.text }]}>Import from Google Sheets</AppText>
              <TouchableOpacity onPress={!isLoading ? onClose : undefined}>
                <Ionicons name="close" size={24} color={!isLoading ? colors.text : '#888'} />
              </TouchableOpacity>
            </View>

            <AppText style={styles.instructions}>
              Please paste the link to your Google Sheet below. Ensure the sheet is set to "Anyone with the link can view". The app will read tabs named after months.
            </AppText>

            {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

            <View style={styles.inputWrapper}>
              <AppText style={styles.label}>Google Sheet URL</AppText>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="Google Sheet URL"
                  placeholderTextColor={placeholderColor}
                  value={url}
                  onChangeText={(text) => { setUrl(text); setError(''); }}
                  editable={!isLoading}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {url.length > 0 && !isLoading && (
                  <TouchableOpacity style={styles.clearIcon} onPress={() => { setUrl(''); setError(''); }}>
                    <Ionicons name="close-circle" size={20} color={placeholderColor} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <AppText style={[styles.progressText, { color: colors.primary }]}>{progress}</AppText>
              </View>
            ) : (
              <TouchableOpacity style={[styles.importButton, { backgroundColor: colors.primary }]} onPress={handleImport}>
                <AppText style={styles.importButtonText}>Import Data</AppText>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  instructions: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorText: {
    color: '#ff4444',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  inputWrapper: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    marginLeft: 4,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 40,
    fontSize: 16,
  },
  clearIcon: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  importButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  progressText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
});

