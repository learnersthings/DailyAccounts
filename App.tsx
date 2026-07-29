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
import { Platform, AppState } from 'react-native';

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

let isPerformingBackgroundTasks = false;

export const performBackgroundTasks = async () => {
  if (isPerformingBackgroundTasks) {
    return BackgroundFetch ? BackgroundFetch.BackgroundFetchResult.NoData : 1;
  }
  isPerformingBackgroundTasks = true;
  try {
    const userCredentialsStr = await AsyncStorage.getItem('@app_user_credentials');
    let userEmail = '';
    if (userCredentialsStr) {
      try {
        const user = JSON.parse(userCredentialsStr);
        if (user && user.email) {
          userEmail = user.email;
        }
      } catch (e) { }
    }

    const backupPathKey = userEmail ? `@app_backup_path_${userEmail}` : '@app_backup_path';
    const backupPathUri = await AsyncStorage.getItem(backupPathKey);

    let backupSkipped = false;
    if (!backupPathUri || Platform.OS !== 'android') {
      backupSkipped = true;
    }

    const last9amKey = userEmail ? `@last_backup_9am_${userEmail}` : '@last_backup_9am';
    const last9pmKey = userEmail ? `@last_backup_9pm_${userEmail}` : '@last_backup_9pm';
    const lastReminderKey = userEmail ? `@last_expense_reminder_${userEmail}` : '@last_expense_reminder';
    const lastSummaryKey = userEmail ? `@last_monthly_summary_${userEmail}` : '@last_monthly_summary';
    const lastPrevDaySummaryKey = userEmail ? `@last_prev_day_summary_${userEmail}` : '@last_prev_day_summary';
    const expensesKey = userEmail ? `@app_expenses_${userEmail}` : '@app_expenses';

    const last9AM = await AsyncStorage.getItem(last9amKey);
    const last9PM = await AsyncStorage.getItem(last9pmKey);

    const morningKey = userEmail ? `@app_auto_backup_time_morning_${userEmail}` : '@app_auto_backup_time_morning';
    const eveningKey = userEmail ? `@app_auto_backup_time_evening_${userEmail}` : '@app_auto_backup_time_evening';
    const morningTimeStr = await AsyncStorage.getItem(morningKey);
    const eveningTimeStr = await AsyncStorage.getItem(eveningKey);
    
    let morningTime = new Date();
    morningTime.setHours(9, 0, 0, 0);
    if (morningTimeStr) morningTime = new Date(morningTimeStr);

    let eveningTime = new Date();
    eveningTime.setHours(21, 0, 0, 0);
    if (eveningTimeStr) eveningTime = new Date(eveningTimeStr);

    const now = new Date();
    const todayStr = now.toDateString();
    
    const isPast = (target: Date) => now.getHours() > target.getHours() || (now.getHours() === target.getHours() && now.getMinutes() >= target.getMinutes());

    let shouldBackup = false;
    let backupType = '';
    let backupTypeKey = '';

    if (!backupSkipped) {
      if (isPast(morningTime) && !isPast(eveningTime)) {
        if (last9AM !== todayStr) {
          shouldBackup = true;
          backupType = 'Morning';
          backupTypeKey = last9amKey;
        }
      } else if (isPast(eveningTime)) {
        if (last9PM !== todayStr) {
          shouldBackup = true;
          backupType = 'Evening';
          backupTypeKey = last9pmKey;
        }
      } else if (!isPast(morningTime)) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();
        if (last9PM !== yesterdayStr) {
          shouldBackup = true;
          backupType = 'Evening';
          backupTypeKey = last9pmKey;
        }
      }
    }

    if (!shouldBackup) {
      return BackgroundFetch ? BackgroundFetch.BackgroundFetchResult.NoData : 1;
    }

    const keys = await AsyncStorage.getAllKeys();
    const stores = await AsyncStorage.multiGet(keys);
    const backupData = Object.fromEntries(stores);
    const backupString = JSON.stringify(backupData);

    const timestamp = new Date().getTime();
    const filename = `DailyAccountsBackup_${timestamp}.json`;

    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(backupPathUri!, filename, 'application/json');
    await FileSystem.writeAsStringAsync(fileUri, backupString, { encoding: FileSystem.EncodingType.UTF8 });

    const allFiles = await FileSystem.StorageAccessFramework.readDirectoryAsync(backupPathUri!);
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

    const maxBackups = 5;
    if (backupFiles.length > maxBackups) {
      const filesToDelete = backupFiles.slice(0, backupFiles.length - maxBackups);
      for (const fileToDelete of filesToDelete) {
        try {
          await FileSystem.StorageAccessFramework.deleteAsync(fileToDelete);
        } catch (e) {
          console.warn('Failed to delete old backup file:', e);
        }
      }
    }

    if (backupType === 'Evening' && !isPast(morningTime)) {
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

    return BackgroundFetch ? BackgroundFetch.BackgroundFetchResult.NewData : 1;
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
  } finally {
    isPerformingBackgroundTasks = false;
  }
};

if (!isExpoGo && TaskManager && BackgroundFetch) {
  TaskManager.defineTask(BACKGROUND_BACKUP_TASK, async () => {
    return await performBackgroundTasks();
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
} SplashScreen.preventAutoHideAsync();

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

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        performBackgroundTasks().catch(console.error);
      }
    });

    return () => {
      subscription.remove();
    };
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
