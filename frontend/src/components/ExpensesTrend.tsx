import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { TrendPoint } from '../lib/overview'

type Props = {
  data: TrendPoint[]
}

export function ExpensesTrend({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm">No data for this period.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <XAxis dataKey="date" />
        <YAxis unit=" TND" />
        <Tooltip formatter={(value) => [`${Number(value).toFixed(3)} TND`]} />
        <Legend />
        <Line
          type="monotone"
          dataKey="expenses"
          name="Expenses"
          stroke="#f43f5e"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="income"
          name="Income"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
