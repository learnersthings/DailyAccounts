import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Expense } from '../context/ExpenseContext';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (e) {
    console.log('Skipping expo-notifications import in Expo Go', e);
  }
}

// Identifier prefixes for our scheduled notifications
const SUMMARY_PREFIX = 'summary_';
const REMINDER_PREFIX = 'reminder_';
const MONTHLY_PREFIX = 'monthly_';

export const scheduleAllNotifications = async (expenses: Expense[], currency: string) => {
  if (!Notifications) return;

  try {
    // 1. Cancel all existing scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = new Date();
    const todayStr = now.toDateString();

    // Calculate today's total for the summary
    const todayExpenses = expenses.filter(e => new Date(e.date).toDateString() === todayStr);
    const todayTotal = todayExpenses.reduce((sum, e) => sum + (parseFloat(e.amount as any) || 0), 0);
    const hasTodayExpense = todayExpenses.length > 0;

    // Calculate current month's total for the 1st-of-month summary
    const currentMonthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const currentMonthTotal = currentMonthExpenses.reduce((sum, e) => sum + (parseFloat(e.amount as any) || 0), 0);

    // 2. Schedule "Yesterday's Summary" (8 AM) and "Daily Reminder" (6 PM) for the next 14 days
    for (let i = 1; i <= 14; i++) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + i);

      // ---- 8 AM Summary (Yesterday's summary) ----
      targetDate.setHours(8, 0, 0, 0);
      
      // If i === 1 (tomorrow), the summary is for today's total.
      // If i > 1, the summary is for 0 (since they haven't opened the app to add anything).
      const summaryTotal = i === 1 ? todayTotal : 0;
      
      await Notifications.scheduleNotificationAsync({
        identifier: `${SUMMARY_PREFIX}${i}`,
        content: {
          title: "Yesterday's Summary 📊",
          body: `Your total expense for yesterday was ${currency}${summaryTotal}.`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: targetDate,
        },
      });

      // ---- 6 PM Reminder ----
      targetDate.setHours(18, 0, 0, 0);
      await Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_PREFIX}${i}`,
        content: {
          title: "Daily Reminder",
          body: "You haven't logged any expenses today. Don't forget to track your spending!",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: targetDate,
        },
      });
    }

    // ---- Today's 6 PM Reminder (if applicable) ----
    // If no expense logged today and it's currently before 6 PM
    if (!hasTodayExpense && now.getHours() < 18) {
      const today6PM = new Date(now);
      today6PM.setHours(18, 0, 0, 0);
      
      await Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_PREFIX}0`,
        content: {
          title: "Daily Reminder",
          body: "You haven't logged any expenses today. Don't forget to track your spending!",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: today6PM,
        },
      });
    }

    // ---- Monthly Summary (1st of Next Month at 9 AM) ----
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    nextMonthDate.setHours(9, 0, 0, 0);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthName = monthNames[now.getMonth()];

    await Notifications.scheduleNotificationAsync({
      identifier: `${MONTHLY_PREFIX}`,
      content: {
        title: "Monthly Summary 📊",
        body: `Your total expense for ${currentMonthName} was ${currency}${currentMonthTotal}.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: nextMonthDate,
      },
    });

  } catch (error) {
    console.log('Error scheduling notifications:', error);
  }
};
