import { isAppTab, useHashRoute } from './hooks/useHashRoute'
import { useTheme } from './hooks/useTheme'
import { Auth } from './pages/Auth'
import { Dashboard } from './pages/Dashboard'
import { Landing } from './pages/Landing'

function App() {
  const route = useHashRoute()
  const { theme, toggleTheme } = useTheme()

  if (route === 'home') return <Landing theme={theme} onToggleTheme={toggleTheme} />
  if (isAppTab(route)) return <Dashboard tab={route} theme={theme} onToggleTheme={toggleTheme} />
  return <Auth mode={route} theme={theme} onToggleTheme={toggleTheme} />
}

export default App
