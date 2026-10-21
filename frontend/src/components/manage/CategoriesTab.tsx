import { useEffect, useState } from 'react'
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../../lib/api'
import type { Category } from '../../types'

type RowState = {
  name: string
  budgetAmount: string
  dirty: boolean
  saving: boolean
}

export function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([])
  const [rows, setRows] = useState<Record<number, RowState>>({})
  const [status, setStatus] = useState<'loading' | 'error' | 'ok'>('loading')
  const [addName, setAddName] = useState('')
  const [addAmount, setAddAmount] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  function initRows(cats: Category[]) {
    const r: Record<number, RowState> = {}
    for (const c of cats) r[c.id] = { name: c.name, budgetAmount: c.budgetAmount, dirty: false, saving: false }
    setRows(r)
  }

  useEffect(() => {
    fetchCategories()
      .then(cats => { setCategories(cats); initRows(cats); setStatus('ok') })
      .catch(() => setStatus('error'))
  }, [])

  // Pre-fill add form if Nova just dropped a category draft
  useEffect(() => {
    const raw = sessionStorage.getItem('nova_draft')
    if (!raw) return
    try {
      const d = JSON.parse(raw)
      if (d?.type === 'category') {
        setAddName(d.name ?? '')
        setAddAmount(d.budget_amount ?? '')
        sessionStorage.removeItem('nova_draft')
      }
    } catch { sessionStorage.removeItem('nova_draft') }
  }, [])

  function handleAmountChange(id: number, value: string) {
    setRows(prev => ({ ...prev, [id]: { ...prev[id], budgetAmount: value, dirty: true } }))
  }

  function handleNameChange(id: number, value: string) {
    setRows(prev => ({ ...prev, [id]: { ...prev[id], name: value, dirty: true } }))
  }

  async function handleSave(id: number) {
    const row = rows[id]
    const amount = parseFloat(row.budgetAmount)
    if (isNaN(amount) || amount < 0) return
    setRows(prev => ({ ...prev, [id]: { ...prev[id], saving: true } }))
    try {
      const updated = await updateCategory(id, { name: row.name, budgetAmount: amount.toFixed(3) })
      setCategories(prev => prev.map(c => c.id === id ? updated : c))
      setRows(prev => ({ ...prev, [id]: { ...prev[id], dirty: false, saving: false } }))
    } catch {
      setRows(prev => ({ ...prev, [id]: { ...prev[id], saving: false } }))
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteCategory(id)
      setCategories(prev => prev.filter(c => c.id !== id))
      setRows(prev => { const r = { ...prev }; delete r[id]; return r })
    } catch { /* silently fail */ }
  }

  async function handleAdd() {
    const name = addName.trim()
    const amount = parseFloat(addAmount)
    if (!name) { setAddError('Name is required.'); return }
    if (isNaN(amount) || amount < 0) { setAddError('Enter a valid amount.'); return }
    setAddError('')
    setAdding(true)
    try {
      const created = await createCategory(name, amount.toFixed(3))
      setCategories(prev => [...prev, created])
      setRows(prev => ({ ...prev, [created.id]: { name: created.name, budgetAmount: created.budgetAmount, dirty: false, saving: false } }))
      setAddName('')
      setAddAmount('')
    } catch {
      setAddError('Failed to create category.')
    } finally {
      setAdding(false)
    }
  }

  if (status === 'loading') return (
    <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading categories…</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Categories</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
          Set a fixed monthly budget for each category in TND.
        </p>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
              {['Name', 'Monthly Budget (TND)', ''].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, i) => {
              const row = rows[cat.id]
              if (!row) return null
              return (
                <tr
                  key={cat.id}
                  style={{
                    borderBottom: i < categories.length - 1 ? '1px solid var(--color-border)' : undefined,
                    background: row.dirty ? 'color-mix(in srgb, var(--color-surface) 40%, transparent)' : undefined,
                  }}
                >
                  <td style={{ padding: '10px 16px' }}>
                    <input
                      value={row.name}
                      onChange={e => handleNameChange(cat.id, e.target.value)}
                      style={inlineInput}
                      onFocus={e => (e.target.style.borderBottomColor = 'var(--color-accent)')}
                      onBlur={e => (e.target.style.borderBottomColor = 'transparent')}
                    />
                  </td>

                  <td style={{ padding: '10px 16px' }}>
                    <input
                      type="number"
                      min={0}
                      step={0.001}
                      value={row.budgetAmount}
                      onChange={e => handleAmountChange(cat.id, e.target.value)}
                      style={amountInput}
                    />
                  </td>

                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {row.dirty && (
                        <button
                          onClick={() => handleSave(cat.id)}
                          disabled={row.saving}
                          style={{ ...saveBtn, opacity: row.saving ? 0.6 : 1 }}
                        >
                          {row.saving ? 'Saving…' : 'Save'}
                        </button>
                      )}
                      <button onClick={() => handleDelete(cat.id)} style={deleteBtn}>×</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add category */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontWeight: 500, fontSize: 14 }}>Add category</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Name</label>
            <input
              value={addName}
              onChange={e => setAddName(e.target.value)}
              placeholder="e.g. Education"
              style={fieldInput}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Budget (TND)</label>
            <input
              type="number"
              min={0}
              step={0.001}
              value={addAmount}
              onChange={e => setAddAmount(e.target.value)}
              placeholder="0.000"
              style={{ ...fieldInput, width: 110, textAlign: 'right' }}
            />
          </div>
          <button onClick={handleAdd} disabled={adding} style={{ ...saveBtn, padding: '7px 18px', alignSelf: 'flex-end', opacity: adding ? 0.6 : 1 }}>
            {adding ? 'Adding…' : '+ Add'}
          </button>
        </div>
        {addError && <p style={{ margin: 0, fontSize: 12, color: '#f43f5e' }}>{addError}</p>}
      </div>
    </div>
  )
}

const inlineInput: React.CSSProperties = {
  background: 'transparent', border: 'none',
  borderBottom: '1px solid transparent',
  color: 'var(--color-text)', fontSize: 14,
  width: '100%', outline: 'none', padding: '2px 0', cursor: 'text',
}

const amountInput: React.CSSProperties = {
  width: 120, padding: '4px 8px', borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)', fontSize: 13,
  textAlign: 'right', outline: 'none',
}

const fieldInput: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)', fontSize: 13,
  width: 180, outline: 'none',
}

const saveBtn: React.CSSProperties = {
  padding: '4px 12px', borderRadius: 6,
  border: 'none', background: '#3b82f6',
  color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer',
}

const deleteBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: 'var(--color-text-muted)',
  fontSize: 15, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
