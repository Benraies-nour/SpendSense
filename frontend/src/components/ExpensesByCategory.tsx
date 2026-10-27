import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { CategorySlice } from '../lib/overview'

const COLORS = ['#2d8fd1', '#0d9488', '#6cb2d8', '#f59e0b', '#f43f5e', '#10b981', '#9aadb8', '#1d4e78']

type Props = {
  data: CategorySlice[]
}

export function ExpensesByCategory({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm">No expenses for this period.</p>
  }

  const dataWithColors = data.map((slice, i) => ({
    ...slice,
    fill: COLORS[i % COLORS.length],
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={dataWithColors}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={3}
        />
        <Tooltip formatter={(value) => [`${Number(value).toFixed(3)} TND`]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
