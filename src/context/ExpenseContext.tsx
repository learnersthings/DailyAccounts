import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { doc, setDoc, deleteDoc, writeBatch, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthContext } from './AuthContext';
import { parseISOYear, parseISOMonth } from '../utils/dateUtils';

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
  monthlyIncomes: Record<string, number>;
  addExpense: (amount: number, description: string, date: Date, categoryId?: string, paymentModeId?: string) => Promise<void>;
  updateExpense: (id: string, amount: number, description: string, date: Date, categoryId?: string, paymentModeId?: string) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  bulkDeleteExpenses: (ids: string[]) => Promise<void>;
  reorderExpensesByDate: (dateStr: string, reorderedDayExpenses: Expense[]) => Promise<void>;
  
  updateMonthlyIncome: (year: number, month: number, amount: number) => Promise<void>;
  
  addCategory: (name: string, icon: string, color: string) => Promise<void>;
  updateCategory: (id: string, name: string, icon: string, color: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  addPaymentMode: (name: string, icon: string, color: string) => Promise<void>;
  updatePaymentMode: (id: string, name: string, icon: string, color: string) => Promise<void>;
  deletePaymentMode: (id: string) => Promise<void>;

  bulkImport: (newExpenses: Expense[], newCategories: Category[], newPaymentModes: PaymentMode[]) => Promise<void>;
  restoreBackup: (newExpenses: Expense[], newCategories: Category[], newPaymentModes: PaymentMode[], newSettings: any, onProgress?: (progress: number) => void) => Promise<void>;

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
  monthlyIncomes: {},
  addExpense: async () => {},
  updateExpense: async () => {},
  deleteExpense: async () => {},
  bulkDeleteExpenses: async () => {},
  reorderExpensesByDate: async () => {},
  updateMonthlyIncome: async () => {},
  addCategory: async () => {},
  updateCategory: async () => {},
  deleteCategory: async () => {},
  addPaymentMode: async () => {},
  updatePaymentMode: async () => {},
  deletePaymentMode: async () => {},
  bulkImport: async () => {},
  restoreBackup: async () => {},
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
  const [monthlyIncomes, setMonthlyIncomes] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthContext();

  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const loadData = () => {
      if (user && user.uid) {
        setIsLoading(true);

        const expensesRef = collection(db, 'users', user.uid, 'expenses');
        const unsubsExp = onSnapshot(expensesRef, (snapshot) => {
          setExpenses(prev => {
            let next = [...prev];
            let hasChanges = false;
            
            snapshot.docChanges().forEach(change => {
              hasChanges = true;
              const data = { id: change.doc.id, ...change.doc.data() } as Expense;
              if (change.type === 'added') {
                if (!next.some(e => e.id === data.id)) next.push(data);
              }
              if (change.type === 'modified') {
                const idx = next.findIndex(e => e.id === data.id);
                if (idx !== -1) next[idx] = data;
              }
              if (change.type === 'removed') {
                next = next.filter(e => e.id !== data.id);
              }
            });

            if (!hasChanges) return prev;
            next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return next;
          });
        });
        unsubs.push(unsubsExp);

        const catRef = collection(db, 'users', user.uid, 'categories');
        const unsubsCat = onSnapshot(catRef, (snapshot) => {
          const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
          cats.sort((a, b) => a.name.localeCompare(b.name));
          setCategories(cats);
        });
        unsubs.push(unsubsCat);

        const pmRef = collection(db, 'users', user.uid, 'paymentModes');
        const unsubsPm = onSnapshot(pmRef, (snapshot) => {
          const pms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentMode));
          pms.sort((a, b) => a.name.localeCompare(b.name));
          setPaymentModes(pms);
        });
        unsubs.push(unsubsPm);

        const prefRef = doc(db, 'users', user.uid, 'settings', 'preferences');
        const unsubsPref = onSnapshot(prefRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.currency !== undefined) setCurrency(data.currency);
            if (data.monthlyBudget !== undefined) setMonthlyBudget(data.monthlyBudget);
            if (data.yearlyBudget !== undefined) setYearlyBudget(data.yearlyBudget);
            if (data.showMonthlyBudget !== undefined) setShowMonthlyBudget(data.showMonthlyBudget);
            if (data.showYearlyBudget !== undefined) setShowYearlyBudget(data.showYearlyBudget);
            if (data.showYearCard !== undefined) setShowYearCard(data.showYearCard);
            if (data.analyticsChartType !== undefined) setAnalyticsChartType(data.analyticsChartType);
            if (data.chartStyle !== undefined) setChartStyle(data.chartStyle);
            if (data.downloadPathUri !== undefined) setDownloadPathUri(data.downloadPathUri);
            if (data.backupPathUri !== undefined) setBackupPathUri(data.backupPathUri);
            if (data.monthlyIncomes !== undefined) setMonthlyIncomes(data.monthlyIncomes);
          }
          setIsLoading(false);
        });
        unsubs.push(unsubsPref);

      } else {
        // Not logged in
        setExpenses([]);
        setCategories([]);
        setPaymentModes([]);
        setIsLoading(false);
      }
    };

    loadData();

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user]);

  const loadData = async () => {};

  const addExpense = async (amount: number, description: string, date: Date, categoryId?: string, paymentModeId?: string) => {
    const newExpense: Expense = {
      id: Date.now().toString(),
      amount,
      description,
      date: date.toISOString(),
      categoryId,
      paymentModeId,
    };

    // Optimistic update
    const newExpenses = [newExpense, ...expenses];
    newExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setExpenses(newExpenses);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'expenses', newExpense.id), newExpense).catch(console.error);
    }
  };

  const updateExpense = async (id: string, amount: number, description: string, date: Date, categoryId?: string, paymentModeId?: string) => {
    const updatedExpenses = expenses.map(exp => 
      exp.id === id 
        ? { ...exp, amount, description, date: date.toISOString(), categoryId, paymentModeId } 
        : exp
    );
    
    // Optimistic update
    updatedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setExpenses(updatedExpenses);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'expenses', id), { amount, description, date: date.toISOString(), categoryId, paymentModeId }, { merge: true }).catch(console.error);
    }
  };

  const deleteExpense = async (id: string) => {
    const updatedExpenses = expenses.filter(exp => exp.id !== id);
    // Optimistic update
    setExpenses(updatedExpenses);

    if (user && user.uid) {
      deleteDoc(doc(db, 'users', user.uid, 'expenses', id)).catch(console.error);
    }
  };

  const bulkDeleteExpenses = async (ids: string[]) => {
    const updatedExpenses = expenses.filter(exp => !ids.includes(exp.id));
    // Optimistic update
    setExpenses(updatedExpenses);

    if (user && user.uid) {
      const uid = user.uid;
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.delete(doc(db, 'users', uid, 'expenses', id));
      });
      batch.commit().catch(console.error);
    }
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
    
    // Optimistic update
    setExpenses(newExpenses);
  };

  const updateMonthlyIncome = async (year: number, month: number, amount: number) => {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const updated = { ...monthlyIncomes, [key]: amount };
    // Optimistic update
    setMonthlyIncomes(updated);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), {
        monthlyIncomes: updated
      }, { merge: true }).catch(console.error);
    }
  };

  const addCategory = async (name: string, icon: string, color: string) => {
    const newCat: Category = { id: Date.now().toString(), name, icon, color };
    const updated = [...categories, newCat].sort((a, b) => a.name.localeCompare(b.name));
    // Optimistic update
    setCategories(updated);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'categories', newCat.id), newCat).catch(console.error);
    }
  };

  const updateCategory = async (id: string, name: string, icon: string, color: string) => {
    const updated = categories.map(cat => cat.id === id ? { ...cat, name, icon, color } : cat).sort((a, b) => a.name.localeCompare(b.name));
    // Optimistic update
    setCategories(updated);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'categories', id), { name, icon, color }, { merge: true }).catch(console.error);
    }
  };

  const deleteCategory = async (id: string) => {
    const updated = categories.filter(cat => cat.id !== id);
    // Optimistic update
    setCategories(updated);

    if (user && user.uid) {
      deleteDoc(doc(db, 'users', user.uid, 'categories', id)).catch(console.error);
    }
  };

  const addPaymentMode = async (name: string, icon: string, color: string) => {
    const newMode: PaymentMode = { id: Date.now().toString(), name, icon, color };
    const updated = [...paymentModes, newMode].sort((a, b) => a.name.localeCompare(b.name));
    // Optimistic update
    setPaymentModes(updated);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'paymentModes', newMode.id), newMode).catch(console.error);
    }
  };

  const updatePaymentMode = async (id: string, name: string, icon: string, color: string) => {
    const updated = paymentModes.map(mode => mode.id === id ? { ...mode, name, icon, color } : mode).sort((a, b) => a.name.localeCompare(b.name));
    // Optimistic update
    setPaymentModes(updated);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'paymentModes', id), { name, icon, color }, { merge: true }).catch(console.error);
    }
  };

  const deletePaymentMode = async (id: string) => {
    const updated = paymentModes.filter(mode => mode.id !== id);
    // Optimistic update
    setPaymentModes(updated);

    if (user && user.uid) {
      deleteDoc(doc(db, 'users', user.uid, 'paymentModes', id)).catch(console.error);
    }
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

    // Merge payment modes
    const mergedPaymentModes = [...paymentModes];
    for (const mode of newPaymentModes) {
      if (!mergedPaymentModes.some(m => m.name.toLowerCase() === mode.name.toLowerCase())) {
        mergedPaymentModes.push(mode);
      }
    }
    mergedPaymentModes.sort((a, b) => a.name.localeCompare(b.name));
    setPaymentModes(mergedPaymentModes);

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

    if (user && user.uid) {
      const uid = user.uid;
      
      for (let i = 0; i < mergedCategories.length; i += 400) {
        const batch = writeBatch(db);
        mergedCategories.slice(i, i + 400).forEach(cat => batch.set(doc(db, 'users', uid, 'categories', cat.id), cat));
        await batch.commit().catch(console.error);
      }
      
      for (let i = 0; i < mergedPaymentModes.length; i += 400) {
        const batch = writeBatch(db);
        mergedPaymentModes.slice(i, i + 400).forEach(mode => batch.set(doc(db, 'users', uid, 'paymentModes', mode.id), mode));
        await batch.commit().catch(console.error);
      }
      
      for (let i = 0; i < mergedExpenses.length; i += 400) {
        const batch = writeBatch(db);
        mergedExpenses.slice(i, i + 400).forEach(exp => batch.set(doc(db, 'users', uid, 'expenses', exp.id), exp));
        await batch.commit().catch(console.error);
      }
    }
  };

  const restoreBackup = async (newExpenses: Expense[], newCategories: Category[], newPaymentModes: PaymentMode[], newSettings: any, onProgress?: (progress: number) => void) => {
    // 1. Optimistic updates
    newExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    newCategories.sort((a, b) => a.name.localeCompare(b.name));
    newPaymentModes.sort((a, b) => a.name.localeCompare(b.name));

    setExpenses(newExpenses);
    setCategories(newCategories);
    setPaymentModes(newPaymentModes);

    if (newSettings?.currency) setCurrency(newSettings.currency);
    if (newSettings?.monthlyBudget !== undefined) setMonthlyBudget(newSettings.monthlyBudget);
    if (newSettings?.yearlyBudget !== undefined) setYearlyBudget(newSettings.yearlyBudget);
    if (newSettings?.showMonthlyBudget !== undefined) setShowMonthlyBudget(newSettings.showMonthlyBudget);
    if (newSettings?.showYearlyBudget !== undefined) setShowYearlyBudget(newSettings.showYearlyBudget);
    if (newSettings?.showYearCard !== undefined) setShowYearCard(newSettings.showYearCard);
    if (newSettings?.analyticsChartType) setAnalyticsChartType(newSettings.analyticsChartType);
    if (newSettings?.chartStyle) setChartStyle(newSettings.chartStyle);
    if (newSettings?.monthlyIncomes) setMonthlyIncomes(newSettings.monthlyIncomes);

    // 2. Safely sync to Firebase
    if (user && user.uid) {
      const uid = user.uid;

      const currentIds = expenses.map(e => e.id);
      const currentCatIds = categories.map(c => c.id);
      const currentPmIds = paymentModes.map(p => p.id);
      
      const totalBatches = 
        Math.ceil(currentIds.length / 400) + 
        Math.ceil(currentCatIds.length / 400) + 
        Math.ceil(currentPmIds.length / 400) + 
        Math.ceil(newExpenses.length / 400) + 
        Math.ceil(newCategories.length / 400) + 
        Math.ceil(newPaymentModes.length / 400) + 1; // +1 for settings
      
      let completedBatches = 0;
      const reportProgress = () => {
        completedBatches++;
        if (onProgress) onProgress((completedBatches / totalBatches) * 100);
      };

      for (let i = 0; i < currentIds.length; i += 400) {
        const batch = writeBatch(db);
        currentIds.slice(i, i + 400).forEach(id => batch.delete(doc(db, 'users', uid, 'expenses', id)));
        await batch.commit();
        reportProgress();
      }

      for (let i = 0; i < currentCatIds.length; i += 400) {
        const batch = writeBatch(db);
        currentCatIds.slice(i, i + 400).forEach(id => batch.delete(doc(db, 'users', uid, 'categories', id)));
        await batch.commit();
        reportProgress();
      }
      
      for (let i = 0; i < currentPmIds.length; i += 400) {
        const batch = writeBatch(db);
        currentPmIds.slice(i, i + 400).forEach(id => batch.delete(doc(db, 'users', uid, 'paymentModes', id)));
        await batch.commit();
        reportProgress();
      }

      for (let i = 0; i < newExpenses.length; i += 400) {
        const batch = writeBatch(db);
        newExpenses.slice(i, i + 400).forEach(exp => {
          const docId = exp.id ? String(exp.id) : (Date.now().toString() + Math.floor(Math.random() * 10000).toString());
          const validExp = { ...exp, id: docId };
          batch.set(doc(db, 'users', uid, 'expenses', docId), validExp);
        });
        await batch.commit();
        reportProgress();
      }

      for (let i = 0; i < newCategories.length; i += 400) {
        const batch = writeBatch(db);
        newCategories.slice(i, i + 400).forEach(cat => {
          const docId = cat.id ? String(cat.id) : (Date.now().toString() + Math.floor(Math.random() * 10000).toString());
          const validCat = { ...cat, id: docId };
          batch.set(doc(db, 'users', uid, 'categories', docId), validCat);
        });
        await batch.commit();
        reportProgress();
      }
      
      for (let i = 0; i < newPaymentModes.length; i += 400) {
        const batch = writeBatch(db);
        newPaymentModes.slice(i, i + 400).forEach(mode => {
          const docId = mode.id ? String(mode.id) : (Date.now().toString() + Math.floor(Math.random() * 10000).toString());
          const validMode = { ...mode, id: docId };
          batch.set(doc(db, 'users', uid, 'paymentModes', docId), validMode);
        });
        await batch.commit();
        reportProgress();
      }

      await setDoc(doc(db, 'users', uid, 'settings', 'preferences'), {
         currency: newSettings?.currency || '$',
         monthlyBudget: newSettings?.monthlyBudget || 0,
         yearlyBudget: newSettings?.yearlyBudget || 0,
         showMonthlyBudget: newSettings?.showMonthlyBudget ?? true,
         showYearlyBudget: newSettings?.showYearlyBudget ?? true,
         showYearCard: newSettings?.showYearCard ?? true,
         analyticsChartType: newSettings?.analyticsChartType || 'Pie',
         chartStyle: newSettings?.chartStyle || 'Classic',
         monthlyIncomes: newSettings?.monthlyIncomes || {}
      }, { merge: true });
      reportProgress();
    }
  };

  const updateCurrency = async (newCurrency: string) => {
    // Optimistic update
    setCurrency(newCurrency);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), {
        currency: newCurrency
      }, { merge: true }).catch(console.error);
    }
  };

  const updateBudgets = async (monthly: number, yearly: number) => {
    // Optimistic update
    setMonthlyBudget(monthly);
    setYearlyBudget(yearly);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), {
        monthlyBudget: monthly,
        yearlyBudget: yearly
      }, { merge: true }).catch(console.error);
    }
  };

  const toggleShowMonthlyBudget = async (val: boolean) => {
    // Optimistic update
    setShowMonthlyBudget(val);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), {
        showMonthlyBudget: val
      }, { merge: true }).catch(console.error);
    }
  };

  const toggleShowYearlyBudget = async (val: boolean) => {
    // Optimistic update
    setShowYearlyBudget(val);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), {
        showYearlyBudget: val
      }, { merge: true }).catch(console.error);
    }
  };

  const toggleShowYearCard = async (val: boolean) => {
    // Optimistic update
    setShowYearCard(val);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), {
        showYearCard: val
      }, { merge: true }).catch(console.error);
    }
  };

  const updateAnalyticsChartType = async (type: 'Pie' | 'Donut') => {
    // Optimistic update
    setAnalyticsChartType(type);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), {
        analyticsChartType: type
      }, { merge: true }).catch(console.error);
    }
  };

  const updateChartStyle = async (style: 'Classic' | '3D' | 'Spaced' | 'Semi-Circle') => {
    // Optimistic update
    setChartStyle(style);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), {
        chartStyle: style
      }, { merge: true }).catch(console.error);
    }
  };

  const updateDownloadPath = async (uri: string | null) => {
    // Optimistic update
    setDownloadPathUri(uri);
    
    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), {
        downloadPathUri: uri
      }, { merge: true }).catch(console.error);
    }
  };

  const updateBackupPath = async (uri: string | null) => {
    setBackupPathUri(uri);
    
    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), {
        backupPathUri: uri
      }, { merge: true }).catch(console.error);
    }
  };

  const getCurrentMonthTotal = useCallback(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return expenses
      .filter((expense) => {
        return parseISOMonth(expense.date) === currentMonth && parseISOYear(expense.date) === currentYear;
      })
      .reduce((total, expense) => total + expense.amount, 0);
  }, [expenses]);

  const getPreviousMonthTotal = useCallback(() => {
    const now = new Date();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    return expenses
      .filter((expense) => {
        return parseISOMonth(expense.date) === prevMonth && parseISOYear(expense.date) === prevYear;
      })
      .reduce((total, expense) => total + expense.amount, 0);
  }, [expenses]);

  const migrateUserEmail = async (oldEmail: string, newEmail: string) => {
    // No longer applicable with Firebase
  };

  const contextValue = useMemo(() => ({
      expenses, categories, paymentModes, currency, monthlyBudget, yearlyBudget, 
      showMonthlyBudget, showYearlyBudget, showYearCard, analyticsChartType, chartStyle,
      monthlyIncomes,
      addExpense, updateExpense, deleteExpense, bulkDeleteExpenses, reorderExpensesByDate,
      updateMonthlyIncome,
      addCategory, updateCategory, deleteCategory,
      addPaymentMode, updatePaymentMode, deletePaymentMode,
      bulkImport, restoreBackup,
      updateCurrency, updateBudgets, toggleShowMonthlyBudget, toggleShowYearlyBudget, toggleShowYearCard, updateAnalyticsChartType, updateChartStyle,
      getCurrentMonthTotal, getPreviousMonthTotal, 
      refreshExpenseData: loadData, isLoading,
      downloadPathUri, updateDownloadPath,
      backupPathUri, updateBackupPath,
      migrateUserEmail
  }), [
      expenses, categories, paymentModes, currency, monthlyBudget, yearlyBudget,
      showMonthlyBudget, showYearlyBudget, showYearCard, analyticsChartType, chartStyle,
      monthlyIncomes, isLoading, downloadPathUri, backupPathUri,
      getCurrentMonthTotal, getPreviousMonthTotal, loadData
  ]);

  return (
    <ExpenseContext.Provider value={contextValue}>
      {children}
    </ExpenseContext.Provider>
  );
};

