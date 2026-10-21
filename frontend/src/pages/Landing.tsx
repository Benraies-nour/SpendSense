import { ArrowRightIcon } from '@phosphor-icons/react'
import { AppPreview } from '../components/AppPreview'
import { SiteHeader } from '../components/SiteHeader'
import { routeHref } from '../hooks/useHashRoute'
import type { Theme } from '../hooks/useTheme'

type LandingProps = {
  theme: Theme
  onToggleTheme: () => void
}

export function Landing({ theme, onToggleTheme }: LandingProps) {
  return (
    <div className="page page-landing">
      <SiteHeader theme={theme} onToggleTheme={onToggleTheme}>
        <a href={routeHref.login}>Log in</a>
      </SiteHeader>
      <main className="landing-main">
        <section className="hero">
          <h1 className="hero-title">SpendSense</h1>
          <p className="hero-tagline">
            Scan your receipts, see where your money goes, and stay within your budget by category.
          </p>
          <div className="hero-actions">
            <a href={routeHref.signup} className="btn btn-primary">
              Get started <ArrowRightIcon />
            </a>
            <a href={routeHref.login} className="btn btn-ghost">
              Log in
            </a>
          </div>
        </section>
        <section className="preview" aria-hidden="true">
          <AppPreview />
        </section>
      </main>
    </div>
  )
}
