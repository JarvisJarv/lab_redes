import React from 'react'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="app-footer">
      <div className="app-footer__inner">
        <div>
          <div className="app-footer__title">Sistema de Presenças</div>
          <p className="app-footer__subtitle">
            Registre, consulte e gerencie seus comprovantes com segurança e fluidez.
          </p>
        </div>

        <div className="app-footer__meta">
          <span className="app-footer__chip">Atualizado {year}</span>
          <span className="app-footer__muted">Todos os dados permanecem somente neste dispositivo.</span>
        </div>
      </div>
    </footer>
  )
}
