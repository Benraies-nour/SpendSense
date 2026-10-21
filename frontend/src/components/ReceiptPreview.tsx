import { ForkKnifeIcon } from '@phosphor-icons/react'

const items = [
  { name: 'Oat milk', price: '3.20' },
  { name: 'Sourdough loaf', price: '5.80' },
  { name: 'Apples, 1 kg', price: '4.10' },
  { name: 'Coffee beans', price: '11.50' },
]

/** Decorative sample receipt shown on the landing page. */
export function ReceiptPreview() {
  return (
    <div className="receipt">
      <div className="receipt-head">
        <span className="receipt-store">Corner Market</span>
        <span className="muted text-xs">14 Oct 2026 · 18:42</span>
      </div>
      <div className="receipt-items">
        {items.map((item) => (
          <div key={item.name} className="receipt-line">
            <span>{item.name}</span>
            <span className="tabular">{item.price}</span>
          </div>
        ))}
      </div>
      <div className="receipt-total">
        <span>Total</span>
        <span className="amount tabular">$24.60</span>
      </div>
      <div className="receipt-tag">
        <span className="chip">
          <ForkKnifeIcon />
          Food
        </span>
        <span className="muted text-xs">Auto-categorized</span>
      </div>
    </div>
  )
}
