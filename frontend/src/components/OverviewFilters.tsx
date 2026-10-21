import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import type { Category, CategoryId } from '../types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'

type OverviewFiltersProps = {
  month: string
  onMonthChange: (value: string) => void
  startDate: string
  onStartDateChange: (value: string) => void
  endDate: string
  onEndDateChange: (value: string) => void
  categories: Category[]
  selectedCategories: CategoryId[]
  onCategoriesChange: (value: CategoryId[]) => void
}

export function OverviewFilters({
  month, onMonthChange,
  startDate, onStartDateChange,
  endDate, onEndDateChange,
  categories,
  selectedCategories, onCategoriesChange,
}: OverviewFiltersProps) {
  const [open, setOpen] = useState(false)

  function toggle(id: CategoryId) {
    if (selectedCategories.includes(id)) {
      onCategoriesChange(selectedCategories.filter(c => c !== id))
    } else {
      onCategoriesChange([...selectedCategories, id])
    }
  }

  const label = selectedCategories.length === 0
    ? 'Toutes les catégories'
    : `${selectedCategories.length} sélectionnée${selectedCategories.length > 1 ? 's' : ''}`


  return (
    <div className="flex flex-col gap-4">


      {/* Filters row */}
      <div className="flex flex-wrap gap-6 items-start justify-between">

        {/* Date filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 text-sm">
            Mois
            <input
              type="month"
              value={month}
              onChange={(e) => onMonthChange(e.target.value)}
              className="rounded-lg border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1 text-sm">
            Du
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="rounded-lg border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1 text-sm">
            Au
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="rounded-lg border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-col gap-1 text-sm items-end">
        Catégories
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            className="group/button inline-flex w-52 items-center justify-between rounded-lg border bg-clip-padding px-3 py-2 text-sm font-medium text-foreground hover:bg-accent cursor-pointer"
            render={<button type="button" role="combobox" aria-expanded={open} />}
          >
            {label}
            <ChevronsUpDown className="opacity-50 h-4 w-4" />
          </PopoverTrigger>
          <PopoverContent className="w-52 p-0">
            <Command>
              <CommandInput placeholder="Chercher..." />
              <CommandList>
                <CommandEmpty>Aucune catégorie.</CommandEmpty>
                <CommandGroup>
                  {categories.map(cat => (
                    <CommandItem key={cat.id} value={cat.name} onSelect={() => toggle(cat.id)}>
                      {cat.name}
                      {selectedCategories.includes(cat.id) && <Check className="ml-auto" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {selectedCategories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {selectedCategories.map(id => {
              const cat = categories.find(c => c.id === id)
              return cat ? (
                <Badge key={id} variant="secondary" className="text-xs cursor-pointer"
                  onClick={() => toggle(id)}>
                  {cat.name} ×
                </Badge>
              ) : null
            })}
          </div>
        )}
        </div>

      </div>

    </div>
  )
}

