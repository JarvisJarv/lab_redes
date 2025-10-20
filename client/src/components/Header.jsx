import React, { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const nome = localStorage.getItem('userName') || ''

  function handleLogout() {
    localStorage.removeItem('userDID')
    localStorage.removeItem('userName')
    localStorage.removeItem('isAdmin')
    navigate('/')
  }

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  function toggleMenu() {
    setMenuOpen((prev) => !prev)
  }

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div>
          <div className="chip">{nome ? 'Bem-vindo' : 'Sistema'}</div>
          <div className="app-header__title">Sistema de Presenças</div>
        </div>
        <nav
          id="primary-navigation"
          className={`app-header__nav ${menuOpen ? 'is-open' : ''}`}
          aria-label="Navegação principal"
        >
          <NavLink
            to="/home"
            end
            className={({ isActive }) =>
              isActive ? 'app-header__link active' : 'app-header__link'
            }
            onClick={() => setMenuOpen(false)}
          >
            Início
          </NavLink>

          <NavLink
            to="/historico"
            className={({ isActive }) =>
              isActive ? 'app-header__link active' : 'app-header__link'
            }
            onClick={() => setMenuOpen(false)}
          >
            Histórico
          </NavLink>

          <button
            onClick={() => {
              setMenuOpen(false)
              handleLogout()
            }}
            className="btn-secondary"
            type="button"
          >
            Sair
          </button>
        </nav>
        <button
          type="button"
          className="app-header__toggle"
          aria-label="Alternar menu de navegação"
          aria-controls="primary-navigation"
          aria-expanded={menuOpen}
          onClick={toggleMenu}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  )
}
