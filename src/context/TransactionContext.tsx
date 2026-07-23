import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { doc, setDoc, deleteDoc, writeBatch, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
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
  restoreTransactionsBackup: (newTransactions: AccountTransaction[], newPreferences: any, onProgress?: (progress: number) => void) => Promise<void>;
  accountOrder: string[];
  manualAccounts: string[];
  isLoading: boolean;
}

const TransactionContext = createContext<TransactionContextType>({
  transactions: [],
  accounts: [],
  addTransaction: async () => { },
  updateTransaction: async () => { },
  deleteTransaction: async () => { },
  bulkDeleteTransactions: async () => { },
  bulkImportTransactions: async () => { },
  reorderTransactionsByDate: async () => { },
  updateAccountOrder: async () => { },
  addManualAccount: async () => { },
  deleteAccount: async () => { },
  getAccountBalance: () => 0,
  getAccountStats: () => ({ balance: 0, totalCredit: 0, totalDebit: 0 }),
  excludedFromTotal: [],
  showCardStats: true,
  toggleAccountInTotal: async () => { },
  toggleShowCardStats: async () => { },
  refreshTransactionData: async () => { },
  restoreTransactionsBackup: async () => { },
  accountOrder: [],
  manualAccounts: [],
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

  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const loadData = () => {
      if (user && user.uid) {
        setIsLoading(true);

        const transRef = collection(db, 'users', user.uid, 'transactions');
        const unsubsTrans = onSnapshot(transRef, (snapshot) => {
          setTransactions(prev => {
            let next = [...prev];
            let hasChanges = false;

            snapshot.docChanges().forEach(change => {
              hasChanges = true;
              const data = { id: change.doc.id, ...change.doc.data() } as AccountTransaction;
              if (change.type === 'added') {
                if (!next.some(t => t.id === data.id)) next.push(data);
              }
              if (change.type === 'modified') {
                const idx = next.findIndex(t => t.id === data.id);
                if (idx !== -1) next[idx] = data;
              }
              if (change.type === 'removed') {
                next = next.filter(t => t.id !== data.id);
              }
            });

            if (!hasChanges) return prev;
            next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return next;
          });
          setIsLoading(false);
        });
        unsubs.push(unsubsTrans);

        const prefRef = doc(db, 'users', user.uid, 'settings', 'preferences');
        const unsubsPref = onSnapshot(prefRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.accountOrder !== undefined) setAccountOrder(data.accountOrder);
            if (data.manualAccounts !== undefined) setManualAccounts(data.manualAccounts);
            if (data.excludedFromTotal !== undefined) setExcludedFromTotal(data.excludedFromTotal);
            if (data.showCardStats !== undefined) setShowCardStats(data.showCardStats);
          }
          setIsLoading(false);
        });
        unsubs.push(unsubsPref);
      } else {
        // Not logged in
        setTransactions([]);
        setIsLoading(false);
      }
    };

    loadData();

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user]);

  const loadData = async () => { };

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
    // Optimistic update
    setTransactions(newTxs);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'transactions', newTx.id), newTx).catch(console.error);
    }
  };

  const updateTransaction = async (id: string, amount: number, description: string, date: Date, type: 'Debit' | 'Credit', account: string) => {
    const updated = transactions.map(tx =>
      tx.id === id ? { ...tx, amount, description, date: date.toISOString(), type, account } : tx
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    // Optimistic update
    setTransactions(updated);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'transactions', id), { amount, description, date: date.toISOString(), type, account }, { merge: true }).catch(console.error);
    }
  };

  const deleteTransaction = async (id: string) => {
    const updated = transactions.filter(tx => tx.id !== id);
    // Optimistic update
    setTransactions(updated);

    if (user && user.uid) {
      deleteDoc(doc(db, 'users', user.uid, 'transactions', id)).catch(console.error);
    }
  };

  const bulkDeleteTransactions = async (ids: string[]) => {
    const updated = transactions.filter(tx => !ids.includes(tx.id));
    // Optimistic update
    setTransactions(updated);

    if (user && user.uid) {
      const uid = user.uid;
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.delete(doc(db, 'users', uid, 'transactions', id));
      });
      batch.commit().catch(console.error);
    }
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

    // Optimistic update
    setTransactions(merged);

    if (user && user.uid) {
      const uid = user.uid;
      
      const chunkedWrites = [];
      for (let i = 0; i < merged.length; i += 400) {
        chunkedWrites.push(merged.slice(i, i + 400));
      }
      for (const chunk of chunkedWrites) {
        const batch = writeBatch(db);
        chunk.forEach(tx => batch.set(doc(db, 'users', uid, 'transactions', tx.id), tx));
        await batch.commit().catch(console.error);
      }
    }
  };

  const restoreTransactionsBackup = async (newTransactions: AccountTransaction[], newPreferences: any, onProgress?: (progress: number) => void) => {
    // 1. Optimistic updates
    newTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(newTransactions);

    if (newPreferences?.accountOrder) setAccountOrder(newPreferences.accountOrder);
    if (newPreferences?.manualAccounts) setManualAccounts(newPreferences.manualAccounts);
    if (newPreferences?.excludedFromTotal) setExcludedFromTotal(newPreferences.excludedFromTotal);
    if (newPreferences?.showCardStats !== undefined) setShowCardStats(newPreferences.showCardStats);

    // 2. Sync to Firebase
    if (user && user.uid) {
      const uid = user.uid;

      // 1. Clear existing transactions in batches
      const currentIds = transactions.map(t => t.id);
      
      const totalBatches = 
        Math.ceil(currentIds.length / 400) + 
        Math.ceil(newTransactions.length / 400) + 1; // +1 for preferences
        
      let completedBatches = 0;
      const reportProgress = () => {
        completedBatches++;
        if (onProgress) onProgress((completedBatches / totalBatches) * 100);
      };

      for (let i = 0; i < currentIds.length; i += 400) {
        const batch = writeBatch(db);
        currentIds.slice(i, i + 400).forEach(id => {
          batch.delete(doc(db, 'users', uid, 'transactions', id));
        });
        await batch.commit();
        reportProgress();
      }

      // 3. Batch Insert all new transactions
      for (let i = 0; i < newTransactions.length; i += 400) {
        const batch = writeBatch(db);
        newTransactions.slice(i, i + 400).forEach(tx => {
          const docId = tx.id ? String(tx.id) : (Date.now().toString() + Math.floor(Math.random() * 10000).toString());
          const validTx = { ...tx, id: docId };
          batch.set(doc(db, 'users', uid, 'transactions', docId), validTx);
        });
        await batch.commit();
        reportProgress();
      }

      // 4. Update preferences
      await setDoc(doc(db, 'users', uid, 'settings', 'preferences'), {
         accountOrder: newPreferences?.accountOrder || [],
         manualAccounts: newPreferences?.manualAccounts || [],
         excludedFromTotal: newPreferences?.excludedFromTotal || [],
         showCardStats: newPreferences?.showCardStats ?? true
      }, { merge: true });
      reportProgress();
    }
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
    // Optimistic update
    setTransactions(newTransactions);
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
    // Optimistic update
    setAccountOrder(newOrder);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), {
        accountOrder: newOrder
      }, { merge: true }).catch(console.error);
    }
  };

  const addManualAccount = async (account: string) => {
    if (manualAccounts.includes(account) || transactions.some(t => t.account === account)) {
      return; // Already exists
    }
    const newManualAccounts = [...manualAccounts, account];
    // Optimistic update
    setManualAccounts(newManualAccounts);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), {
        manualAccounts: newManualAccounts
      }, { merge: true }).catch(console.error);
    }
  };

  const deleteAccount = async (account: string) => {
    const updated = transactions.filter(tx => tx.account !== account);
    const newOrder = accountOrder.filter(a => a !== account);
    const newManualAccounts = manualAccounts.filter(a => a !== account);
    const newExcluded = excludedFromTotal.filter(a => a !== account);

    // Optimistic update
    setTransactions(updated);
    setAccountOrder(newOrder);
    setManualAccounts(newManualAccounts);
    setExcludedFromTotal(newExcluded);

    if (user && user.uid) {
      const uid = user.uid;
      // Also delete the transactions that belonged to this account from Firebase
      const txsToDelete = transactions.filter(tx => tx.account === account);
      if (txsToDelete.length > 0) {
        const batch = writeBatch(db);
        txsToDelete.forEach(tx => batch.delete(doc(db, 'users', uid, 'transactions', tx.id)));
        batch.commit().catch(console.error);
      }

      setDoc(doc(db, 'users', uid, 'settings', 'preferences'), {
        accountOrder: newOrder,
        manualAccounts: newManualAccounts,
        excludedFromTotal: newExcluded
      }, { merge: true }).catch(console.error);
    }
  };

  const toggleAccountInTotal = async (account: string) => {
    let newExcluded = [...excludedFromTotal];
    if (newExcluded.includes(account)) {
      newExcluded = newExcluded.filter(a => a !== account);
    } else {
      newExcluded.push(account);
    }
    // Optimistic update
    setExcludedFromTotal(newExcluded);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), {
        excludedFromTotal: newExcluded
      }, { merge: true }).catch(console.error);
    }
  };

  const toggleShowCardStats = async () => {
    const newVal = !showCardStats;
    // Optimistic update
    setShowCardStats(newVal);

    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), {
        showCardStats: newVal
      }, { merge: true }).catch(console.error);
    }
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

  const refreshTransactionData = async () => {
    await loadData();
  };

  const contextValue = useMemo(() => ({
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
    refreshTransactionData,
    restoreTransactionsBackup,
    accountOrder,
    manualAccounts,
    isLoading
  }), [
    transactions, accounts, excludedFromTotal, showCardStats, isLoading, loadData, accountOrder, manualAccounts
  ]);

  return (
    <TransactionContext.Provider value={contextValue}>
      {children}
    </TransactionContext.Provider>
  );
};
