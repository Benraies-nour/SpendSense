import { ExpensesTab } from '../components/manage/ExpensesTab'
import { IncomesTab } from '../components/manage/IncomesTab'
import { CategoriesTab } from '../components/manage/CategoriesTab'

export type ManageTab = 'expenses' | 'incomes' | 'categories'

type ManageProps = {
  tab: ManageTab
  onTabChange: (tab: ManageTab) => void
}

const TAB_META: Record<ManageTab, { title: string; subtitle: string }> = {
  expenses:   { title: 'Expenses',   subtitle: 'Track and manage your spending' },
  incomes:    { title: 'Incomes',    subtitle: 'Record and review your income sources' },
  categories: { title: 'Categories', subtitle: 'Organise your budget categories' },
}

export function Manage({ tab }: ManageProps) {
  const { title, subtitle } = TAB_META[tab]
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-normal text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
      {tab === 'expenses'   && <ExpensesTab />}
      {tab === 'incomes'    && <IncomesTab />}
      {tab === 'categories' && <CategoriesTab />}
    </div>
  )
}
