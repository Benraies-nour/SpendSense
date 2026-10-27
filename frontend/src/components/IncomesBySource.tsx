import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { IncomeSlice } from '../lib/overview'

const COLORS = ['#10b981', '#2d8fd1', '#f59e0b', '#6cb2d8', '#f43f5e', '#0d9488', '#9aadb8', '#1d4e78']

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
