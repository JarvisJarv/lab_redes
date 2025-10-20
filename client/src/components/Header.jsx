import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Header() {
  const navigate = useNavigate()
  const nome = localStorage.getItem('userName') || ''
  const isAdmin = localStorage.getItem('isAdmin') === 'true'

  function handleLogout() {
    localStorage.removeItem('userDID')
    localStorage.removeItem('userName')
    localStorage.removeItem('isAdmin')
    // Logout intencional: não removemos a chave privada (`privateKeyJwk`) nem a `matricula` aqui
    // para permitir login local posterior no mesmo dispositivo. Apenas limpamos os dados visíveis da sessão.
    if (isAdmin) {
      localStorage.removeItem('matricula')
    }
    navigate('/')
  }

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div>
          <div className="chip">{isAdmin ? 'Administrador' : nome ? 'Bem-vindo' : 'Sistema'}</div>
          <div className="app-header__title">Sistema de Presenças</div>
        </div>
        <nav className="app-header__nav">
          {isAdmin ? (
            <Link to="/admin" className="app-header__link">
              Painel administrativo
            </Link>
          ) : (
            <>
              <Link to="/home" className="app-header__link">
                Início
              </Link>
              <Link to="/historico" className="app-header__link">
                Histórico
              </Link>
            </>
          )}
          <button onClick={handleLogout} className="btn-secondary" type="button">
            Sair
          </button>
        </nav>
      </div>
    </header>
  )
}
