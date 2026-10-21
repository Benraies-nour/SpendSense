import { useEffect, useState } from 'react'

/** Tabs of the signed-in area, in navigation order. */
export const appTabs = ['overview', 'manage', 'settings'] as const
export type AppTab = (typeof appTabs)[number]

export type Route = 'home' | 'login' | 'signup' | AppTab

export const routeHref: Record<Route, string> = {
  home: '#/',
  login: '#/login',
  signup: '#/signup',
  overview: '#/app/overview',
  manage: '#/app/manage',
  settings: '#/app/settings',
}

export function isAppTab(route: Route): route is AppTab {
  return (appTabs as readonly Route[]).includes(route)
}

function parseHash(hash: string): Route {
  const routes = Object.keys(routeHref) as Route[]
  return routes.find((route) => routeHref[route] === hash) ?? 'home'
}

/** Minimal hash-based routing: the page shown follows `location.hash`. */
export function useHashRoute() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return route
}

export function navigate(route: Route) {
  window.location.hash = routeHref[route]
}
