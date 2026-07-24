import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { ExpenseProvider } from './src/context/ExpenseContext';
import { TransactionProvider } from './src/context/TransactionContext';
import RootNavigator from './src/navigation/RootNavigator';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let BackgroundFetch: any = null;
let TaskManager: any = null;
let Notifications: any = null;

if (!isExpoGo) {
  try {
    BackgroundFetch = require('expo-background-fetch');
    TaskManager = require('expo-task-manager');
    Notifications = require('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.log('Skipping background/notification setup in Expo Go', e);
  }
}

const BACKGROUND_BACKUP_TASK = 'BACKGROUND_BACKUP_TASK';

if (!isExpoGo && TaskManager && BackgroundFetch) {
  TaskManager.defineTask(BACKGROUND_BACKUP_TASK, async () => {
  try {
    const userCredentialsStr = await AsyncStorage.getItem('@app_user_credentials');
    let userEmail = '';
    if (userCredentialsStr) {
      try {
        const user = JSON.parse(userCredentialsStr);
        if (user && user.email) {
          userEmail = user.email;
        }
      } catch (e) {}
    }

    const backupPathKey = userEmail ? `@app_backup_path_${userEmail}` : '@app_backup_path';
    const backupPathUri = await AsyncStorage.getItem(backupPathKey);
    
    if (!backupPathUri || Platform.OS !== 'android') {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const last9amKey = userEmail ? `@last_backup_9am_${userEmail}` : '@last_backup_9am';
    const last9pmKey = userEmail ? `@last_backup_9pm_${userEmail}` : '@last_backup_9pm';
    const lastReminderKey = userEmail ? `@last_expense_reminder_${userEmail}` : '@last_expense_reminder';
    const lastSummaryKey = userEmail ? `@last_monthly_summary_${userEmail}` : '@last_monthly_summary';
    const expensesKey = userEmail ? `@app_expenses_${userEmail}` : '@app_expenses';

    const last9AM = await AsyncStorage.getItem(last9amKey);
    const last9PM = await AsyncStorage.getItem(last9pmKey);

    const now = new Date();
    const todayStr = now.toDateString();
    const hour = now.getHours();

    let shouldBackup = false;
    let backupType = '';
    let backupTypeKey = '';

    if (hour >= 9 && hour < 21) {
      if (last9AM !== todayStr) {
        shouldBackup = true;
        backupType = 'Morning';
        backupTypeKey = last9amKey;
      }
    } else if (hour >= 21) {
      if (last9PM !== todayStr) {
        shouldBackup = true;
        backupType = 'Evening';
        backupTypeKey = last9pmKey;
      }
    } else if (hour < 9) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      if (last9PM !== yesterdayStr) {
        shouldBackup = true;
        backupType = 'Evening';
        backupTypeKey = last9pmKey;
      }
    }

    const lastReminder = await AsyncStorage.getItem(lastReminderKey);
    let reminderSent = false;
    if (hour >= 18) {
      if (lastReminder !== todayStr) {
        const expensesStr = await AsyncStorage.getItem(expensesKey);
        let hasTodayExpense = false;
        if (expensesStr) {
          try {
            const expenses = JSON.parse(expensesStr);
            hasTodayExpense = expenses.some((e: any) => new Date(e.date).toDateString() === todayStr);
          } catch (e) {}
        }
        if (!hasTodayExpense) {
          if (Notifications) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Daily Reminder",
                body: "You haven't logged any expenses today. Don't forget to track your spending!",
              },
              trigger: null,
            });
          }
          await AsyncStorage.setItem(lastReminderKey, todayStr);
          reminderSent = true;
        }
      }
    }

    if (now.getDate() === 1) {
      const monthIdentifier = `${now.getMonth()}-${now.getFullYear()}`;
      const lastMonthlySummary = await AsyncStorage.getItem(lastSummaryKey);
      
      if (lastMonthlySummary !== monthIdentifier) {
        const expensesStr = await AsyncStorage.getItem(expensesKey);
        if (expensesStr) {
          try {
            const expenses = JSON.parse(expensesStr);
            const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const prevMonth = prevMonthDate.getMonth();
            const prevYear = prevMonthDate.getFullYear();
            
            const prevMonthExpenses = expenses.filter((e: any) => {
              const d = new Date(e.date);
              return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
            });
            
            const total = prevMonthExpenses.reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0);
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const monthName = monthNames[prevMonthDate.getMonth()];
            const currencyKey = userEmail ? `@app_currency_${userEmail}` : '@app_currency';
            const userCurrency = await AsyncStorage.getItem(currencyKey) || '₹';
            
            if (Notifications) {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "Monthly Summary 📊",
                  body: `Your total expense for ${monthName} was ${userCurrency}${total}.`,
                },
                trigger: null,
              });
            }
            await AsyncStorage.setItem(lastSummaryKey, monthIdentifier);
            reminderSent = true;
          } catch (e) {}
        }
      }
    }

    if (!shouldBackup) {
      return reminderSent ? BackgroundFetch.BackgroundFetchResult.NewData : BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const keys = await AsyncStorage.getAllKeys();
    const stores = await AsyncStorage.multiGet(keys);
    const backupData = Object.fromEntries(stores);
    const backupString = JSON.stringify(backupData);

    const timestamp = new Date().getTime();
    const filename = `DailyAccountsBackup_${timestamp}.json`;

    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(backupPathUri, filename, 'application/json');
    await FileSystem.writeAsStringAsync(fileUri, backupString, { encoding: FileSystem.EncodingType.UTF8 });

    const allFiles = await FileSystem.StorageAccessFramework.readDirectoryAsync(backupPathUri);
    const backupFiles = allFiles.filter((uri: string) => {
      const decoded = decodeURIComponent(uri);
      return decoded.includes('DailyAccountsBackup_') && decoded.endsWith('.json');
    });

    backupFiles.sort((a: string, b: string) => {
      const getTimestamp = (uri: string) => {
        const match = decodeURIComponent(uri).match(/DailyAccountsBackup_(\d+)\.json/);
        return match ? parseInt(match[1], 10) : 0;
      };
      return getTimestamp(a) - getTimestamp(b);
    });

    const maxBackups = 14;
    if (backupFiles.length > maxBackups) {
      const filesToDelete = backupFiles.slice(0, backupFiles.length - maxBackups);
      for (const fileToDelete of filesToDelete) {
        await FileSystem.StorageAccessFramework.deleteAsync(fileToDelete);
      }
    }

    if (backupType === 'Evening' && hour < 9) {
       const yesterday = new Date(now);
       yesterday.setDate(yesterday.getDate() - 1);
       await AsyncStorage.setItem(backupTypeKey, yesterday.toDateString());
    } else {
       await AsyncStorage.setItem(backupTypeKey, todayStr);
    }

    if (Notifications) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Backup Complete",
          body: `Daily auto-backup (${backupType}) was successful.`,
        },
        trigger: null,
      });
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err: any) {
    if (Notifications) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Backup Failed",
          body: `Auto-backup encountered an error: ${err.message}`,
        },
        trigger: null,
      });
    }
    return BackgroundFetch ? BackgroundFetch.BackgroundFetchResult.Failed : 2;
  }
});
}

async function registerBackgroundFetchAsync() {
  if (!isExpoGo && BackgroundFetch) {
    return BackgroundFetch.registerTaskAsync(BACKGROUND_BACKUP_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
}SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  React.useEffect(() => {
    if (!isExpoGo && Notifications) {
      Notifications.requestPermissionsAsync().catch(console.error);
    }
    registerBackgroundFetchAsync().catch(console.error);
  }, []);

  if (!fontsLoaded) {
    return null;
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ExpenseProvider>
          <TransactionProvider>
            <ThemeProvider>
              <RootNavigator />
            </ThemeProvider>
          </TransactionProvider>
        </ExpenseProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
