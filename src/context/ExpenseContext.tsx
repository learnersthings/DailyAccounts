import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthContext } from './AuthContext';

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string; // ISO string
  categoryId?: string;
  paymentModeId?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface PaymentMode {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface ExpenseContextType {
  expenses: Expense[];
  categories: Category[];
  paymentModes: PaymentMode[];
  currency: string;
  monthlyBudget: number;
  yearlyBudget: number;
  showMonthlyBudget: boolean;
  showYearlyBudget: boolean;
  showYearCard: boolean;
  analyticsChartType: 'Pie' | 'Donut';
  chartStyle: 'Classic' | '3D' | 'Spaced' | 'Semi-Circle';
  addExpense: (amount: number, description: string, date: Date, categoryId?: string, paymentModeId?: string) => Promise<void>;
  updateExpense: (id: string, amount: number, description: string, date: Date, categoryId?: string, paymentModeId?: string) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  bulkDeleteExpenses: (ids: string[]) => Promise<void>;
  reorderExpensesByDate: (dateStr: string, reorderedDayExpenses: Expense[]) => Promise<void>;
  
  addCategory: (name: string, icon: string, color: string) => Promise<void>;
  updateCategory: (id: string, name: string, icon: string, color: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  addPaymentMode: (name: string, icon: string, color: string) => Promise<void>;
  updatePaymentMode: (id: string, name: string, icon: string, color: string) => Promise<void>;
  deletePaymentMode: (id: string) => Promise<void>;

  bulkImport: (newExpenses: Expense[], newCategories: Category[], newPaymentModes: PaymentMode[]) => Promise<void>;

  updateCurrency: (newCurrency: string) => Promise<void>;
  updateBudgets: (monthly: number, yearly: number) => Promise<void>;
  toggleShowMonthlyBudget: (val: boolean) => Promise<void>;
  toggleShowYearlyBudget: (val: boolean) => Promise<void>;
  toggleShowYearCard: (val: boolean) => Promise<void>;
  updateAnalyticsChartType: (type: 'Pie' | 'Donut') => Promise<void>;
  updateChartStyle: (style: 'Classic' | '3D' | 'Spaced' | 'Semi-Circle') => Promise<void>;
  getCurrentMonthTotal: () => number;
  getPreviousMonthTotal: () => number;
  refreshExpenseData: () => Promise<void>;
  isLoading: boolean;
  downloadPathUri: string | null;
  updateDownloadPath: (uri: string | null) => Promise<void>;
  backupPathUri: string | null;
  updateBackupPath: (uri: string | null) => Promise<void>;
  migrateUserEmail: (oldEmail: string, newEmail: string) => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextType>({
  expenses: [],
  categories: [],
  paymentModes: [],
  currency: '$',
  monthlyBudget: 0,
  yearlyBudget: 0,
  showMonthlyBudget: true,
  showYearlyBudget: true,
  showYearCard: true,
  analyticsChartType: 'Pie',
  chartStyle: 'Classic',
  addExpense: async () => {},
  updateExpense: async () => {},
  deleteExpense: async () => {},
  bulkDeleteExpenses: async () => {},
  reorderExpensesByDate: async () => {},
  addCategory: async () => {},
  updateCategory: async () => {},
  deleteCategory: async () => {},
  addPaymentMode: async () => {},
  updatePaymentMode: async () => {},
  deletePaymentMode: async () => {},
  bulkImport: async () => {},
  updateCurrency: async () => {},
  updateBudgets: async () => {},
  toggleShowMonthlyBudget: async () => {},
  toggleShowYearlyBudget: async () => {},
  toggleShowYearCard: async () => {},
  updateAnalyticsChartType: async () => {},
  updateChartStyle: async () => {},
  getCurrentMonthTotal: () => 0,
  getPreviousMonthTotal: () => 0,
  refreshExpenseData: async () => {},
  isLoading: true,
  downloadPathUri: null,
  updateDownloadPath: async () => {},
  backupPathUri: null,
  updateBackupPath: async () => {},
  migrateUserEmail: async () => {},
});

export const useExpenseContext = () => useContext(ExpenseContext);

const EXPENSES_KEY = '@app_expenses';
const CATEGORIES_KEY = '@app_categories';
const PAYMENT_MODES_KEY = '@app_payment_modes';
const CURRENCY_KEY = '@app_currency';
const BUDGET_KEY = '@app_budgets';
const SHOW_MONTHLY_BUDGET_KEY = '@app_show_monthly_budget';
const SHOW_YEARLY_BUDGET_KEY = '@app_show_yearly_budget';
const SHOW_YEAR_CARD_KEY = '@app_show_year_card';
const ANALYTICS_CHART_TYPE_KEY = '@app_analytics_chart_type';
const CHART_STYLE_KEY = '@app_chart_style';
const DOWNLOAD_PATH_KEY = '@app_download_path';
const BACKUP_PATH_KEY = '@app_backup_path';

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [currency, setCurrency] = useState('$');
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [yearlyBudget, setYearlyBudget] = useState(0);
  const [showMonthlyBudget, setShowMonthlyBudget] = useState(true);
  const [showYearlyBudget, setShowYearlyBudget] = useState(true);
  const [showYearCard, setShowYearCard] = useState(true);
  const [analyticsChartType, setAnalyticsChartType] = useState<'Pie' | 'Donut'>('Pie');
  const [chartStyle, setChartStyle] = useState<'Classic' | '3D' | 'Spaced' | 'Semi-Circle'>('Classic');
  const [downloadPathUri, setDownloadPathUri] = useState<string | null>(null);
  const [backupPathUri, setBackupPathUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthContext();

  const storageKey = user ? `${EXPENSES_KEY}_${user.email}` : EXPENSES_KEY;
  const categoriesStorageKey = user ? `${CATEGORIES_KEY}_${user.email}` : CATEGORIES_KEY;
  const paymentModesStorageKey = user ? `${PAYMENT_MODES_KEY}_${user.email}` : PAYMENT_MODES_KEY;
  const currencyStorageKey = user ? `${CURRENCY_KEY}_${user.email}` : CURRENCY_KEY;
  const budgetStorageKey = user ? `${BUDGET_KEY}_${user.email}` : BUDGET_KEY;
  const showMonthlyBudgetStorageKey = user ? `${SHOW_MONTHLY_BUDGET_KEY}_${user.email}` : SHOW_MONTHLY_BUDGET_KEY;
  const showYearlyBudgetStorageKey = user ? `${SHOW_YEARLY_BUDGET_KEY}_${user.email}` : SHOW_YEARLY_BUDGET_KEY;
  const showYearCardStorageKey = user ? `${SHOW_YEAR_CARD_KEY}_${user.email}` : SHOW_YEAR_CARD_KEY;
  const analyticsChartTypeStorageKey = user ? `${ANALYTICS_CHART_TYPE_KEY}_${user.email}` : ANALYTICS_CHART_TYPE_KEY;
  const chartStyleStorageKey = user ? `${CHART_STYLE_KEY}_${user.email}` : CHART_STYLE_KEY;
  const downloadPathStorageKey = user ? `${DOWNLOAD_PATH_KEY}_${user.email}` : DOWNLOAD_PATH_KEY;
  const backupPathStorageKey = user ? `${BACKUP_PATH_KEY}_${user.email}` : BACKUP_PATH_KEY;

  const loadData = async () => {
    try {
      setIsLoading(true);
      const storedExpenses = await AsyncStorage.getItem(storageKey);
      if (storedExpenses) {
        setExpenses(JSON.parse(storedExpenses));
      } else {
        setExpenses([]);
      }

      const storedCategories = await AsyncStorage.getItem(categoriesStorageKey);
      if (storedCategories) {
        const parsed = JSON.parse(storedCategories);
        parsed.sort((a: Category, b: Category) => a.name.localeCompare(b.name));
        setCategories(parsed);
      } else {
        setCategories([]);
      }

      const storedPaymentModes = await AsyncStorage.getItem(paymentModesStorageKey);
      if (storedPaymentModes) {
        const parsed = JSON.parse(storedPaymentModes);
        parsed.sort((a: PaymentMode, b: PaymentMode) => a.name.localeCompare(b.name));
        setPaymentModes(parsed);
      } else {
        setPaymentModes([]);
      }

      const storedCurrency = await AsyncStorage.getItem(currencyStorageKey);
      if (storedCurrency) {
        setCurrency(storedCurrency);
      } else {
        setCurrency('$');
      }

      const storedBudgets = await AsyncStorage.getItem(budgetStorageKey);
      if (storedBudgets) {
        const parsed = JSON.parse(storedBudgets);
        if (parsed.monthly) setMonthlyBudget(parsed.monthly);
        if (parsed.yearly) setYearlyBudget(parsed.yearly);
      } else {
        setMonthlyBudget(0);
        setYearlyBudget(0);
      }

      const storedShowMonthly = await AsyncStorage.getItem(showMonthlyBudgetStorageKey);
      if (storedShowMonthly !== null) {
        setShowMonthlyBudget(storedShowMonthly === 'true');
      } else {
        setShowMonthlyBudget(true);
      }

      const storedShowYearly = await AsyncStorage.getItem(showYearlyBudgetStorageKey);
      if (storedShowYearly !== null) {
        setShowYearlyBudget(storedShowYearly === 'true');
      } else {
        setShowYearlyBudget(true);
      }

      const storedShowYearCard = await AsyncStorage.getItem(showYearCardStorageKey);
      if (storedShowYearCard !== null) {
        setShowYearCard(storedShowYearCard === 'true');
      } else {
        setShowYearCard(true);
      }

      const storedChartType = await AsyncStorage.getItem(analyticsChartTypeStorageKey);
      if (storedChartType === 'Pie' || storedChartType === 'Donut') {
        setAnalyticsChartType(storedChartType);
      } else {
        setAnalyticsChartType('Pie');
      }

      const storedChartStyle = await AsyncStorage.getItem(chartStyleStorageKey);
      if (storedChartStyle === 'Classic' || storedChartStyle === '3D' || storedChartStyle === 'Spaced' || storedChartStyle === 'Semi-Circle') {
        setChartStyle(storedChartStyle);
      } else {
        setChartStyle('Classic');
      }

      const storedDownloadPath = await AsyncStorage.getItem(downloadPathStorageKey);
      if (storedDownloadPath !== null) {
        setDownloadPathUri(storedDownloadPath);
      } else {
        setDownloadPathUri(null);
      }

      const storedBackupPath = await AsyncStorage.getItem(backupPathStorageKey);
      if (storedBackupPath !== null) {
        setBackupPathUri(storedBackupPath);
      } else {
        setBackupPathUri(null);
      }
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [storageKey, categoriesStorageKey, paymentModesStorageKey, currencyStorageKey, budgetStorageKey, showMonthlyBudgetStorageKey, showYearlyBudgetStorageKey, showYearCardStorageKey, analyticsChartTypeStorageKey, chartStyleStorageKey, downloadPathStorageKey, backupPathStorageKey]);

  const addExpense = async (amount: number, description: string, date: Date, categoryId?: string, paymentModeId?: string) => {
    const newExpense: Expense = {
      id: Date.now().toString(),
      amount,
      description,
      date: date.toISOString(),
      categoryId,
      paymentModeId,
    };

    const newExpenses = [newExpense, ...expenses];
    newExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setExpenses(newExpenses);
    await AsyncStorage.setItem(storageKey, JSON.stringify(newExpenses));
  };

  const updateExpense = async (id: string, amount: number, description: string, date: Date, categoryId?: string, paymentModeId?: string) => {
    const updatedExpenses = expenses.map(exp => 
      exp.id === id 
        ? { ...exp, amount, description, date: date.toISOString(), categoryId, paymentModeId } 
        : exp
    );
    
    // Sort by date descending in case the date was changed
    updatedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setExpenses(updatedExpenses);
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedExpenses));
  };

  const deleteExpense = async (id: string) => {
    const updatedExpenses = expenses.filter(exp => exp.id !== id);
    setExpenses(updatedExpenses);
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedExpenses));
  };

  const bulkDeleteExpenses = async (ids: string[]) => {
    const updatedExpenses = expenses.filter(exp => !ids.includes(exp.id));
    setExpenses(updatedExpenses);
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedExpenses));
  };

  const reorderExpensesByDate = async (dateStr: string, reorderedDayExpenses: Expense[]) => {
    const otherExpenses = expenses.filter(e => new Date(e.date).toDateString() !== dateStr);
    
    const baseDate = new Date(dateStr);
    
    const updatedReordered = reorderedDayExpenses.map((exp, index) => {
      const newDate = new Date(baseDate);
      newDate.setHours(23, 59, 59, 0);
      newDate.setSeconds(newDate.getSeconds() - index);
      
      return {
        ...exp,
        date: newDate.toISOString(),
      };
    });

    const newExpenses = [...updatedReordered, ...otherExpenses];
    newExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setExpenses(newExpenses);
    await AsyncStorage.setItem(storageKey, JSON.stringify(newExpenses));
  };

  const addCategory = async (name: string, icon: string, color: string) => {
    const newCat: Category = { id: Date.now().toString(), name, icon, color };
    const updated = [...categories, newCat].sort((a, b) => a.name.localeCompare(b.name));
    setCategories(updated);
    await AsyncStorage.setItem(categoriesStorageKey, JSON.stringify(updated));
  };

  const updateCategory = async (id: string, name: string, icon: string, color: string) => {
    const updated = categories.map(cat => cat.id === id ? { ...cat, name, icon, color } : cat).sort((a, b) => a.name.localeCompare(b.name));
    setCategories(updated);
    await AsyncStorage.setItem(categoriesStorageKey, JSON.stringify(updated));
  };

  const deleteCategory = async (id: string) => {
    const updated = categories.filter(cat => cat.id !== id);
    setCategories(updated);
    await AsyncStorage.setItem(categoriesStorageKey, JSON.stringify(updated));
  };

  const addPaymentMode = async (name: string, icon: string, color: string) => {
    const newMode: PaymentMode = { id: Date.now().toString(), name, icon, color };
    const updated = [...paymentModes, newMode].sort((a, b) => a.name.localeCompare(b.name));
    setPaymentModes(updated);
    await AsyncStorage.setItem(paymentModesStorageKey, JSON.stringify(updated));
  };

  const updatePaymentMode = async (id: string, name: string, icon: string, color: string) => {
    const updated = paymentModes.map(mode => mode.id === id ? { ...mode, name, icon, color } : mode).sort((a, b) => a.name.localeCompare(b.name));
    setPaymentModes(updated);
    await AsyncStorage.setItem(paymentModesStorageKey, JSON.stringify(updated));
  };

  const deletePaymentMode = async (id: string) => {
    const updated = paymentModes.filter(mode => mode.id !== id);
    setPaymentModes(updated);
    await AsyncStorage.setItem(paymentModesStorageKey, JSON.stringify(updated));
  };

  const bulkImport = async (newExpenses: Expense[], newCategories: Category[], newPaymentModes: PaymentMode[]) => {
    // Merge categories
    const mergedCategories = [...categories];
    for (const cat of newCategories) {
      if (!mergedCategories.some(c => c.name.toLowerCase() === cat.name.toLowerCase())) {
        mergedCategories.push(cat);
      }
    }
    mergedCategories.sort((a, b) => a.name.localeCompare(b.name));
    setCategories(mergedCategories);
    await AsyncStorage.setItem(categoriesStorageKey, JSON.stringify(mergedCategories));

    // Merge payment modes
    const mergedPaymentModes = [...paymentModes];
    for (const mode of newPaymentModes) {
      if (!mergedPaymentModes.some(m => m.name.toLowerCase() === mode.name.toLowerCase())) {
        mergedPaymentModes.push(mode);
      }
    }
    mergedPaymentModes.sort((a, b) => a.name.localeCompare(b.name));
    setPaymentModes(mergedPaymentModes);
    await AsyncStorage.setItem(paymentModesStorageKey, JSON.stringify(mergedPaymentModes));

    // Merge expenses
    const mergedExpenses = [...expenses];
    for (const newExp of newExpenses) {
      const newExpDateStr = new Date(newExp.date).toDateString();
      const existingIndex = mergedExpenses.findIndex(e => 
        new Date(e.date).toDateString() === newExpDateStr &&
        e.amount === newExp.amount &&
        e.categoryId === newExp.categoryId &&
        e.paymentModeId === newExp.paymentModeId &&
        e.description.trim().toLowerCase() === newExp.description.trim().toLowerCase()
      );

      if (existingIndex !== -1) {
        // Update existing record
        mergedExpenses[existingIndex] = { ...mergedExpenses[existingIndex], description: newExp.description };
      } else {
        // Add new record
        mergedExpenses.push(newExp);
      }
    }

    mergedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setExpenses(mergedExpenses);
    await AsyncStorage.setItem(storageKey, JSON.stringify(mergedExpenses));
  };

  const updateCurrency = async (newCurrency: string) => {
    setCurrency(newCurrency);
    await AsyncStorage.setItem(currencyStorageKey, newCurrency);
  };

  const updateBudgets = async (monthly: number, yearly: number) => {
    setMonthlyBudget(monthly);
    setYearlyBudget(yearly);
    await AsyncStorage.setItem(budgetStorageKey, JSON.stringify({ monthly, yearly }));
  };

  const toggleShowMonthlyBudget = async (val: boolean) => {
    setShowMonthlyBudget(val);
    await AsyncStorage.setItem(showMonthlyBudgetStorageKey, val.toString());
  };

  const toggleShowYearlyBudget = async (val: boolean) => {
    setShowYearlyBudget(val);
    await AsyncStorage.setItem(showYearlyBudgetStorageKey, val.toString());
  };

  const toggleShowYearCard = async (val: boolean) => {
    setShowYearCard(val);
    await AsyncStorage.setItem(showYearCardStorageKey, val.toString());
  };

  const updateAnalyticsChartType = async (type: 'Pie' | 'Donut') => {
    setAnalyticsChartType(type);
    await AsyncStorage.setItem(analyticsChartTypeStorageKey, type);
  };

  const updateChartStyle = async (style: 'Classic' | '3D' | 'Spaced' | 'Semi-Circle') => {
    setChartStyle(style);
    await AsyncStorage.setItem(chartStyleStorageKey, style);
  };

  const updateDownloadPath = async (uri: string | null) => {
    setDownloadPathUri(uri);
    if (uri) {
      await AsyncStorage.setItem(downloadPathStorageKey, uri);
    } else {
      await AsyncStorage.removeItem(downloadPathStorageKey);
    }
  };

  const updateBackupPath = async (uri: string | null) => {
    setBackupPathUri(uri);
    if (uri) {
      await AsyncStorage.setItem(backupPathStorageKey, uri);
    } else {
      await AsyncStorage.removeItem(backupPathStorageKey);
    }
  };

  const getCurrentMonthTotal = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return expenses
      .filter((expense) => {
        const expDate = new Date(expense.date);
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
      })
      .reduce((total, expense) => total + expense.amount, 0);
  };

  const getPreviousMonthTotal = () => {
    const now = new Date();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    return expenses
      .filter((expense) => {
        const expDate = new Date(expense.date);
        return expDate.getMonth() === prevMonth && expDate.getFullYear() === prevYear;
      })
      .reduce((total, expense) => total + expense.amount, 0);
  };

  const migrateUserEmail = async (oldEmail: string, newEmail: string) => {
    const keys = [
      EXPENSES_KEY, CATEGORIES_KEY, PAYMENT_MODES_KEY, CURRENCY_KEY,
      BUDGET_KEY, SHOW_MONTHLY_BUDGET_KEY, SHOW_YEARLY_BUDGET_KEY, SHOW_YEAR_CARD_KEY,
      ANALYTICS_CHART_TYPE_KEY, CHART_STYLE_KEY, DOWNLOAD_PATH_KEY, BACKUP_PATH_KEY
    ];

    for (const key of keys) {
      const oldKey = `${key}_${oldEmail}`;
      const newKey = `${key}_${newEmail}`;
      const data = await AsyncStorage.getItem(oldKey);
      if (data !== null) {
        await AsyncStorage.setItem(newKey, data);
        await AsyncStorage.removeItem(oldKey);
      }
    }
  };

  return (
    <ExpenseContext.Provider value={{ 
      expenses, categories, paymentModes, currency, monthlyBudget, yearlyBudget, 
      showMonthlyBudget, showYearlyBudget, showYearCard, analyticsChartType, chartStyle,
      addExpense, updateExpense, deleteExpense, bulkDeleteExpenses, reorderExpensesByDate,
      addCategory, updateCategory, deleteCategory,
      addPaymentMode, updatePaymentMode, deletePaymentMode,
      bulkImport,
      updateCurrency, updateBudgets, toggleShowMonthlyBudget, toggleShowYearlyBudget, toggleShowYearCard, updateAnalyticsChartType, updateChartStyle,
      getCurrentMonthTotal, getPreviousMonthTotal, 
      refreshExpenseData: loadData, isLoading,
      downloadPathUri, updateDownloadPath,
      backupPathUri, updateBackupPath,
      migrateUserEmail
    }}>
      {children}
    </ExpenseContext.Provider>
  );
};

