import React, { useState } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, TextInput, TouchableOpacity, StyleSheet, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ActivityIndicator, Alert, ScrollView } from 'react-native';
import AppText from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../context/ThemeContext';
import { useTransactionContext, AccountTransaction } from '../context/TransactionContext';
import { Ionicons } from '@expo/vector-icons';
import Papa from 'papaparse';

interface ImportTransactionalSheetModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ImportTransactionalSheetModal({ visible, onClose }: ImportTransactionalSheetModalProps) {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();
  const { bulkImportTransactions } = useTransactionContext();
  const insets = useSafeAreaInsets();

  const [url, setUrl] = useState('');
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [selectedTabs, setSelectedTabs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<1 | 2>(1); // 1 = Fetch Tabs, 2 = Select & Import

  const toggleTab = (tab: string) => {
    if (selectedTabs.includes(tab)) {
      setSelectedTabs(selectedTabs.filter(t => t !== tab));
    } else {
      setSelectedTabs([...selectedTabs, tab]);
    }
  };

  const handleFetchTabs = async () => {
    setError('');
    setIsLoading(true);
    setProgress('Fetching tabs...');

    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = match ? match[1] : null;

    if (!sheetId) {
      setError('Invalid Google Sheet URL. Please ensure it is a valid link.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(url);
      const html = await response.text();
      
      const tabRegex = /<div class="goog-inline-block docs-sheet-tab-caption">([^<]+)<\/div>/g;
      const tabs = [];
      let matchArr;
      while ((matchArr = tabRegex.exec(html)) !== null) {
        tabs.push(matchArr[1]);
      }

      const uniqueTabs = Array.from(new Set(tabs));

      if (uniqueTabs.length === 0) {
        setError('Could not find any tabs. Ensure the link is correct and accessible.');
        setIsLoading(false);
        return;
      }

      setAvailableTabs(uniqueTabs);
      setSelectedTabs(uniqueTabs); // Select all by default
      setStep(2);
      setIsLoading(false);

    } catch (e: any) {
      setError(e.message || 'Failed to fetch the sheet.');
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    setError('');
    setIsLoading(true);
    setProgress('Extracting Sheet ID...');

    if (selectedTabs.length === 0) {
      setError('Please select at least one tab to import.');
      setIsLoading(false);
      return;
    }

    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = match ? match[1] : null;

    if (!sheetId) {
      setError('Invalid Google Sheet URL.');
      setIsLoading(false);
      return;
    }

    try {
      const newTransactions: AccountTransaction[] = [];

      for (const tab of selectedTabs) {
        setProgress(`Fetching ${tab}...`);
        const fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${tab}`;

        const response = await fetch(fetchUrl);
        if (!response.ok) {
          console.log(`Failed to fetch ${tab}, skipping.`);
          continue;
        }

        const csvText = await response.text();
        if (csvText.includes('<html') || csvText.trim() === '') {
          continue;
        }

        const parsed = Papa.parse(csvText, { header: false, skipEmptyLines: true });
        const rows: any[] = parsed.data;

        let lastValidDateStr = '';

        for (let i = 0; i < rows.length; i++) {
          // Skip first row and last row
          if (i === 0 || i === rows.length - 1) continue;

          const row = rows[i];
          let dateStr = String(row[0] || '').trim();
          const descStr = String(row[1] || '').trim();
          const debitStr = String(row[2] || '').replace(/,/g, '').trim();
          const creditStr = String(row[3] || '').replace(/,/g, '').trim();

          if (dateStr) {
            lastValidDateStr = dateStr;
          } else {
            dateStr = lastValidDateStr;
          }

          // Skip if description or date is blank
          if (!descStr || !dateStr) continue;

          const debitAmount = parseFloat(debitStr) || 0;
          const creditAmount = parseFloat(creditStr) || 0;

          const dateParts = dateStr.split('-');
          let parsedDate = new Date();
          if (dateParts.length === 3) {
            const day = parseInt(dateParts[0], 10);
            const monthIndex = parseInt(dateParts[1], 10) - 1;
            let year = parseInt(dateParts[2], 10);
            if (year < 100) year += 2000;
            parsedDate = new Date(year, monthIndex, day, 0, 0, i);
          } else {
             parsedDate = new Date(dateStr);
             if (isNaN(parsedDate.getTime())) {
               parsedDate = new Date();
             }
          }

          if (debitAmount === 0 && creditAmount === 0) {
            newTransactions.push({
              id: 'tx_0_' + Date.now().toString() + Math.random().toString(),
              amount: 0,
              description: descStr,
              date: parsedDate.toISOString(),
              type: 'Debit',
              account: tab
            });
          } else {
            if (debitAmount > 0) {
              newTransactions.push({
                id: 'tx_d_' + Date.now().toString() + Math.random().toString(),
                amount: debitAmount,
                description: descStr,
                date: parsedDate.toISOString(),
                type: 'Debit',
                account: tab
              });
            }
            
            if (creditAmount > 0) {
              newTransactions.push({
                id: 'tx_c_' + Date.now().toString() + Math.random().toString(),
                amount: creditAmount,
                description: descStr,
                date: parsedDate.toISOString(),
                type: 'Credit',
                account: tab
              });
            }
          }
        }
      }

      if (newTransactions.length === 0) {
        setError('No valid transactional data found in the selected tabs.');
        setIsLoading(false);
        return;
      }

      setProgress('Saving to storage...');
      await bulkImportTransactions(newTransactions);

      setIsLoading(false);
      Alert.alert(
        "Import Successful",
        `Imported ${newTransactions.length} transactions across accounts.`,
        [{ text: "OK", onPress: () => {
          setStep(1);
          setAvailableTabs([]);
          onClose();
        }}]
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
              <AppText style={[styles.title, { color: colors.text }]}>Import Transactional Data</AppText>
              <TouchableOpacity onPress={!isLoading ? onClose : undefined}>
                <Ionicons name="close" size={24} color={!isLoading ? colors.text : '#888'} />
              </TouchableOpacity>
            </View>

            {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

            {step === 1 ? (
              <>
                <AppText style={styles.instructions}>
                  Paste your Google Sheet link to read available tabs.
                </AppText>

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
                  <TouchableOpacity style={[styles.importButton, { backgroundColor: colors.primary }]} onPress={handleFetchTabs}>
                    <AppText style={styles.importButtonText}>Read Tabs</AppText>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <AppText style={styles.instructions}>
                  Select the tabs you want to import. A card will be created for each selected tab.
                </AppText>

                <View style={styles.inputWrapper}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                    {availableTabs.map(tab => {
                      const isSelected = selectedTabs.includes(tab);
                      return (
                        <TouchableOpacity
                          key={tab}
                          style={[
                            styles.tabChip,
                            { 
                              backgroundColor: isSelected ? colors.primary : colors.surface,
                              borderColor: isSelected ? colors.primary : colors.border
                            }
                          ]}
                          onPress={() => toggleTab(tab)}
                          disabled={isLoading}
                        >
                          <Ionicons 
                            name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                            size={18} 
                            color={isSelected ? '#fff' : colors.text} 
                            style={{ marginRight: 6 }} 
                          />
                          <AppText style={{ color: isSelected ? '#fff' : colors.text, fontWeight: '600' }}>
                            {tab}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity 
                    style={[styles.importButton, { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} 
                    onPress={() => { setStep(1); setError(''); }}
                    disabled={isLoading}
                  >
                    <AppText style={[styles.importButtonText, { color: colors.text }]}>Back</AppText>
                  </TouchableOpacity>

                  {isLoading ? (
                    <View style={[styles.loadingContainer, { flex: 1, paddingVertical: 0 }]}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <AppText style={[styles.progressText, { color: colors.primary, fontSize: 14, marginTop: 4 }]}>{progress}</AppText>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={[styles.importButton, { flex: 2, backgroundColor: colors.primary }]} 
                      onPress={handleImport}
                    >
                      <AppText style={styles.importButtonText}>Import</AppText>
                    </TouchableOpacity>
                  )}
                </View>
              </>
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
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  importButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
