import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { loadProfilePhoto, removeProfilePhoto, saveProfilePhoto } from '../utils/profilePhotoStorage'

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const isAdmin = localStorage.getItem('isAdmin') === 'true'
  const nome = localStorage.getItem('userName') || ''
  const did = !isAdmin ? localStorage.getItem('userDID') || '' : ''
  const matricula = !isAdmin ? localStorage.getItem('matricula') || '' : ''
  const storageSignature = `${isAdmin ? 'admin' : 'user'}|${did}|${matricula}`
  const [profilePhoto, setProfilePhoto] = useState(() => loadProfilePhoto({ isAdmin, did, matricula }))
  const fileInputRef = useRef(null)
  const signatureRef = useRef(storageSignature)

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

  useEffect(() => {
    // Remove chave antiga que compartilhava fotos entre usuários
    try {
      localStorage.removeItem('profilePhoto')
    } catch (err) {
      console.warn('Não foi possível limpar foto de perfil legada.', err)
    }
  }, [])

  useEffect(() => {
    if (signatureRef.current !== storageSignature) {
      signatureRef.current = storageSignature
      setProfilePhoto(loadProfilePhoto({ isAdmin, did, matricula }))
    }
  }, [storageSignature, isAdmin, did, matricula])

  useEffect(() => {
    if (isAdmin || !did) {
      return
    }

    let isCanceled = false

    async function sincronizarFoto() {
      try {
        const response = await fetch(`/api/users?did=${encodeURIComponent(did)}`)
        if (!response.ok) return
        const data = await response.json()
        if (!Array.isArray(data) || data.length === 0) return
        const usuario = data[0]
        const fotoRemota = typeof usuario.profilePhoto === 'string' ? usuario.profilePhoto : ''

        if (isCanceled) return

        if (fotoRemota && fotoRemota !== profilePhoto) {
          saveProfilePhoto({ isAdmin, did, matricula }, fotoRemota)
          setProfilePhoto(fotoRemota)
        } else if (!fotoRemota && profilePhoto) {
          removeProfilePhoto({ isAdmin, did, matricula })
          setProfilePhoto('')
        }
      } catch (err) {
        console.warn('Erro ao sincronizar foto de perfil com o servidor.', err)
      }
    }

    sincronizarFoto()

    return () => {
      isCanceled = true
    }
  }, [did, isAdmin, profilePhoto, matricula])

  async function persistProfilePhotoToServer(nextPhoto) {
    if (isAdmin || !did) return
    try {
      await fetch('/api/users/photo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did, profilePhoto: nextPhoto || '' }),
      })
    } catch (err) {
      console.warn('Erro ao salvar foto de perfil no servidor.', err)
    }
  }

  function handleProfilePhotoChange(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setProfilePhoto(result)
      saveProfilePhoto({ isAdmin, did, matricula }, result)
      persistProfilePhotoToServer(result)
    }
    reader.readAsDataURL(file)

    if (event.target) {
      // Permite reenviar a mesma imagem caso o usuário queira trocar posteriormente
      event.target.value = ''
    }
  }

  function handleRemoveProfilePhoto() {
    setProfilePhoto('')
    removeProfilePhoto({ isAdmin, did, matricula })
    persistProfilePhotoToServer('')
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
