import { useEffect, useState } from 'react'
import { ReceiptIcon, MoonIcon, SunIcon } from '@phosphor-icons/react'
import { LayoutDashboard, FolderKanban, Settings as SettingsIcon, DollarSign, TrendingUp, Tag, LogOut } from 'lucide-react'
import type { AppTab } from '../hooks/useHashRoute'
import { navigate, routeHref } from '../hooks/useHashRoute'
import { clearToken, clearVoiceHistory } from '../lib/api'
import type { Theme } from '../hooks/useTheme'
import { Overview } from './Overview'
import { Manage } from './Manage'
import { Settings } from './Settings'
import type { ManageTab } from './Manage'
import { Mascot } from '../components/Mascot'

type DashboardProps = {
  tab: AppTab
  theme: Theme
  onToggleTheme: () => void
}

export function Dashboard({ tab, theme, onToggleTheme }: DashboardProps) {
  const [manageTab, setManageTab] = useState<ManageTab>('expenses')

  // Nova routes drafts (income/category) to the right sub-tab via this event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as ManageTab
      setManageTab(detail)
    }
    window.addEventListener('nova-set-manage-tab', handler)
    return () => window.removeEventListener('nova-set-manage-tab', handler)
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: '240px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        background: 'var(--card)',
        padding: '0',
      }}>
        {/* Brand + theme toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px', borderBottom: '1px solid var(--border)',
        }}>
          <a href={routeHref.home} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            textDecoration: 'none', color: 'var(--foreground)', fontWeight: 700, fontSize: '18px',
          }}>
            <ReceiptIcon size={20} style={{ color: 'var(--primary)' }} />
            SpendSense
          </a>
          <button
            onClick={onToggleTheme}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'none', border: '1px solid var(--border)', cursor: 'pointer',
              color: 'var(--muted-foreground)',
            }}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <MoonIcon size={15} /> : <SunIcon size={15} />}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>

          {/* Overview */}
          <a
            href={routeHref.overview}
            className={navItemClass(tab === 'overview')}
          >
            <LayoutDashboard size={18} />
            Overview
          </a>

          {/* Manage */}
          <a
            href={routeHref.manage}
            className={navItemClass(tab === 'manage')}
          >
            <FolderKanban size={18} />
            Manage
          </a>

          {/* Manage sub-items — visible when on manage tab */}
          {tab === 'manage' && (
            <div style={{ paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {([
                { id: 'expenses',   label: 'Expenses',   icon: <DollarSign size={15} /> },
                { id: 'incomes',    label: 'Incomes',    icon: <TrendingUp size={15} /> },
                { id: 'categories', label: 'Categories', icon: <Tag size={15} /> },
              ] as { id: ManageTab; label: string; icon: React.ReactNode }[]).map(item => (
                <button
                  key={item.id}
                  onClick={() => setManageTab(item.id)}
                  className={subItemClass(manageTab === item.id)}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* Settings */}
          <a
            href={routeHref.settings}
            className={navItemClass(tab === 'settings')}
          >
            <SettingsIcon size={18} />
            Settings
          </a>
        </nav>

        {/* Log out */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => { clearVoiceHistory(); clearToken(); navigate('home') }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium w-full border-none cursor-pointer transition-colors text-muted-foreground hover:text-foreground hover:bg-accent bg-transparent"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>

      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        <div style={{ padding: '28px 64px' }}>
          {tab === 'overview'  && <Overview />}
          {tab === 'manage'    && <Manage tab={manageTab} onTabChange={setManageTab} />}
          {tab === 'settings'  && <Settings />}
        </div>
      </main>

      <Mascot />

    </div>
  )
}

function navItemClass(active: boolean) {
  return [
    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-base font-semibold no-underline transition-colors',
    active
      ? 'bg-primary/10 text-primary'
      : 'text-muted-foreground hover:text-foreground hover:bg-accent',
  ].join(' ')
}

function subItemClass(active: boolean) {
  return [
    'flex items-center gap-2.5 px-4 py-2 rounded-md text-sm font-medium text-left w-full border-none cursor-pointer transition-colors',
    active
      ? 'bg-primary/20 text-primary'
      : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent',
  ].join(' ')
}
