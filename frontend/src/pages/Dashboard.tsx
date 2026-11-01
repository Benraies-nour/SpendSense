import { useEffect, useState } from 'react'
import { ReceiptIcon, MoonIcon, SunIcon } from '@phosphor-icons/react'
import { LayoutDashboard, FolderKanban, Settings as SettingsIcon, DollarSign, TrendingUp, Tag, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { AppTab } from '../hooks/useHashRoute'
import { navigate, routeHref } from '../hooks/useHashRoute'
import { clearToken } from '../lib/api'
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

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mobile
}

export function Dashboard({ tab, theme, onToggleTheme }: DashboardProps) {
  const isMobile = useIsMobile()
  const [manageTab, setManageTab] = useState<ManageTab>('expenses')
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)

  // Close sidebar automatically when switching to mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
    else setSidebarOpen(true)
  }, [isMobile])

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

      {/* ── Mobile backdrop ── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.5)',
          }}
        />
      )}

      {/* ── Sidebar ── */}
      <aside style={{
        width: sidebarOpen ? '240px' : '0',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: sidebarOpen ? '1px solid var(--border)' : 'none',
        background: 'var(--card)',
        padding: '0',
        overflow: 'hidden',
        transition: 'width 0.25s ease',
        ...(isMobile ? {
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          zIndex: 50,
          width: sidebarOpen ? '240px' : '0',
        } : {}),
      }}>
        {/* Brand + theme toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
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
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', whiteSpace: 'nowrap' }}>

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
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
          <button
            onClick={() => { clearToken(); navigate('home') }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium w-full border-none cursor-pointer transition-colors text-muted-foreground hover:text-foreground hover:bg-accent bg-transparent"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>

      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {/* Toggle button */}
        <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'none', border: '1px solid var(--border)', cursor: 'pointer',
              color: 'var(--muted-foreground)', flexShrink: 0,
            }}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
        </div>
        <div style={{ padding: isMobile ? '16px' : '16px 64px 28px' }}>
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
