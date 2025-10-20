import React, { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import PhotoModal from './PhotoModal'
import { useProfilePhoto } from '../contexts/ProfilePhotoContext'

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const {
    nome,
    isAdmin,
    profileInitials,
    displayedPhoto,
    profilePhoto,
    hasPhoto,
    canEditPhoto,
    isPhotoModalOpen,
    photoModalAlt,
    openPhotoModal,
    closePhotoModal,
    triggerPhotoUpload,
  } = useProfilePhoto()

  const chipLabel = isAdmin ? 'Administrador' : nome ? 'Bem-vindo' : 'Sistema'
  const titleLabel = isAdmin ? 'Painel Administrativo' : 'Sistema de Presenças'

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
        <div className="app-header__brand">
          <div className="app-header__profile">
            <div className="app-header__profile-row">
              <div className="app-header__avatar-wrapper">
                <button
                  type="button"
                  className="app-header__avatar"
                  onClick={() => {
                    if (hasPhoto) {
                      openPhotoModal()
                    } else {
                      triggerPhotoUpload()
                    }
                  }}
                  title={
                    isAdmin
                      ? 'Visualizar logo do administrador'
                      : hasPhoto
                      ? 'Visualizar foto de perfil'
                      : 'Adicionar foto de perfil'
                  }
                >
                  {hasPhoto ? (
                    <img
                      src={displayedPhoto}
                      alt={
                        isAdmin
                          ? 'Logo padrão do administrador'
                          : `Foto de perfil de ${nome || 'usuário'}`
                      }
                    />
                  ) : (
                    <span aria-hidden="true">{profileInitials}</span>
                  )}
                  <span className="app-header__avatar-indicator" aria-hidden="true">
                    {hasPhoto ? 'Visualizar' : canEditPhoto ? 'Adicionar' : ''}
                  </span>
                </button>
              </div>
              {canEditPhoto && !profilePhoto ? (
                <button
                  type="button"
                  className="app-header__avatar-button app-header__avatar-button--add"
                  onClick={triggerPhotoUpload}
                >
                  Adicionar foto
                </button>
              ) : null}
            </div>
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
      <PhotoModal
        isOpen={isPhotoModalOpen}
        src={displayedPhoto}
        alt={photoModalAlt}
        onClose={closePhotoModal}
      />
    </header>
  )
}
