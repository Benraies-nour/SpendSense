import { useEffect, useState } from 'react'
import { fetchReceipt } from '../lib/api'
import type { ReceiptDetail } from '../lib/api'

type Props = {
  receiptId: number
  onClose: () => void
}

export function ReceiptDetailModal({ receiptId, onClose }: Props) {
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null)
  const [error, setError]     = useState('')

  useEffect(() => {
    fetchReceipt(receiptId)
      .then(setReceipt)
      .catch(() => setError('Could not load receipt.'))
  }, [receiptId])

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={dialog}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Receipt #{receiptId}</h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* Loading */}
        {!receipt && !error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted-foreground)', fontSize: 13 }}>
            <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
            Loading…
          </div>
        )}

        {/* Error */}
        {error && <p style={{ margin: 0, fontSize: 13, color: 'var(--destructive)' }}>{error}</p>}

        {/* Content */}
        {receipt && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)' }}>
              {new Date(receipt.purchased_at).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </p>

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 12px', padding: '4px 8px', fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>Item</span>
                <span style={{ textAlign: 'right' }}>Qty</span>
                <span style={{ textAlign: 'right' }}>Price (TND)</span>
              </div>

              {receipt.items.map(item => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 12px', padding: '6px 8px', borderRadius: 6, background: 'var(--muted)', fontSize: 13 }}>
                  <span style={{ alignSelf: 'center' }}>{item.name}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', alignSelf: 'center', color: 'var(--muted-foreground)', fontSize: 12 }}>
                    {item.quantity ?? '—'}
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', alignSelf: 'center', fontWeight: 500 }}>
                    {item.total_price}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Total</span>
              <span style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {receipt.total} TND
              </span>
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
  borderRadius: 12, padding: 20, width: '100%', maxWidth: 420,
  maxHeight: '85vh', overflowY: 'auto',
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
}

const closeBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 14, color: 'var(--muted-foreground)', padding: '2px 4px',
}
