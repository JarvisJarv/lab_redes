import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Header() {
  const navigate = useNavigate()
  const nome = localStorage.getItem('userName') || ''

  function handleLogout() {
    localStorage.removeItem('userDID')
    localStorage.removeItem('userName')
    // Logout intencional: não removemos a chave privada (`privateKeyJwk`) nem a `matricula` aqui
    // para permitir login local posterior no mesmo dispositivo. Apenas limpamos os dados visíveis da sessão.
    navigate('/')
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-black/40 backdrop-blur-sm z-30">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="font-bold text-white text-lg">Sistema de Presenças</div>
        <nav className="flex items-center gap-3">
          <Link to="/home" className="text-white px-3 py-1 rounded hover:opacity-90">Home</Link>
          <Link to="/historico" className="text-white px-3 py-1 rounded hover:opacity-90">Histórico</Link>
          <button onClick={handleLogout} className="btn-primary text-sm">Sair</button>
        </nav>
      </div>
    </header>
  )
}
