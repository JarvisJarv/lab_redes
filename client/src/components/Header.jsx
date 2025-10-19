import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const navLinks = [
  { href: '/home', label: 'Início' },
  { href: '/historico', label: 'Histórico' },
  { href: '/presenca', label: 'Presença' },
]

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const nome = localStorage.getItem('userName') || ''

  function handleLogout() {
    localStorage.removeItem('userDID')
    localStorage.removeItem('userName')
    // Logout intencional: não removemos a chave privada (`privateKeyJwk`) nem a `matricula` aqui
    // para permitir login local posterior no mesmo dispositivo. Apenas limpamos os dados visíveis da sessão.
    navigate('/')
  }

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 text-slate-100 lg:px-10">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-[0.22em] text-cyan-200">Laboratório de Redes</span>
          <span className="text-lg font-semibold text-white">Sistema de Presenças</span>
        </div>

        <nav className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-sm font-medium text-slate-200">
          {navLinks.map((link) => {
            const active = location.pathname === link.href
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`rounded-full px-4 py-2 transition ${
                  active ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-4">
          {nome && (
            <div className="hidden text-right text-xs font-medium text-slate-300 sm:block">
              <span className="block text-[0.65rem] uppercase tracking-[0.28em] text-cyan-200">Logado como</span>
              <span className="text-sm text-white">{nome}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/30"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}
