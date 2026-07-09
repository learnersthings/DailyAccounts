import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthContext } from './AuthContext';

export interface AccountTransaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  type: 'Debit' | 'Credit';
  account: string;
}

interface TransactionContextType {
  transactions: AccountTransaction[];
  accounts: string[];
  addTransaction: (amount: number, description: string, date: Date, type: 'Debit' | 'Credit', account: string) => Promise<void>;
  updateTransaction: (id: string, amount: number, description: string, date: Date, type: 'Debit' | 'Credit', account: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  bulkDeleteTransactions: (ids: string[]) => Promise<void>;
  bulkImportTransactions: (newTransactions: AccountTransaction[]) => Promise<void>;
  reorderTransactionsByDate: (dateStr: string, reorderedDayTransactions: AccountTransaction[]) => Promise<void>;
  updateAccountOrder: (newOrder: string[]) => Promise<void>;
  addManualAccount: (account: string) => Promise<void>;
  deleteAccount: (account: string) => Promise<void>;
  getAccountBalance: (account: string) => number;
  getAccountStats: (account: string) => { balance: number; totalCredit: number; totalDebit: number };
  excludedFromTotal: string[];
  showCardStats: boolean;
  toggleAccountInTotal: (account: string) => Promise<void>;
  toggleShowCardStats: () => Promise<void>;
  refreshTransactionData: () => Promise<void>;
  isLoading: boolean;
}

const TransactionContext = createContext<TransactionContextType>({
  transactions: [],
  accounts: [],
  addTransaction: async () => {},
  updateTransaction: async () => {},
  deleteTransaction: async () => {},
  bulkDeleteTransactions: async () => {},
  bulkImportTransactions: async () => {},
  reorderTransactionsByDate: async () => {},
  updateAccountOrder: async () => {},
  addManualAccount: async () => {},
  deleteAccount: async () => {},
  getAccountBalance: () => 0,
  getAccountStats: () => ({ balance: 0, totalCredit: 0, totalDebit: 0 }),
  excludedFromTotal: [],
  showCardStats: true,
  toggleAccountInTotal: async () => {},
  toggleShowCardStats: async () => {},
  refreshTransactionData: async () => {},
  isLoading: true,
});

export const useTransactionContext = () => useContext(TransactionContext);

const TRANSACTIONS_KEY = '@app_bank_transactions';

export const TransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [accountOrder, setAccountOrder] = useState<string[]>([]);
  const [manualAccounts, setManualAccounts] = useState<string[]>([]);
  const [excludedFromTotal, setExcludedFromTotal] = useState<string[]>([]);
  const [showCardStats, setShowCardStats] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthContext();

  const storageKey = user ? `${TRANSACTIONS_KEY}_${user.email}` : TRANSACTIONS_KEY;
  const orderStorageKey = user ? `@app_account_order_${user.email}` : '@app_account_order';
  const manualAccountsStorageKey = user ? `@app_manual_accounts_${user.email}` : '@app_manual_accounts';
  const excludedStorageKey = user ? `@app_account_excluded_${user.email}` : '@app_account_excluded';
  const showStatsStorageKey = user ? `@app_show_card_stats_${user.email}` : '@app_show_card_stats';

