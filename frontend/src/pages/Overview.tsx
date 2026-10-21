import { useEffect, useState } from 'react'
import type { Category, CategoryId, Expense, Income } from '../types'
import { OverviewFilters } from '../components/OverviewFilters'
import { StatCard } from '../components/StatCard'
import { fetchCategories, fetchExpenses, fetchIncomes } from '../lib/api'
import { getOverview, getExpensesByCategory, getBudgetVsActual, getExpensesTrend } from '../lib/overview'
import { ExpensesByCategory } from '../components/ExpensesByCategory'
import { BudgetVsActual } from '../components/BudgetVsActual'
import { ExpensesTrend } from '../components/ExpensesTrend'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'



export function Overview() {
  const today = new Date()
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const firstDay = `${currentMonth}-01`
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const lastDayStr = `${currentMonth}-${String(lastDay).padStart(2, '0')}`

  const [month, setMonth] = useState(currentMonth)
  const [startDate, setStartDate] = useState(firstDay)
  const [endDate, setEndDate] = useState(lastDayStr)
  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [incomes, setIncomes] = useState<Income[]>([])
  const [selectedCategories, setSelectedCategories] = useState<CategoryId[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ok'>('loading')

  useEffect(() => {
    setStatus('loading')
    Promise.all([fetchCategories(), fetchExpenses(), fetchIncomes()])
      .then(([cats, exps, incs]) => {
        setCategories(cats)
        setExpenses(exps)
        setIncomes(incs)
        setStatus('ok')
      })
      .catch(() => setStatus('error'))
  }, [])


  function checkIfFullMonth(start: string, end: string) {
  if (!start || !end) return ''
  const [y, m] = start.split('-')
  const firstDay = `${y}-${m}-01`
  const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate()
  const lastDayStr = `${y}-${m}-${String(lastDay).padStart(2, '0')}`
  return start === firstDay && end === lastDayStr ? `${y}-${m}` : ''
}


  function handleMonthChange(value: string) {
    setMonth(value)
    if (value) {
      const [year, mon] = value.split('-')
      setStartDate(`${value}-01`)
      const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate()
      setEndDate(`${value}-${String(lastDay).padStart(2, '0')}`)
    }
  }

  function handleStartDateChange(value: string) {
  setStartDate(value)
  setMonth(checkIfFullMonth(value, endDate))
}

function handleEndDateChange(value: string) {
  setEndDate(value)
  setMonth(checkIfFullMonth(startDate, value))
}

const data = getOverview(expenses, incomes, categories, startDate, endDate, selectedCategories)
const categorySlices = getExpensesByCategory(expenses, categories, startDate, endDate, selectedCategories)
const budgetBars = getBudgetVsActual(expenses, incomes, categories, startDate, endDate, selectedCategories)
const trendPoints = getExpensesTrend(expenses, incomes, startDate, endDate, selectedCategories)

  if (status === 'loading') return (
    <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      Loading dashboard…
    </div>
  )

  if (status === 'error') return (
    <div className="flex flex-col items-center justify-center py-24 gap-2">
      <p className="text-lg font-medium">Failed to load dashboard</p>
      <p className="text-sm text-muted-foreground">Check that the backend is running, then refresh.</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <OverviewFilters
        month={month}
        onMonthChange={handleMonthChange}
        startDate={startDate}
        onStartDateChange={handleStartDateChange}
        endDate={endDate}
        onEndDateChange={handleEndDateChange}
        categories={categories}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Total Income"     value={`${data.totalIncome} TND`} />
        <StatCard title="Total Expenses"   value={`${data.totalSpent} TND`} />
        <StatCard title="Total Budget"     value={`${data.totalBudget} TND`} />
        <StatCard title="Remaining Budget" value={`${data.remainingBudget} TND`} />
        <StatCard title="Transactions"     value={String(data.transactionCount)} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Expenses by Category</CardTitle></CardHeader>
          <CardContent><ExpensesByCategory data={categorySlices} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Budget vs Actual</CardTitle></CardHeader>
          <CardContent><BudgetVsActual data={budgetBars} /></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Income vs Expenses</CardTitle></CardHeader>
        <CardContent><ExpensesTrend data={trendPoints} /></CardContent>
      </Card>
    </div>
  )
}



