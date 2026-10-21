import type { ReactNode } from 'react'
import { MoonIcon, ReceiptIcon, SunIcon } from '@phosphor-icons/react'
import type { Theme } from '../hooks/useTheme'
import { routeHref } from '../hooks/useHashRoute'

type SiteHeaderProps = {
  theme: Theme
  onToggleTheme: () => void
  /** Where the brand link points; the landing page by default. */
  brandHref?: string
  children?: ReactNode
}

export function SiteHeader({ theme, onToggleTheme, brandHref = routeHref.home, children }: SiteHeaderProps) {
  return (
    <header className="nav site-header">
      <a href={brandHref} className="nav-brand">
        <ReceiptIcon size={22} />
        <span>SpendSense</span>
      </a>
      {children}
      <button
        type="button"
        className="btn btn-icon theme-toggle"
        aria-label="Toggle dark mode"
        onClick={onToggleTheme}
      >
        {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
      </button>
    </header>
  )
}
