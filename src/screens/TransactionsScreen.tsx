import React from 'react';
import TransactionList from '../components/TransactionList';

export default function TransactionsScreen() {
  return <TransactionList hideTitle={true} isTransactionsScreen={true} />;
}

