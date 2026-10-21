import { useRef, useState } from 'react'
import type { Category } from '../types'
import { scanReceipt, confirmReceipt } from '../lib/api'
import type { DraftItem } from '../lib/api'

type Props = {
  categories: Category[]
  onConfirmed: (expensesCreated: number, alerts: { category_name: string; over_by: string }[]) => void
  onClose: () => void
}

type Step = 'pick' | 'scanning' | 'review' | 'saving' | 'done'

// ── helpers ──────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

/** Compress an image File to stay under 4 MB (Azure F0 limit). */
async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 2000
      let { width, height } = img
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file),
        'image/jpeg',
        0.85,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

// ── component ────────────────────────────────────────────────

export function ScanReceiptDialog({ categories, onConfirmed, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('pick')
  const [error, setError] = useState('')

  // Draft state (filled after scan)
  const [date, setDate] = useState(todayISO())
  const [items, setItems] = useState<DraftItem[]>([])
  const [printedTotal, setPrintedTotal] = useState<string | null>(null)
  const [ocxText, setOcxText] = useState('')
  const [extractionMethod, setExtractionMethod] = useState<'ocr' | 'llm_fallback'>('ocr')

  // ── scan ──────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setStep('scanning')

    try {
      const compressed = file.type.startsWith('image/') ? await compressImage(file) : file
      const draft = await scanReceipt(compressed)

      setDate(draft.purchased_at ? draft.purchased_at.slice(0, 10) : todayISO())
      setItems(draft.items.map(item => ({ ...item, category_id: categories[0]?.id ?? null })))
      setPrintedTotal(draft.printed_total)
      setOcxText(draft.ocr_text)
      setExtractionMethod(draft.extraction_method)
      setStep('review')
    } catch (err: any) {
      setError(err.message ?? 'Scan failed.')
      setStep('pick')
    }
  }

  // ── item editing ──────────────────────────────────────────

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item))
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function addItem() {
    setItems(prev => [...prev, { name: '', quantity: null, total_price: '0.000', category_id: categories[0]?.id ?? null }])
  }

  // ── totals ────────────────────────────────────────────────

  const computedTotal = items
    .reduce((sum, item) => sum + parseFloat(item.total_price || '0'), 0)
    .toFixed(3)

  const totalMismatch =
    printedTotal !== null &&
    Math.abs(parseFloat(printedTotal) - parseFloat(computedTotal)) > 0.001

  // ── confirm ───────────────────────────────────────────────

  async function handleConfirm() {
    if (!items.length) { setError('Add at least one item.'); return }
    for (const item of items) {
      if (!item.name.trim()) { setError('Every item needs a name.'); return }
      if (!item.category_id) { setError('Assign a category to every item.'); return }
      if (isNaN(parseFloat(item.total_price)) || parseFloat(item.total_price) <= 0) {
        setError('Every item needs a valid price.'); return
      }
    }
    setError('')
    setStep('saving')

    try {
      const result = await confirmReceipt({
        purchased_at: `${date}T00:00:00Z`,
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity ?? null,
          total_price: item.total_price,
          category_id: item.category_id!,
        })),
        ocr_text: ocxText,
      })
      setStep('done')
      onConfirmed(result.expenses_created, result.budget_alerts)
    } catch (err: any) {
      setError(err.message ?? 'Failed to save.')
      setStep('review')
    }
  }

  // ── render ────────────────────────────────────────────────

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={dialog}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Scan receipt</h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* Step: pick file */}
        {step === 'pick' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted-foreground)' }}>
              Take a photo of a receipt or upload an image (JPEG, PNG — max 4 MB).
            </p>
            <button style={primaryBtn} onClick={() => fileRef.current?.click()}>
              Choose photo
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/bmp,image/tiff,image/heif,application/pdf"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {error && <p style={errorStyle}>{error}</p>}
          </div>
        )}

        {/* Step: scanning */}
        {step === 'scanning' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0' }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted-foreground)' }}>Analyzing receipt…</p>
          </div>
        )}

        {/* Step: review */}
        {(step === 'review' || step === 'saving') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {extractionMethod === 'llm_fallback' && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)', background: 'var(--muted)', borderRadius: 6, padding: '6px 10px' }}>
                Items were extracted from text — Azure could not detect the receipt layout. Review carefully.
              </p>
            )}

            {/* Date */}
            <label style={labelStyle}>
              Date
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={inputStyle}
              />
            </label>

            {/* Items table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Items</span>
                <button style={ghostBtn} onClick={addItem}>+ Add item</button>
              </div>

              {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', background: 'var(--muted)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <input
                      value={item.name}
                      onChange={e => updateItem(i, { name: e.target.value })}
                      placeholder="Item name"
                      style={{ ...inputStyle, fontSize: 12 }}
                    />
                    <select
                      value={item.category_id ?? ''}
                      onChange={e => updateItem(i, { category_id: Number(e.target.value) })}
                      style={{ ...inputStyle, fontSize: 12 }}
                    >
                      <option value="" disabled>Category…</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <input
                      value={item.quantity ?? ''}
                      onChange={e => updateItem(i, { quantity: e.target.value || null })}
                      placeholder="Qty"
                      style={{ ...inputStyle, fontSize: 12, textAlign: 'right' }}
                    />
                    <input
                      value={item.total_price}
                      onChange={e => updateItem(i, { total_price: e.target.value })}
                      placeholder="0.000"
                      style={{ ...inputStyle, fontSize: 12, textAlign: 'right' }}
                    />
                  </div>
                  <button
                    onClick={() => removeItem(i)}
                    style={{ ...closeBtn, marginTop: 2, flexShrink: 0 }}
                    title="Remove item"
                  >✕</button>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Total</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {computedTotal} TND
                </span>
                {totalMismatch && (
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#f59e0b' }}>
                    Printed total: {printedTotal} TND — may include discounts.
                  </p>
                )}
              </div>
            </div>

            {error && <p style={errorStyle}>{error}</p>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={ghostBtn} onClick={onClose}>Cancel</button>
              <button
                style={{ ...primaryBtn, opacity: step === 'saving' ? 0.6 : 1 }}
                onClick={handleConfirm}
                disabled={step === 'saving'}
              >
                {step === 'saving' ? 'Saving…' : 'Confirm & save'}
              </button>
            </div>
          </div>
        )}

      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── styles ───────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 50, padding: 16,
}

const dialog: React.CSSProperties = {
  background: 'var(--popover)', color: 'var(--popover-foreground)',
  borderRadius: 12, padding: 20, width: '100%', maxWidth: 480,
  maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px', borderRadius: 6, fontSize: 13,
  border: '1px solid var(--border)', background: 'var(--background)',
  color: 'var(--foreground)', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4,
  fontSize: 12, color: 'var(--muted-foreground)',
}

const primaryBtn: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
  cursor: 'pointer', background: 'var(--primary)', color: 'var(--primary-foreground)',
  border: 'none', width: '100%',
}

const ghostBtn: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 8, fontSize: 12,
  cursor: 'pointer', background: 'transparent', color: 'var(--foreground)',
  border: '1px solid var(--border)',
}

const closeBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 14, color: 'var(--muted-foreground)', padding: '2px 4px',
}

const errorStyle: React.CSSProperties = {
  margin: 0, fontSize: 12, color: 'var(--destructive)',
  background: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
  borderRadius: 6, padding: '6px 10px',
}