  const loadData = async () => {
    try {
      setIsLoading(true);
      const storedTransactions = await AsyncStorage.getItem(storageKey);
      if (storedTransactions) {
        setTransactions(JSON.parse(storedTransactions));
      } else {
        setTransactions([]);
      }

      const storedOrder = await AsyncStorage.getItem(orderStorageKey);
      if (storedOrder) {
        setAccountOrder(JSON.parse(storedOrder));
      } else {
        setAccountOrder([]);
      }

      const storedManualAccounts = await AsyncStorage.getItem(manualAccountsStorageKey);
      if (storedManualAccounts) {
        setManualAccounts(JSON.parse(storedManualAccounts));
      } else {
        setManualAccounts([]);
      }

      const storedExcluded = await AsyncStorage.getItem(excludedStorageKey);
      if (storedExcluded) {
        setExcludedFromTotal(JSON.parse(storedExcluded));
      } else {
        setExcludedFromTotal([]);
      }

      const storedShowStats = await AsyncStorage.getItem(showStatsStorageKey);
      if (storedShowStats !== null) {
        setShowCardStats(JSON.parse(storedShowStats));
      } else {
        setShowCardStats(true);
      }
    } catch (e) {
      console.error('Failed to load transaction data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [storageKey]);

  const addTransaction = async (amount: number, description: string, date: Date, type: 'Debit' | 'Credit', account: string) => {
    const newTx: AccountTransaction = {
      id: Date.now().toString() + Math.random().toString(),
      amount,
      description,
      date: date.toISOString(),
      type,
      account,
    };
    const newTxs = [newTx, ...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(newTxs);
    await AsyncStorage.setItem(storageKey, JSON.stringify(newTxs));
  };

  const updateTransaction = async (id: string, amount: number, description: string, date: Date, type: 'Debit' | 'Credit', account: string) => {
    const updated = transactions.map(tx => 
      tx.id === id ? { ...tx, amount, description, date: date.toISOString(), type, account } : tx
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(updated);
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const deleteTransaction = async (id: string) => {
    const updated = transactions.filter(tx => tx.id !== id);
    setTransactions(updated);
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const bulkDeleteTransactions = async (ids: string[]) => {
    const updated = transactions.filter(tx => !ids.includes(tx.id));
    setTransactions(updated);
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const bulkImportTransactions = async (newTransactions: AccountTransaction[]) => {
    const merged = [...transactions];
    const unmatchedExisting = [...transactions];
    
    for (const newTx of newTransactions) {
      const newTxDateStr = new Date(newTx.date).toDateString();
      const poolIdx = unmatchedExisting.findIndex(e => 
        new Date(e.date).toDateString() === newTxDateStr &&
        e.amount === newTx.amount &&
        e.type === newTx.type &&
        e.account === newTx.account &&
        e.description.trim().toLowerCase() === newTx.description.trim().toLowerCase()
      );
      
      if (poolIdx !== -1) {
        unmatchedExisting.splice(poolIdx, 1);
      } else {
        merged.push(newTx);
      }
    }
    
    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(merged);
    await AsyncStorage.setItem(storageKey, JSON.stringify(merged));
  };

  const reorderTransactionsByDate = async (dateStr: string, reorderedDayTransactions: AccountTransaction[]) => {
    const otherTransactions = transactions.filter(t => new Date(t.date).toDateString() !== dateStr);
    
    const baseDate = new Date(dateStr);
    
    const updatedReordered = reorderedDayTransactions.map((tx, index) => {
      const newDate = new Date(baseDate);
      newDate.setHours(23, 59, 59, 0);
      newDate.setSeconds(newDate.getSeconds() - index);
      
      return {
        ...tx,
        date: newDate.toISOString(),
      };
    });

    const newTransactions = [...updatedReordered, ...otherTransactions];
    newTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(newTransactions);
    await AsyncStorage.setItem(storageKey, JSON.stringify(newTransactions));
  };

  const getAccountBalance = (account: string) => {
    return transactions
      .filter(t => t.account === account)
      .reduce((sum, t) => sum + (t.type === 'Credit' ? t.amount : -t.amount), 0);
  };

  const getAccountStats = (account: string) => {
    return transactions
      .filter(t => t.account === account)
      .reduce((acc, t) => {
        if (t.type === 'Credit') {
          acc.totalCredit += t.amount;
          acc.balance += t.amount;
        } else {
          acc.totalDebit += t.amount;
          acc.balance -= t.amount;
        }
        return acc;
      }, { balance: 0, totalCredit: 0, totalDebit: 0 });
  };

  const updateAccountOrder = async (newOrder: string[]) => {
    setAccountOrder(newOrder);
    await AsyncStorage.setItem(orderStorageKey, JSON.stringify(newOrder));
  };

  const addManualAccount = async (account: string) => {
    if (manualAccounts.includes(account) || transactions.some(t => t.account === account)) {
      return; // Already exists
    }
    const newManualAccounts = [...manualAccounts, account];
    setManualAccounts(newManualAccounts);
    await AsyncStorage.setItem(manualAccountsStorageKey, JSON.stringify(newManualAccounts));
  };

  const deleteAccount = async (account: string) => {
    const updated = transactions.filter(tx => tx.account !== account);
    setTransactions(updated);
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    
    const newOrder = accountOrder.filter(a => a !== account);
    setAccountOrder(newOrder);
    await AsyncStorage.setItem(orderStorageKey, JSON.stringify(newOrder));

    const newManualAccounts = manualAccounts.filter(a => a !== account);
    setManualAccounts(newManualAccounts);
    await AsyncStorage.setItem(manualAccountsStorageKey, JSON.stringify(newManualAccounts));

    const newExcluded = excludedFromTotal.filter(a => a !== account);
    setExcludedFromTotal(newExcluded);
    await AsyncStorage.setItem(excludedStorageKey, JSON.stringify(newExcluded));
  };

  const toggleAccountInTotal = async (account: string) => {
    let newExcluded = [...excludedFromTotal];
    if (newExcluded.includes(account)) {
      newExcluded = newExcluded.filter(a => a !== account);
    } else {
      newExcluded.push(account);
    }
    setExcludedFromTotal(newExcluded);
    await AsyncStorage.setItem(excludedStorageKey, JSON.stringify(newExcluded));
  };

  const toggleShowCardStats = async () => {
    const newVal = !showCardStats;
    setShowCardStats(newVal);
    await AsyncStorage.setItem(showStatsStorageKey, JSON.stringify(newVal));
  };

  const accounts = useMemo(() => {
    const usedAccounts = new Set([...transactions.map(t => t.account), ...manualAccounts]);
    const allAccounts = Array.from(usedAccounts);
    
    // Sort based on accountOrder
    allAccounts.sort((a, b) => {
      const idxA = accountOrder.indexOf(a);
      const idxB = accountOrder.indexOf(b);
      
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
    
    return allAccounts;
  }, [transactions, accountOrder, manualAccounts]);

  return (
    <TransactionContext.Provider value={{
      transactions,
      accounts,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      bulkDeleteTransactions,
      bulkImportTransactions,
      reorderTransactionsByDate,
      updateAccountOrder,
      addManualAccount,
      deleteAccount,
      getAccountBalance,
      getAccountStats,
      excludedFromTotal,
      showCardStats,
      toggleAccountInTotal,
      toggleShowCardStats,
      refreshTransactionData: loadData,
      isLoading
    }}>
      {children}
    </TransactionContext.Provider>
  );
};
