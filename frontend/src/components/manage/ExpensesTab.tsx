import { useEffect, useState } from 'react'
import { Camera, PenLine, Pencil, Trash2 } from 'lucide-react'
import type { Category, Expense } from '../../types'
import { fetchCategories, fetchExpenses, deleteExpense } from '../../lib/api'
import { Button } from '@/components/ui/button'
import { ManualEntryDialog } from '../ManualEntryDialog'
import { ScanReceiptDialog } from '../ScanReceiptDialog'
import { ReceiptDetailModal } from '../ReceiptDetailModal'

export function ExpensesTab() {
  const [expenses, setExpenses]   = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [status, setStatus]       = useState<'loading' | 'error' | 'ok'>('loading')
  const [showManual, setShowManual] = useState(false)
  const [showScan, setShowScan]   = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [scanAlert, setScanAlert] = useState('')
  const [receiptModal, setReceiptModal] = useState<number | null>(null)

  // Filters
  const today = new Date()
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const [startDate, setStartDate] = useState(`${currentMonth}-01`)
  const [endDate, setEndDate]     = useState(`${currentMonth}-${new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()}`)
  const [catFilter, setCatFilter] = useState('')
  const [srcFilter, setSrcFilter] = useState('')

  useEffect(() => {
    setStatus('loading')
    Promise.all([fetchExpenses(), fetchCategories()])
      .then(([exps, cats]) => { setExpenses(exps); setCategories(cats); setStatus('ok') })
      .catch(() => setStatus('error'))
  }, [])

  if (status === 'loading') return (
    <div className="flex items-center gap-3 py-12 text-muted-foreground">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      Loading…
    </div>
  )
  if (status === 'error') return (
    <p className="text-sm text-muted-foreground py-12">Failed to load expenses. Check the backend is running.</p>
  )

  // Apply filters
  const filtered = expenses.filter(e => {
    if (e.date < startDate || e.date > endDate) return false
    if (catFilter && String(e.category) !== catFilter) return false
    if (srcFilter && e.source !== srcFilter) return false
    return true
  })

  function catName(id: number) {
    return categories.find(c => c.id === id)?.name ?? '—'
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Add buttons */}
      <div className="flex flex-wrap gap-2">
        <Button className="gap-2" onClick={() => { setScanAlert(''); setShowScan(true) }}><Camera size={15} /> Scan receipt</Button>
        <Button variant="outline" className="gap-2" onClick={() => setShowManual(true)}><PenLine size={15} /> Manual entry</Button>
      </div>

      {showManual && (
        <ManualEntryDialog
          categories={categories}
          onCreated={expense => { setExpenses(prev => [expense, ...prev]); setShowManual(false) }}
          onClose={() => setShowManual(false)}
        />
      )}

      {editingExpense && (
        <ManualEntryDialog
          categories={categories}
          expenseId={editingExpense.id}
          initialValues={{
            description: editingExpense.description,
            amount: editingExpense.amount,
            category_id: editingExpense.category,
            date: editingExpense.date,
            is_recurring: editingExpense.isRecurring,
            due_day: editingExpense.dueDay,
          }}
          onCreated={() => {}}
          onUpdated={updated => {
            setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e))
            setEditingExpense(null)
          }}
          onClose={() => setEditingExpense(null)}
        />
      )}

      {showScan && (
        <ScanReceiptDialog
          categories={categories}
          onConfirmed={(count, alerts) => {
            setShowScan(false)
            // Reload expenses to show the new ones
            fetchExpenses().then(setExpenses).catch(() => {})
            // Build a notification message
            const alertMsg = alerts.length
              ? ' Warning: ' + alerts.map(a => `${a.category_name} over by ${a.over_by} TND`).join(', ') + '.'
              : ''
            setScanAlert(`${count} expense${count !== 1 ? 's' : ''} saved.${alertMsg}`)
          }}
          onClose={() => setShowScan(false)}
        />
      )}

      {scanAlert && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--foreground)', background: 'var(--muted)', borderRadius: 8, padding: '8px 12px' }}>
          {scanAlert}
        </p>
      )}

      {receiptModal !== null && (
        <ReceiptDetailModal
          receiptId={receiptModal}
          onClose={() => setReceiptModal(null)}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end bg-card border border-border rounded-lg p-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          From
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="bg-background border border-border rounded px-2 py-1 text-sm text-foreground" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          To
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="bg-background border border-border rounded px-2 py-1 text-sm text-foreground" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Category
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="bg-background border border-border rounded px-2 py-1 text-sm text-foreground">
            <option value="">All</option>
            {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Source
          <select value={srcFilter} onChange={e => setSrcFilter(e.target.value)}
            className="bg-background border border-border rounded px-2 py-1 text-sm text-foreground">
            <option value="">All</option>
            <option value="receipt">Receipt</option>
            <option value="voice">Voice</option>
            <option value="manual">Manual</option>
          </select>
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-border rounded-lg">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6">No expenses for this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-left">Source</th>
                <th className="px-4 py-2 text-left">Recurring</th>
                <th className="px-4 py-2 text-right">Amount (TND)</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.sort((a, b) => b.date.localeCompare(a.date)).map(exp => (
                <tr key={exp.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{exp.date}</td>
                  <td className="px-4 py-2.5">{exp.description || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className="bg-primary/15 text-primary text-xs px-2 py-0.5 rounded-full">{catName(exp.category)}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {exp.source === 'receipt' && exp.receiptId ? (
                      <button
                        onClick={() => setReceiptModal(exp.receiptId!)}
                        className="text-xs px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 transition-colors capitalize cursor-pointer"
                      >
                        receipt
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground capitalize">{exp.source}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {exp.isRecurring
                      ? <span className="text-xs text-teal-400">✓ {exp.dueDay ? `day ${exp.dueDay}` : 'yes'}</span>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-medium text-rose-400">{exp.amount}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <button
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setEditingExpense(exp)}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="p-1.5 rounded hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 transition-colors"
                        onClick={async () => {
                          await deleteExpense(exp.id)
                          setExpenses(prev => prev.filter(e => e.id !== exp.id))
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
