import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('profileImage') || '')
  const fileInputRef = useRef(null)
  const nome = localStorage.getItem('userName') || ''
  const isAdmin = localStorage.getItem('isAdmin') === 'true'

  const chipLabel = isAdmin ? 'Administrador' : nome ? 'Bem-vindo' : 'Sistema'
  const titleLabel = isAdmin ? 'Painel Administrativo' : 'Sistema de Presenças'
  const displayName = nome || (isAdmin ? 'Administrador' : 'Usuário')

  const initials = displayName
    .split(' ')
    .map((segment) => segment.trim()[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

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

  function handleAvatarClick() {
    fileInputRef.current?.click()
  }

  function handleAvatarChange(event) {
    const file = event.target.files && event.target.files[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setProfileImage(result)
      if (result) {
        localStorage.setItem('profileImage', result)
      }
    }
    reader.readAsDataURL(file)

    if (event.target.value) {
      event.target.value = ''
    }
  }

  function handleAvatarReset() {
    setProfileImage('')
    localStorage.removeItem('profileImage')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__brand">
          <div>
            <div className="chip">{chipLabel}</div>
            <div className="app-header__title">{titleLabel}</div>
          </div>
        </div>
        <div className="app-header__right">
          <div className="app-header__profile">
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              className="app-header__avatar-button"
              onClick={handleAvatarClick}
            >
              {profileImage ? (
                <img
                  className="app-header__avatar-image"
                  src={profileImage}
                  alt={`Foto de perfil de ${displayName}`}
                />
              ) : (
                <span className="app-header__avatar-placeholder" aria-hidden="true">
                  {initials || '＋'}
                </span>
              )}
              <span className="sr-only">
                {profileImage ? 'Alterar foto de perfil' : 'Adicionar foto de perfil'}
              </span>
            </button>
            <div className="app-header__profile-meta">
              <span className="app-header__profile-name">{displayName}</span>
              <div className="app-header__profile-actions">
                <button
                  type="button"
                  className="app-header__profile-link"
                  onClick={handleAvatarClick}
                >
                  {profileImage ? 'Alterar foto' : 'Adicionar foto'}
                </button>
                {profileImage && (
                  <>
                    <span aria-hidden="true">•</span>
                    <button
                      type="button"
                      className="app-header__profile-link"
                      onClick={handleAvatarReset}
                    >
                      Remover
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          <nav
            id="primary-navigation"
            className={`app-header__nav ${menuOpen ? 'is-open' : ''}`}
            aria-label="Navegação principal"
          >
            {!isAdmin && (
              <>
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
              </>
            )}

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
      </div>
    </header>
  )
}
