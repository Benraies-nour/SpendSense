import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { BudgetBar } from '../lib/overview'

type Props = {
  data: BudgetBar[]
}

export function BudgetVsActual({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm">No data for this period.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <XAxis dataKey="name" />
        <YAxis unit=" TND" />
        <Tooltip formatter={(value) => [`${Number(value).toFixed(3)} TND`]} />
        <Legend />
        <Bar dataKey="budget" name="Budget" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="spent"  name="Spent"  fill="#14b8a6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
