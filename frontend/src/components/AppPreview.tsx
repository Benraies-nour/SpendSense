import { useEffect, useState } from 'react'
import { ArrowUpIcon, BusIcon, ForkKnifeIcon, LightningIcon } from '@phosphor-icons/react'

type ScreenId = 'overview' | 'categories' | 'incomes'
const SCREENS: ScreenId[] = ['overview', 'categories', 'incomes']
const INTERVAL_MS = 3200

/** Decorative animated app preview shown on the landing page. */
export function AppPreview() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % SCREENS.length), INTERVAL_MS)
    return () => clearInterval(t)
  }, [])

  const current = SCREENS[idx]

  return (
    <div className="app-preview">
      <div className="app-frame">
        <div className="app-titlebar">
          <span className="app-titlebar-dot red" />
          <span className="app-titlebar-dot yellow" />
          <span className="app-titlebar-dot green" />
          <span className="app-titlebar-name">SpendSense</span>
        </div>
        <div className="app-body">
          <OverviewScreen active={current === 'overview'} />
          <CategoriesScreen active={current === 'categories'} />
          <IncomesScreen active={current === 'incomes'} />
        </div>
      </div>
      <div className="app-dots">
        {SCREENS.map((s, i) => (
          <button
            key={s}
            className={`app-dot-btn${i === idx ? ' active' : ''}`}
            onClick={() => setIdx(i)}
            aria-label={s}
          />
        ))}
      </div>
    </div>
  )
}

function OverviewScreen({ active }: { active: boolean }) {
  return (
    <div className={`app-screen${active ? ' active' : ''}`}>
      <div className="app-screen-header">
        <span className="app-screen-title">Overview</span>
        <span className="app-pill">Oct 2026</span>
      </div>
      <div className="app-kpi-grid">
        {[
          { label: 'Income',       value: '1,730' },
          { label: 'Expenses',     value: '916'   },
          { label: 'Budget',       value: '1,170' },
          { label: 'Remaining',    value: '253'   },
          { label: 'Transactions', value: '12'    },
        ].map(k => (
          <div key={k.label} className="app-kpi">
            <span className="app-kpi-val">{k.value}</span>
            <span className="app-kpi-lbl">{k.label}</span>
          </div>
        ))}
      </div>
      <div className="app-charts-row">
        <div className="app-chart-box">
          <span className="app-chart-label">By Category</span>
          <MiniDonut />
        </div>
        <div className="app-chart-box">
          <span className="app-chart-label">Budget vs Actual</span>
          <MiniBars />
        </div>
      </div>
    </div>
  )
}

function CategoriesScreen({ active }: { active: boolean }) {
  const rows = [
    { name: 'Food',      Icon: ForkKnifeIcon, spent: '312.500', budget: '450.000', pct: 69,  warn: false },
    { name: 'Transport', Icon: BusIcon,        spent: '64.200',  budget: '120.000', pct: 54,  warn: false },
    { name: 'Bills',     Icon: LightningIcon,  spent: '540.000', budget: '600.000', pct: 90,  warn: true  },
  ]
  return (
    <div className={`app-screen${active ? ' active' : ''}`}>
      <div className="app-screen-header">
        <span className="app-screen-title">Categories</span>
        <span className="app-add-label">+ Add</span>
      </div>
      <div className="app-cat-list">
        {rows.map(r => (
          <div key={r.name} className="app-cat-row">
            <div className="app-cat-head">
              <span className="app-cat-name">
                <r.Icon size={11} />
                {r.name}
              </span>
              <span className="app-cat-amount">
                {r.spent} / {r.budget}
              </span>
            </div>
            <div className="app-bbar">
              <div
                className="app-bbar-fill"
                style={{
                  width: `${r.pct}%`,
                  background: r.warn ? 'var(--color-danger)' : 'var(--color-accent)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function IncomesScreen({ active }: { active: boolean }) {
  const rows = [
    { label: 'Salary',   amount: '1,200.000', meta: 'Monthly · 01/10/2026' },
    { label: 'Freelance', amount: '150.000',  meta: 'One-off · 05/10/2026' },
    { label: 'Rental',   amount: '380.000',   meta: 'Monthly · 01/10/2026' },
  ]
  return (
    <div className={`app-screen${active ? ' active' : ''}`}>
      <div className="app-screen-header">
        <span className="app-screen-title">Incomes</span>
        <span className="app-add-label">+ Add</span>
      </div>
      <div className="app-income-list">
        {rows.map(r => (
          <div key={r.label} className="app-income-row">
            <span className="app-income-icon"><ArrowUpIcon size={12} /></span>
            <div className="app-income-info">
              <span className="app-income-name">{r.label}</span>
              <span className="app-income-meta">{r.meta}</span>
            </div>
            <span className="app-income-amount">{r.amount}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniDonut() {
  return (
    <div className="mini-donut-wrap">
      <div
        className="mini-donut"
        style={{
          background:
            'conic-gradient(var(--chart-1) 0% 34%, var(--chart-2) 34% 57%, var(--chart-3) 57% 75%, color-mix(in srgb, var(--color-text) 12%, transparent) 75%)',
        }}
      >
        <div className="mini-donut-hole" />
      </div>
      <div className="mini-donut-legend">
        {[
          { color: 'var(--chart-1)', label: 'Food' },
          { color: 'var(--chart-2)', label: 'Bills' },
          { color: 'var(--chart-3)', label: 'Other' },
        ].map(l => (
          <div key={l.label} className="mini-legend-row">
            <span className="mini-legend-dot" style={{ background: l.color }} />
            <span className="mini-legend-lbl">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniBars() {
  const bars = [
    { label: 'Food',      pct: 69 },
    { label: 'Bills',     pct: 90 },
    { label: 'Transport', pct: 54 },
  ]
  return (
    <div className="mini-bars">
      {bars.map(b => (
        <div key={b.label} className="mini-bar-row">
          <span className="mini-bar-lbl">{b.label}</span>
          <div className="mini-bar-track">
            <div
              className="mini-bar-fill"
              style={{
                width: `${b.pct}%`,
                background: b.pct >= 90 ? 'var(--color-danger)' : 'var(--color-accent)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
