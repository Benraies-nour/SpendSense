import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, PiggyBank, Wallet, Receipt } from 'lucide-react'

const ICONS: Record<string, React.ReactNode> = {
  'Total Income':     <TrendingUp size={20} className="text-primary" />,
  'Total Expenses':   <TrendingDown size={20} className="text-destructive" />,
  'Total Budget':     <PiggyBank size={20} className="text-primary" />,
  'Remaining Budget': <Wallet size={20} className="text-primary" />,
  'Transactions':     <Receipt size={20} className="text-primary" />,
}

type StatCardProps = {
  title: string
  value: string
  index?: number
}

export function StatCard({ title, value, index = 0 }: StatCardProps) {
  return (
    <Card
      className="flex-1 transition-all duration-200 hover:scale-[1.03] hover:shadow-lg animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDuration: '0.4s', animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-normal text-primary">
            {title}
          </CardTitle>
          {ICONS[title]}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}
