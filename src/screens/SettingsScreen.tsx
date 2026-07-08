import React, { useState } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import AppText from '../components/AppText';
import { useThemeContext, ACCENT_COLORS } from '../context/ThemeContext';
import { useAuthContext } from '../context/AuthContext';
import ImportSheetModal from '../components/ImportSheetModal';
import ImportTransactionalSheetModal from '../components/ImportTransactionalSheetModal';
import { useExpenseContext } from '../context/ExpenseContext';
import { useTransactionContext } from '../context/TransactionContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

export default function SettingsScreen({ navigation }: any) {
  const colors = useThemeColors();
  const { isDarkTheme, toggleTheme, refreshTheme, accentColor, setAccentColor } = useThemeContext();
  const { logout, refreshAuth, user } = useAuthContext();
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [isImportTxModalVisible, setIsImportTxModalVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAccentExpanded, setIsAccentExpanded] = useState(false);
  const [isTotalBalanceExpanded, setIsTotalBalanceExpanded] = useState(false);
  const { currency, refreshExpenseData, downloadPathUri, updateDownloadPath, backupPathUri, updateBackupPath, analyticsChartType } = useExpenseContext();
  const { accounts, excludedFromTotal, toggleAccountInTotal } = useTransactionContext();

  const handleSetDownloadPath = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Unsupported', 'Setting a default download path is only available on Android devices due to system limitations.');
      return;
    }

    try {
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        await updateDownloadPath(permissions.directoryUri);
        Alert.alert('Success', 'Download path set successfully! Future PDF reports will be saved here automatically.');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Failed to set download path: ' + e.message);
    }
  };

  const handleSetBackupPath = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Unsupported', 'Setting a default backup path is only available on Android devices due to system limitations.');
      return;
    }

    try {
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        await updateBackupPath(permissions.directoryUri);
        Alert.alert('Success', 'Backup path set successfully! Future backups will be saved here automatically (keeping the last 5).');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Failed to set backup path: ' + e.message);
    }
  };

  const handleBackup = async () => {
    try {
      setIsProcessing(true);
      const keys = await AsyncStorage.getAllKeys();
      const stores = await AsyncStorage.multiGet(keys);
      const backupData = Object.fromEntries(stores);
      const backupString = JSON.stringify(backupData);

      if (backupPathUri && Platform.OS === 'android') {
        const timestamp = new Date().getTime();
        const filename = `DailyAccountsBackup_${timestamp}.json`;

        // Create the new backup file
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(backupPathUri, filename, 'application/json');
        await FileSystem.writeAsStringAsync(fileUri, backupString, { encoding: FileSystem.EncodingType.UTF8 });

        // Manage old backups
        const allFiles = await FileSystem.StorageAccessFramework.readDirectoryAsync(backupPathUri);

        // Filter files that contain 'DailyAccountsBackup_' and end with '.json'
        const backupFiles = allFiles.filter(uri => {
          const decoded = decodeURIComponent(uri);
          return decoded.includes('DailyAccountsBackup_') && decoded.endsWith('.json');
        });

        // Sort ascending by timestamp
        backupFiles.sort((a, b) => {
          const getTimestamp = (uri: string) => {
            const match = decodeURIComponent(uri).match(/DailyAccountsBackup_(\d+)\.json/);
            return match ? parseInt(match[1], 10) : 0;
          };
          return getTimestamp(a) - getTimestamp(b);
        });

        // Keep only 5 backups
        const maxBackups = 5;
        if (backupFiles.length > maxBackups) {
          const filesToDelete = backupFiles.slice(0, backupFiles.length - maxBackups);
          for (const fileToDelete of filesToDelete) {
            await FileSystem.StorageAccessFramework.deleteAsync(fileToDelete);
          }
        }

        Alert.alert('Success', 'Backup saved successfully to your chosen folder.');
      } else {
        const timestamp = new Date().getTime();
        const fileUri = FileSystem.documentDirectory + `DailyAccountsBackup_${timestamp}.json`;
        await FileSystem.writeAsStringAsync(fileUri, backupString);

        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Save Backup' });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (e: any) {
      Alert.alert('Error', 'Backup failed: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsProcessing(true);
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });

      if (result.canceled) {
        setIsProcessing(false);
        return;
      }

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const parsedData = JSON.parse(fileContent);

      if (typeof parsedData !== 'object' || parsedData === null) {
        throw new Error('Invalid backup file format');
      }

      // Convert object back to array of pairs
      const kvPairs: [string, string][] = Object.entries(parsedData).map(([k, v]) => [k, String(v)]);

      // Clear existing and set new
      await AsyncStorage.clear();
      await AsyncStorage.multiSet(kvPairs);

      // Reload all contexts
      await refreshAuth();
      await refreshTheme();
      await refreshExpenseData();

      alert('Restore Successful! Your data has been loaded instantly.');
    } catch (e: any) {
      alert('Restore failed: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>

      <View style={[styles.group, { backgroundColor: colors.card }]}>
        <AppText style={[styles.sectionTitle, { color: colors.text }]}>Profile</AppText>
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="person-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User Profile'}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.group, { backgroundColor: colors.card }]}>
        <AppText style={[styles.sectionTitle, { color: colors.text }]}>Appearance</AppText>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="moon-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Dark Mode</AppText>
          </View>
          <Switch
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor={isDarkTheme ? '#ffffff' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleTheme}
            value={isDarkTheme}
          />
        </View>

        <View style={styles.divider} />

        <View style={{ padding: 16 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: isAccentExpanded ? 16 : 0 }}
            onPress={() => setIsAccentExpanded(!isAccentExpanded)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="color-palette-outline" size={22} color={colors.primary} style={styles.icon} />
              <AppText style={[styles.text, { color: colors.text }]}>Accent Color</AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {!isAccentExpanded && (
                <View style={[styles.colorSwatch, { width: 24, height: 24, borderRadius: 12, marginRight: 8, backgroundColor: accentColor }]} />
              )}
              <Ionicons name={isAccentExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.text} />
            </View>
          </TouchableOpacity>

          {isAccentExpanded && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {ACCENT_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setAccentColor(color)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color, marginRight: 0 },
                    accentColor === color && { borderWidth: 3, borderColor: colors.text }
                  ]}
                >
                  {accentColor === color && (
                    <Ionicons name="checkmark" size={16} color="#FFF" style={{ textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={[styles.group, { backgroundColor: colors.card }]}>
        <AppText style={[styles.sectionTitle, { color: colors.text }]}>Preferences</AppText>
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('Currency')}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="cash-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Currency</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppText style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold', marginRight: 8 }}>{currency}</AppText>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </View>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('Budget')}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="wallet-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Budget</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('Categories')}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="pricetag-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Manage Categories</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('AnalyticsChartSettings')}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="bar-chart-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Analytics Chart</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppText style={{ color: colors.text, fontSize: 14, marginRight: 8, opacity: 0.7 }}>{analyticsChartType}</AppText>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </View>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('PaymentModes')}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="card-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Payment Modes</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => setIsTotalBalanceExpanded(!isTotalBalanceExpanded)}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="calculator-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Include in Total Balance</AppText>
          </View>
          <Ionicons name={isTotalBalanceExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.text} />
        </TouchableOpacity>
        
        {isTotalBalanceExpanded && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <AppText style={{ color: colors.textMuted, fontSize: 13, marginBottom: 12 }}>
              Select which accounts should be included in the Total Balance card on the Home screen.
            </AppText>
            {accounts.map(acc => {
              const isIncluded = !excludedFromTotal.includes(acc);
              return (
                <View key={acc} style={[styles.row, { paddingVertical: 8, paddingHorizontal: 0 }]}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="card-outline" size={20} color={colors.text} style={styles.icon} />
                    <AppText style={[styles.text, { color: colors.text }]}>{acc}</AppText>
                  </View>
                  <Switch
                    value={isIncluded}
                    onValueChange={() => toggleAccountInTotal(acc)}
                    trackColor={{ false: '#767577', true: colors.primary }}
                    thumbColor={isIncluded ? '#fff' : '#f4f3f4'}
                  />
                </View>
              );
            })}
            {accounts.length === 0 && (
              <AppText style={{ color: colors.textMuted, fontStyle: 'italic', marginTop: 8 }}>No accounts available.</AppText>
            )}
          </View>
        )}
      </View>

      <View style={[styles.group, { backgroundColor: colors.card }]}>
        <AppText style={[styles.sectionTitle, { color: colors.text }]}>Data Management</AppText>
        <TouchableOpacity
          style={styles.row}
          onPress={() => setIsImportModalVisible(true)}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="document-text-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Import from Google Sheets</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => setIsImportTxModalVisible(true)}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="layers-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Import Transactional Data</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={[styles.row, { opacity: isProcessing ? 0.5 : 1 }]}
          onPress={handleBackup}
          disabled={isProcessing}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="save-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Backup Data</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={[styles.row, { opacity: isProcessing ? 0.5 : 1 }]}
          onPress={() => {
            Alert.alert(
              "Restore Data",
              "WARNING: This will completely overwrite all current expenses, categories, settings, and profile data with the backup file. This cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Proceed", style: "destructive", onPress: handleRestore }
              ]
            );
          }}
          disabled={isProcessing}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="cloud-download-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Restore Data</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
        {Platform.OS === 'android' && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.row}
              onPress={handleSetDownloadPath}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="folder-outline" size={22} color={colors.primary} style={styles.icon} />
                <AppText style={[styles.text, { color: colors.text }]}>Download Path</AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end', marginLeft: 20 }}>
                <AppText style={{ color: colors.primary, fontSize: 12, marginRight: 8, flexShrink: 1 }} numberOfLines={1} ellipsizeMode="middle">
                  {downloadPathUri ? decodeURIComponent(downloadPathUri.split('%3A').pop() || 'Custom Path') : 'Not Set'}
                </AppText>
                {downloadPathUri ? (
                  <TouchableOpacity onPress={() => updateDownloadPath(null)} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={20} color="#ff4444" />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={colors.text} />
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.row}
              onPress={handleSetBackupPath}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="folder-outline" size={22} color={colors.primary} style={styles.icon} />
                <AppText style={[styles.text, { color: colors.text }]}>Backup Path</AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end', marginLeft: 20 }}>
                <AppText style={{ color: colors.primary, fontSize: 12, marginRight: 8, flexShrink: 1 }} numberOfLines={1} ellipsizeMode="middle">
                  {backupPathUri ? decodeURIComponent(backupPathUri.split('%3A').pop() || 'Custom Path') : 'Not Set'}
                </AppText>
                {backupPathUri ? (
                  <TouchableOpacity onPress={() => updateBackupPath(null)} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={20} color="#ff4444" />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={colors.text} />
                )}
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: '#ff4444', marginTop: 10 }]}
        onPress={logout}
      >
        <AppText style={styles.logoutText}>Log Out</AppText>
      </TouchableOpacity>

      <ImportSheetModal
        visible={isImportModalVisible}
        onClose={() => setIsImportModalVisible(false)}
      />
      
      <ImportTransactionalSheetModal
        visible={isImportTxModalVisible}
        onClose={() => setIsImportTxModalVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  group: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 52,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 16,
    width: 24,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#888',
    opacity: 0.3,
    marginLeft: 54,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
    marginTop: 15,
    marginBottom: 5,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

