import { NavLink, Outlet } from 'react-router-dom'

export function App() {
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
          </nav>
        </div>
      </header>
      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  )
}
