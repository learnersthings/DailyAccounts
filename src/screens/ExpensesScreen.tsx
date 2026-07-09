import React from 'react';
import ExpenseList from '../components/ExpenseList';

export default function ExpensesScreen() {
  return <ExpenseList hideTitle={true} isExpensesScreen={true} />;
}

