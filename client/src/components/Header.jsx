import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

export default function Header() {
  const navigate = useNavigate()
  const nome = localStorage.getItem('userName') || ''

  function handleLogout() {
    localStorage.removeItem('userDID')
    localStorage.removeItem('userName')
    localStorage.removeItem('isAdmin')
    navigate('/')
  }

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div>
          <div className="chip">{nome ? 'Bem-vindo' : 'Sistema'}</div>
          <div className="app-header__title">Sistema de Presenças</div>
        </div>
        <nav className="app-header__nav">
          <NavLink
            to="/home"
            end
            className={({ isActive }) =>
              isActive ? 'app-header__link active' : 'app-header__link'
            }
          >
            Início
          </NavLink>

          <NavLink
            to="/historico"
            className={({ isActive }) =>
              isActive ? 'app-header__link active' : 'app-header__link'
            }
          >
            Histórico
          </NavLink>

          <button onClick={handleLogout} className="btn-secondary" type="button">
            Sair
          </button>
        </nav>
      </div>
    </header>
  )
}