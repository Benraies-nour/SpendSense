import { ExpensesTab } from '../components/manage/ExpensesTab'
import { IncomesTab } from '../components/manage/IncomesTab'
import { CategoriesTab } from '../components/manage/CategoriesTab'

export type ManageTab = 'expenses' | 'incomes' | 'categories'

type ManageProps = {
  tab: ManageTab
  onTabChange: (tab: ManageTab) => void
}

export function Manage({ tab }: ManageProps) {
  return (
    <div className="flex flex-col gap-6">
      {tab === 'expenses'   && <ExpensesTab />}
      {tab === 'incomes'    && <IncomesTab />}
      {tab === 'categories' && <CategoriesTab />}
    </div>
  )
}
