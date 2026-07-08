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
  getAccountBalance: (account: string) => number;
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
  getAccountBalance: () => 0,
  refreshTransactionData: async () => {},
  isLoading: true,
});

export const useTransactionContext = () => useContext(TransactionContext);

const TRANSACTIONS_KEY = '@app_bank_transactions';

export const TransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthContext();

  const storageKey = user ? `${TRANSACTIONS_KEY}_${user.email}` : TRANSACTIONS_KEY;

  const loadData = async () => {
    try {
      setIsLoading(true);
      const storedTransactions = await AsyncStorage.getItem(storageKey);
      if (storedTransactions) {
        setTransactions(JSON.parse(storedTransactions));
      } else {
        setTransactions([]);
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
    // Merge without duplicates based on date, description, amount, type, account
    const merged = [...transactions];
    for (const newTx of newTransactions) {
      const newTxDateStr = new Date(newTx.date).toDateString();
      const existingIdx = merged.findIndex(e => 
        new Date(e.date).toDateString() === newTxDateStr &&
        e.amount === newTx.amount &&
        e.type === newTx.type &&
        e.account === newTx.account &&
        e.description.trim().toLowerCase() === newTx.description.trim().toLowerCase()
      );
      if (existingIdx !== -1) {
        merged[existingIdx] = { ...merged[existingIdx], description: newTx.description };
      } else {
        merged.push(newTx);
      }
    }
    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(merged);
    await AsyncStorage.setItem(storageKey, JSON.stringify(merged));
  };

  const getAccountBalance = (account: string) => {
    return transactions
      .filter(tx => tx.account === account)
      .reduce((sum, tx) => tx.type === 'Credit' ? sum + tx.amount : sum - tx.amount, 0);
  };

  const accounts = useMemo(() => {
    const usedAccounts = new Set(transactions.map(t => t.account));
    return Array.from(usedAccounts);
  }, [transactions]);

  return (
    <TransactionContext.Provider value={{
      transactions,
      accounts,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      bulkDeleteTransactions,
      bulkImportTransactions,
      getAccountBalance,
      refreshTransactionData: loadData,
      isLoading
    }}>
      {children}
    </TransactionContext.Provider>
  );
};
