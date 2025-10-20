import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem('profilePhoto') || '')
  const fileInputRef = useRef(null)
  const nome = localStorage.getItem('userName') || ''
  const isAdmin = localStorage.getItem('isAdmin') === 'true'

  const chipLabel = isAdmin ? 'Administrador' : nome ? 'Bem-vindo' : 'Sistema'
  const titleLabel = isAdmin ? 'Painel Administrativo' : 'Sistema de Presenças'
  const profileInitials = nome
    ? nome
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
    : 'SP'

  function handleLogout() {
    localStorage.removeItem('userDID')
    localStorage.removeItem('userName')
    localStorage.removeItem('isAdmin')
    navigate('/')
  }

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  function handleProfilePhotoChange(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setProfilePhoto(result)
      if (result) {
        localStorage.setItem('profilePhoto', result)
      }
    }
    reader.readAsDataURL(file)

    if (event.target) {
      // Permite reenviar a mesma imagem caso o usuário queira trocar posteriormente
      event.target.value = ''
    }
  }

  function handleRemoveProfilePhoto() {
    setProfilePhoto('')
    localStorage.removeItem('profilePhoto')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function toggleMenu() {
    setMenuOpen((prev) => !prev)
  }

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__brand">
          <div className="app-header__profile">
            <label
              htmlFor="profile-photo-input"
              className="app-header__avatar"
              title="Atualizar foto de perfil"
            >
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt={`Foto de perfil de ${nome || 'usuário'}`}
                />
              ) : (
                <span aria-hidden="true">{profileInitials}</span>
              )}
              <span className="app-header__avatar-indicator" aria-hidden="true">
                Atualizar
              </span>
            </label>
            <input
              ref={fileInputRef}
              id="profile-photo-input"
              className="app-header__profile-input"
              type="file"
              accept="image/*"
              onChange={handleProfilePhotoChange}
            />
            {profilePhoto ? (
              <button
                type="button"
                className="app-header__avatar-remove"
                onClick={handleRemoveProfilePhoto}
              >
                Remover foto
              </button>
            ) : (
              <span className="app-header__avatar-hint">Adicionar foto</span>
            )}
          </div>
          <div>
            <div className="chip">{chipLabel}</div>
            <div className="app-header__title">{titleLabel}</div>
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
    </header>
  )
}
