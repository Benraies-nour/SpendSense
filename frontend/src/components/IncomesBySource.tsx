import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { IncomeSlice } from '../lib/overview'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#f43f5e', '#14b8a6', '#0ea5e9', '#e879f9']

type Props = {
  data: IncomeSlice[]
}

export function IncomesBySource({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm">No income for this period.</p>
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
          innerRadius={0}
          outerRadius={110}
          paddingAngle={3}
        />
        <Tooltip formatter={(value) => [`${Number(value).toFixed(3)} TND`]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
