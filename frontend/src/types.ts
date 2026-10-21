// Shapes shared by the mock data and, later, the API responses.
// Amounts are strings with 3 decimals (TND millimes), e.g. "12.500":
// the backend serializes Decimal values this way, and floats would lose millimes.

export type Amount = string

export type User = {
  username: string
  name: string
  email: string
  /** Monthly net salary; category budgets are a percentage of it. */
  salary: Amount
}

export type CategoryId = number

export type Category = {
  id: CategoryId
  name: string
  /** Monthly budget as a fixed amount in TND. */
  budgetAmount: Amount
}

export type ExpenseSource = 'receipt' | 'voice' | 'manual'

export type Expense = {
  id: string
  date: string
  description: string
  amount: Amount
  category: CategoryId
  source: ExpenseSource
  isRecurring: boolean
  dueDay: number | null
  receiptId: number | null
}

export type Income = {
  id: string
  date: string
  description: string
  amount: Amount
  isRecurring: boolean
}

export type RecurringExpense = {
  id: string
  name: string
  amount: Amount
  category: CategoryId
  /** Day of the month the payment is due. */
  dueDay: number
  paid: boolean
}
