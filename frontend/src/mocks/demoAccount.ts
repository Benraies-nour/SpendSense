// Demo account used until the backend exists. Nothing here is a real secret:
// these credentials ship in the frontend bundle and only unlock sample data.

import type { Category, Expense, Income, RecurringExpense, User } from '../types'

const DEMO_PASSWORD = 'admin'

export const demoUser: User = {
  username: 'admin',
  name: 'Admin',
  email: 'admin@spendsense.tn',
  salary: '2400.000',
}

// IDs match the real database (category table, user_id = 1)
export const demoCategories: Category[] = [
  { id: 1,  name: 'Food',          budgetAmount: '720.000' },
  { id: 2,  name: 'Transport',     budgetAmount: '360.000' },
  { id: 8,  name: 'Shopping',      budgetAmount: '0.000'   },
  { id: 9,  name: 'Leisure',       budgetAmount: '0.000'   },
  { id: 10, name: 'Subscriptions', budgetAmount: '0.000'   },
  { id: 11, name: 'Other',         budgetAmount: '0.000'   },
  { id: 12, name: 'Health',        budgetAmount: '0.000'   },
  { id: 13, name: 'Bills',         budgetAmount: '0.000'   },
  { id: 14, name: 'Housing',       budgetAmount: '0.000'   },
]

export const demoExpenses: Expense[] = [
  { id: 'e01', date: '2026-10-01', description: 'Courses de la semaine', amount: '87.350',  category: 1,  source: 'receipt', isRecurring: false, dueDay: null, receiptId: null },
  { id: 'e02', date: '2026-10-01', description: 'Loyer octobre',         amount: '650.000', category: 14, source: 'manual',  isRecurring: true,  dueDay: 1,    receiptId: null },
  { id: 'e03', date: '2026-10-02', description: 'Pain et croissants',    amount: '4.800',   category: 1,  source: 'voice',   isRecurring: false, dueDay: null, receiptId: null },
  { id: 'e04', date: '2026-10-03', description: 'Course vers le travail',amount: '9.500',   category: 2,  source: 'manual',  isRecurring: false, dueDay: null, receiptId: null },
  { id: 'e05', date: '2026-10-04', description: 'Produits ménagers',     amount: '42.900',  category: 8,  source: 'receipt', isRecurring: false, dueDay: null, receiptId: null },
  { id: 'e06', date: '2026-10-05', description: 'Internet',              amount: '45.000',  category: 10, source: 'manual',  isRecurring: true,  dueDay: 5,    receiptId: null },
  { id: 'e07', date: '2026-10-06', description: 'Lait, œufs, fromage',  amount: '23.650',  category: 1,  source: 'receipt', isRecurring: false, dueDay: null, receiptId: null },
  { id: 'e08', date: '2026-10-07', description: 'Médicaments',           amount: '18.200',  category: 12, source: 'voice',   isRecurring: false, dueDay: null, receiptId: null },
  { id: 'e09', date: '2026-10-08', description: 'Carburant',             amount: '60.000',  category: 2,  source: 'manual',  isRecurring: false, dueDay: null, receiptId: null },
  { id: 'e10', date: '2026-10-09', description: 'Fruits et légumes',     amount: '31.400',  category: 1,  source: 'receipt', isRecurring: false, dueDay: null, receiptId: null },
  { id: 'e11', date: '2026-10-10', description: 'Café avec des amis',    amount: '12.500',  category: 9,  source: 'voice',   isRecurring: false, dueDay: null, receiptId: null },
  { id: 'e12', date: '2026-10-11', description: 'Électricité et gaz',    amount: '96.780',  category: 13, source: 'receipt', isRecurring: false, dueDay: null, receiptId: null },
  { id: 'e13', date: '2026-10-12', description: 'Courses du mois',       amount: '154.320', category: 1,  source: 'receipt', isRecurring: false, dueDay: null, receiptId: null },
  { id: 'e14', date: '2026-10-13', description: 'Cinéma',                amount: '24.000',  category: 9,  source: 'manual',  isRecurring: false, dueDay: null, receiptId: null },
  { id: 'e15', date: '2026-10-14', description: 'Pain et lait',          amount: '12.500',  category: 1,  source: 'voice',   isRecurring: false, dueDay: null, receiptId: null },
  { id: 'e16', date: '2026-10-15', description: 'Chemise',               amount: '89.900',  category: 8,  source: 'receipt', isRecurring: false, dueDay: null, receiptId: null },
  { id: 'e17', date: '2026-10-15', description: 'Eau',                   amount: '28.450',  category: 13, source: 'receipt', isRecurring: false, dueDay: null, receiptId: null },
  { id: 'e18', date: '2026-10-16', description: 'Abonnement transport',  amount: '30.000',  category: 2,  source: 'manual',  isRecurring: false, dueDay: null, receiptId: null },
  { id: 'e19', date: '2026-10-16', description: 'Viande et poisson',     amount: '67.800',  category: 1,  source: 'receipt', isRecurring: false, dueDay: null, receiptId: null },
  { id: 'e20', date: '2026-10-17', description: 'Déjeuner',              amount: '22.000',  category: 9,  source: 'voice',   isRecurring: false, dueDay: null, receiptId: null },
]

export const demoIncomes: Income[] = [
  { id: 'i01', date: '2026-10-01', description: 'Salaire octobre',      amount: '2400.000', isRecurring: true  },
  { id: 'i02', date: '2026-10-10', description: 'Freelance projet web', amount: '350.000',  isRecurring: false },
  { id: 'i03', date: '2026-10-18', description: 'Remboursement ami',    amount: '50.000',   isRecurring: false },
]

export const demoRecurringExpenses: RecurringExpense[] = [
  { id: 'r1', name: 'Loyer',                amount: '650.000', category: 14, dueDay: 1,  paid: true  },
  { id: 'r2', name: 'Internet (Topnet)',     amount: '45.000',  category: 10, dueDay: 5,  paid: true  },
  { id: 'r3', name: 'Abonnement téléphone', amount: '30.000',  category: 10, dueDay: 10, paid: false },
  { id: 'r4', name: 'Salle de sport',       amount: '70.000',  category: 9,  dueDay: 20, paid: false },
]

/** Returns the demo user when the credentials match, null otherwise. */
export function signInDemo(identifier: string, password: string): User | null {
  const id = identifier.trim().toLowerCase()
  const matches = id === demoUser.username || id === demoUser.email
  return matches && password === DEMO_PASSWORD ? demoUser : null
}
