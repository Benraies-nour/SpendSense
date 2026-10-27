import type { Category, Expense, Income } from '../types'

function toMillimes(amount: string): number {
  return parseInt(amount.replace('.', ''), 10)
}

export function sumAmounts(amounts: string[]): string {
  const total = amounts.reduce((acc, a) => acc + toMillimes(a), 0)
  return (total / 1000).toFixed(3)
}

export type OverviewData = {
  totalIncome: string       
  totalSpent: string
  totalBudget: string
  remainingBudget: string   
  transactionCount: number
}

export function getOverview(
  expenses: Expense[],
  incomes: Income[],
  categories: Category[],
  startDate: string,
  endDate: string,
  selectedCategories: number[]
): OverviewData {

  const filteredExp = expenses.filter(e => e.date >= startDate && e.date <= endDate)
  const filteredInc = incomes.filter(i => i.date >= startDate && i.date <= endDate)

  const byCategory = selectedCategories.length === 0
    ? filteredExp
    : filteredExp.filter(e => selectedCategories.includes(e.category))

  const totalIncome = sumAmounts(filteredInc.map(i => i.amount))
  const totalSpent = sumAmounts(byCategory.map(e => e.amount))

  const activeCats = selectedCategories.length === 0
    ? categories
    : categories.filter(c => selectedCategories.includes(c.id))

  const budgetMillimes = activeCats.reduce((acc, c) => acc + toMillimes(c.budgetAmount), 0)
  const totalBudget = (budgetMillimes / 1000).toFixed(3)

  const remainingBudget = ((toMillimes(totalBudget) - toMillimes(totalSpent)) / 1000).toFixed(3)

  const receiptIds = new Set(
    byCategory.filter(e => e.source === 'receipt' && e.receiptId !== null).map(e => e.receiptId)
  )
  const nonReceiptCount = byCategory.filter(e => e.source !== 'receipt').length
  const transactionCount = nonReceiptCount + receiptIds.size

  return {
    totalIncome,
    totalSpent,
    totalBudget,
    remainingBudget,
    transactionCount,
  }
}


export type CategorySlice = {
  name: string
  value: number
}

export function getExpensesByCategory(
  expenses: Expense[],
  categories: Category[],
  startDate: string,
  endDate: string,
  selectedCategories: number[]
): CategorySlice[] {
  const filtered = expenses.filter(e =>
    e.date >= startDate && e.date <= endDate &&
    (selectedCategories.length === 0 || selectedCategories.includes(e.category))
  )

  return categories
    .map(cat => ({
      name: cat.name,
      value: filtered
        .filter(e => e.category === cat.id)
        .reduce((acc, e) => acc + toMillimes(e.amount), 0) / 1000,
    }))
    .filter(slice => slice.value > 0)
}

export type IncomeSlice = {
  name: string
  value: number
}

export function getIncomesBySource(
  incomes: Income[],
  startDate: string,
  endDate: string,
): IncomeSlice[] {
  const filtered = incomes.filter(i => i.date >= startDate && i.date <= endDate)

  const bySource: Record<string, number> = {}
  filtered.forEach(i => {
    const key = i.description || 'Other'
    bySource[key] = (bySource[key] ?? 0) + toMillimes(i.amount) / 1000
  })

  return Object.entries(bySource)
    .map(([name, value]) => ({ name, value }))
    .filter(s => s.value > 0)
}

export type TrendPoint = {
  date: string
  expenses: number
  income: number
}

export function getExpensesTrend(
  expenses: Expense[],
  incomes: Income[],
  startDate: string,
  endDate: string,
  selectedCategories: number[]
): TrendPoint[] {
  const filteredExp = expenses.filter(e =>
    e.date >= startDate && e.date <= endDate &&
    (selectedCategories.length === 0 || selectedCategories.includes(e.category))
  )
  const filteredInc = incomes.filter(i => i.date >= startDate && i.date <= endDate)

  const byDay: Record<string, { expenses: number; income: number }> = {}

  filteredExp.forEach(e => {
    byDay[e.date] ??= { expenses: 0, income: 0 }
    byDay[e.date].expenses += toMillimes(e.amount) / 1000
  })
  filteredInc.forEach(i => {
    byDay[i.date] ??= { expenses: 0, income: 0 }
    byDay[i.date].income += toMillimes(i.amount) / 1000
  })

  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, expenses: v.expenses, income: v.income }))
}

export type BudgetBar = {
  name: string
  budget: number
  spent: number
}

export function getBudgetVsActual(
  expenses: Expense[],
  _incomes: Income[],
  categories: Category[],
  startDate: string,
  endDate: string,
  selectedCategories: number[]
): BudgetBar[] {
  const filtered = expenses.filter(e =>
    e.date >= startDate && e.date <= endDate &&
    (selectedCategories.length === 0 || selectedCategories.includes(e.category))
  )

  const activeCats = selectedCategories.length === 0
    ? categories
    : categories.filter(c => selectedCategories.includes(c.id))

  return activeCats.map(cat => ({
    name: cat.name,
    budget: toMillimes(cat.budgetAmount) / 1000,
    spent: filtered
      .filter(e => e.category === cat.id)
      .reduce((acc, e) => acc + toMillimes(e.amount), 0) / 1000,
  })).filter(b => b.budget > 0 || b.spent > 0)
}
