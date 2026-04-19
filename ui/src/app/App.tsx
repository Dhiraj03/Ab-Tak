import { NavLink, Outlet, Navigate } from 'react-router-dom'

export function App() {
  // Check if user has completed onboarding
  const hasOnboarded = localStorage.getItem('ab-tak-onboarded') === 'true'
  const isOnboarding = window.location.pathname === '/onboarding'
  
  // Redirect to onboarding if not completed
  if (!hasOnboarded && !isOnboarding) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header-content">
          <div className="brand">
            <h1>Ab Tak</h1>
            <span>AI Media Desk</span>
          </div>
          <nav className="site-nav" aria-label="Primary">
            <NavLink to="/" end>
              Bulletin
            </NavLink>
            <NavLink to="/live">Live</NavLink>
            <NavLink to="/observability">Observability</NavLink>
            <NavLink to="/eval">Eval</NavLink>
          </nav>
        </div>
      </header>
      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  )
}
