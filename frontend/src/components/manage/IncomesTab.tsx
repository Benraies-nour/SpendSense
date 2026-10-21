import { useEffect, useState } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import type { Income } from '../../types'
import { fetchIncomes, createIncome, updateIncome, deleteIncome } from '../../lib/api'

type EditState = { source: string; amount: string; date: string }

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function IncomesTab() {
  const [incomes, setIncomes] = useState<Income[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ok'>('loading')
  const [editing, setEditing] = useState<Record<string, EditState>>({})
  const [deleting, setDeleting] = useState<Set<string>>(new Set())

  // add form
  const [addForm, setAddForm] = useState({ source: '', amount: '', date: todayISO(), type: 'other' as 'recurring' | 'other' })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    fetchIncomes()
      .then(data => { setIncomes(data); setStatus('ok') })
      .catch(() => setStatus('error'))
  }, [])

  // Pre-fill add form if Nova just dropped an income draft
  useEffect(() => {
    const raw = sessionStorage.getItem('nova_draft')
    if (!raw) return
    try {
      const d = JSON.parse(raw)
      if (d?.type === 'income') {
        setAddForm({
          source: d.source ?? '',
          amount: d.amount ?? '',
          date:   d.date   ?? todayISO(),
          type:   d.is_recurring ? 'recurring' : 'other',
        })
        sessionStorage.removeItem('nova_draft')
      }
    } catch { sessionStorage.removeItem('nova_draft') }
  }, [])

  const recurring = incomes.filter(i => i.isRecurring)
  const others = incomes.filter(i => !i.isRecurring).sort((a, b) => b.date.localeCompare(a.date))

  // --- edit helpers ---
  function startEdit(inc: Income) {
    setEditing(prev => ({ ...prev, [inc.id]: { source: inc.description, amount: inc.amount, date: inc.date } }))
  }
  function cancelEdit(id: string) {
    setEditing(prev => { const r = { ...prev }; delete r[id]; return r })
  }
  async function saveEdit(inc: Income) {
    const e = editing[inc.id]
    if (!e) return
    try {
      const updated = await updateIncome(inc.id, { source: e.source, amount: e.amount, receivedAt: e.date })
      setIncomes(prev => prev.map(i => i.id === inc.id ? updated : i))
      cancelEdit(inc.id)
    } catch { /* keep editing open on error */ }
  }

  async function handleDelete(id: string) {
    setDeleting(prev => new Set(prev).add(id))
    try {
      await deleteIncome(id)
      setIncomes(prev => prev.filter(i => i.id !== id))
    } finally {
      setDeleting(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  // --- add income ---
  async function handleAdd() {
    const source = addForm.source.trim()
    if (!source) { setAddError('Source is required.'); return }
    if (!addForm.amount || isNaN(parseFloat(addForm.amount))) { setAddError('Enter a valid amount.'); return }
    if (addForm.type === 'other' && !addForm.date) { setAddError('Date is required.'); return }
    setAddError('')
    setAdding(true)
    try {
      const receivedAt = addForm.type === 'recurring' ? `${todayISO()}T00:00:00` : `${addForm.date}T00:00:00`
      const created = await createIncome({ source, amount: addForm.amount, receivedAt, isRecurring: addForm.type === 'recurring' })
      setIncomes(prev => [...prev, created])
      setAddForm({ source: '', amount: '', date: todayISO(), type: addForm.type })
    } catch { setAddError('Failed to create income.') }
    finally { setAdding(false) }
  }

  if (status === 'loading') return (
    <div className="flex items-center gap-3 py-12 text-muted-foreground">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      Loading…
    </div>
  )

  if (status === 'error') return (
    <p className="text-sm text-muted-foreground py-12">Failed to load incomes. Check the backend is running.</p>
  )

  return (
    <div className="flex flex-col gap-8">

      {/* ── Recurring Incomes ── */}
      <section className="flex flex-col gap-4">
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Recurring Incomes</h3>

        <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
          {recurring.length === 0 ? (
            <p style={{ padding: '20px 16px', fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
              No recurring incomes yet.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Source', 'Amount (TND)', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Amount (TND)' ? 'right' : 'left', fontWeight: 500, fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recurring.map((inc, i) => {
                  const isEditing = !!editing[inc.id]
                  const e = editing[inc.id]
                  return (
                    <tr key={inc.id} style={{ borderBottom: i < recurring.length - 1 ? '1px solid var(--color-border)' : undefined }}>
                      <td style={{ padding: '10px 16px' }}>
                        {isEditing
                          ? <input value={e.source} onChange={ev => setEditing(p => ({ ...p, [inc.id]: { ...p[inc.id], source: ev.target.value } }))}
                              style={inputStyle} />
                          : <span>{inc.description}</span>}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {isEditing
                          ? <input value={e.amount} type="number" step="0.001" onChange={ev => setEditing(p => ({ ...p, [inc.id]: { ...p[inc.id], amount: ev.target.value } }))}
                              style={{ ...inputStyle, width: 100, textAlign: 'right' }} />
                          : <span style={{ color: '#10b981', fontWeight: 500 }}>{inc.amount}</span>}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          {isEditing ? (
                            <>
                              <ActionBtn onClick={() => saveEdit(inc)} title="Save"><Check size={13} /></ActionBtn>
                              <ActionBtn onClick={() => cancelEdit(inc.id)} title="Cancel" danger><X size={13} /></ActionBtn>
                            </>
                          ) : (
                            <>
                              <ActionBtn onClick={() => startEdit(inc)} title="Edit"><Pencil size={13} /></ActionBtn>
                              <ActionBtn onClick={() => handleDelete(inc.id)} title="Delete" danger disabled={deleting.has(inc.id)}><Trash2 size={13} /></ActionBtn>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

      </section>

      {/* ── Other Incomes ── */}
      <section className="flex flex-col gap-4">
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Other Incomes</h3>

        <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
          {others.length === 0 ? (
            <p style={{ padding: '20px 16px', fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
              No other incomes yet.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Date', 'Source', 'Amount (TND)', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Amount (TND)' ? 'right' : 'left', fontWeight: 500, fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {others.map((inc, i) => {
                  const isEditing = !!editing[inc.id]
                  const e = editing[inc.id]
                  return (
                    <tr key={inc.id} style={{ borderBottom: i < others.length - 1 ? '1px solid var(--color-border)' : undefined }}>
                      <td style={{ padding: '10px 16px', fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {isEditing
                          ? <input type="date" value={e.date} onChange={ev => setEditing(p => ({ ...p, [inc.id]: { ...p[inc.id], date: ev.target.value } }))}
                              style={inputStyle} />
                          : inc.date}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {isEditing
                          ? <input value={e.source} onChange={ev => setEditing(p => ({ ...p, [inc.id]: { ...p[inc.id], source: ev.target.value } }))}
                              style={inputStyle} />
                          : inc.description}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {isEditing
                          ? <input value={e.amount} type="number" step="0.001" onChange={ev => setEditing(p => ({ ...p, [inc.id]: { ...p[inc.id], amount: ev.target.value } }))}
                              style={{ ...inputStyle, width: 100, textAlign: 'right' }} />
                          : <span style={{ color: '#10b981', fontWeight: 500 }}>{inc.amount}</span>}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          {isEditing ? (
                            <>
                              <ActionBtn onClick={() => saveEdit(inc)} title="Save"><Check size={13} /></ActionBtn>
                              <ActionBtn onClick={() => cancelEdit(inc.id)} title="Cancel" danger><X size={13} /></ActionBtn>
                            </>
                          ) : (
                            <>
                              <ActionBtn onClick={() => startEdit(inc)} title="Edit"><Pencil size={13} /></ActionBtn>
                              <ActionBtn onClick={() => handleDelete(inc.id)} title="Delete" danger disabled={deleting.has(inc.id)}><Trash2 size={13} /></ActionBtn>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

      </section>

      {/* ── Single Add Form ── */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontWeight: 500, fontSize: 14 }}>Add income</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>

          {/* Type selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Type</label>
            <select
              value={addForm.type}
              onChange={e => setAddForm(p => ({ ...p, type: e.target.value as 'recurring' | 'other' }))}
              style={{ ...inputStyle, width: 130 }}
            >
              <option value="recurring">Recurring</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Date — only for Other */}
          {addForm.type === 'other' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Date</label>
              <input type="date" value={addForm.date} onChange={e => setAddForm(p => ({ ...p, date: e.target.value }))}
                style={{ ...inputStyle, width: 140 }} />
            </div>
          )}

          {/* Source */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Source</label>
            <input value={addForm.source} onChange={e => setAddForm(p => ({ ...p, source: e.target.value }))}
              placeholder={addForm.type === 'recurring' ? 'e.g. Salary' : 'e.g. Freelance'}
              style={{ ...inputStyle, width: 180 }} />
          </div>

          {/* Amount */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Amount (TND)</label>
            <input type="number" step="0.001" value={addForm.amount} onChange={e => setAddForm(p => ({ ...p, amount: e.target.value }))}
              placeholder="0.000" style={{ ...inputStyle, width: 110, textAlign: 'right' }} />
          </div>

          <button onClick={handleAdd} disabled={adding} style={{
            padding: '7px 18px', borderRadius: 6, border: 'none',
            background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 500,
            cursor: adding ? 'not-allowed' : 'pointer', opacity: adding ? 0.6 : 1,
            alignSelf: 'flex-end',
          }}>
            {adding ? 'Adding…' : '+ Add'}
          </button>
        </div>
        {addError && <p style={{ margin: 0, fontSize: 12, color: '#f43f5e' }}>{addError}</p>}
      </div>

    </div>
  )
}

// ── small helpers ──────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
}

function ActionBtn({ onClick, title, danger, disabled, children }: {
  onClick: () => void; title: string; danger?: boolean; disabled?: boolean; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        width: 26, height: 26,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 6,
        border: '1px solid var(--color-border)',
        background: 'transparent',
        color: danger ? '#f43f5e' : 'var(--color-text-muted)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

