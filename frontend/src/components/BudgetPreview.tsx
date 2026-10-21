import type { Icon } from '@phosphor-icons/react'
import { BusIcon, ForkKnifeIcon, LightningIcon } from '@phosphor-icons/react'

type CategoryBudget = {
  name: string
  icon: Icon
  spent: string
  limit: string
  percent: number
}

const categories: CategoryBudget[] = [
  { name: 'Food', icon: ForkKnifeIcon, spent: '$312', limit: '$450', percent: 69 },
  { name: 'Transport', icon: BusIcon, spent: '$64', limit: '$120', percent: 53 },
  { name: 'Bills', icon: LightningIcon, spent: '$540', limit: '$600', percent: 90 },
]

/** Decorative sample budget card shown on the landing page. */
export function BudgetPreview() {
  return (
    <div className="card elev-md budget-card">
      <span className="budget-card-title muted">October budget</span>
      {categories.map(({ name, icon: CategoryIcon, spent, limit, percent }) => (
        <div key={name} className="budget-row">
          <div className="budget-row-head">
            <span className="chip">
              <CategoryIcon />
              {name}
            </span>
            <span className="budget-row-amount muted tabular">
              {spent} / {limit}
            </span>
          </div>
          <div className="budget-bar">
            <div className="budget-bar-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
