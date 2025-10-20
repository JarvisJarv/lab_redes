import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import labLogo from '../assets/lab-logo.png'
import {
  getProfilePhotoStorageKey,
  loadProfilePhoto,
  removeProfilePhoto,
  saveProfilePhoto,
} from '../utils/profilePhotoStorage'

const ProfilePhotoContext = createContext(null)

export function ProfilePhotoProvider({ children }) {
  const isAdmin = localStorage.getItem('isAdmin') === 'true'
  const nome = localStorage.getItem('userName') || ''
  const did = !isAdmin ? localStorage.getItem('userDID') || '' : ''
  const matricula = !isAdmin ? localStorage.getItem('matricula') || '' : ''
  const storageSignature = `${isAdmin ? 'admin' : 'user'}|${did}|${matricula}`

  const [profilePhoto, setProfilePhoto] = useState(() =>
    isAdmin ? '' : loadProfilePhoto({ isAdmin, did, matricula })
  )
  const fileInputRef = useRef(null)
  const signatureRef = useRef(storageSignature)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)
  const [photoModalAlt, setPhotoModalAlt] = useState('')
  const [isPhotoSettingsOpen, setIsPhotoSettingsOpen] = useState(false)
  const photoSettingsMenuRef = useRef(null)
  const photoSettingsButtonRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.removeItem('profilePhoto')
    } catch (err) {
      console.warn('Não foi possível limpar foto de perfil legada.', err)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) {
      return
    }

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

  useEffect(() => {
    if (typeof window === 'undefined' || isAdmin) {
      return undefined
    }

    const context = { isAdmin, did, matricula }
    const key = getProfilePhotoStorageKey(context)

    function handleProfilePhotoUpdate(event) {
      if (!event?.detail || event.detail.key !== key) {
        return
      }
      setProfilePhoto(event.detail.dataUrl || '')
    }

    window.addEventListener('profile-photo-updated', handleProfilePhotoUpdate)

    return () => {
      window.removeEventListener('profile-photo-updated', handleProfilePhotoUpdate)
    }
  }, [isAdmin, did, matricula])

  const persistProfilePhotoToServer = useCallback(
    async (nextPhoto) => {
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
    },
    [isAdmin, did]
  )

  const handleProfilePhotoChange = useCallback(
    (event) => {
      if (isAdmin) {
        return
      }

      const file = event.target.files?.[0]

      if (!file) {
        return
      }

      setIsPhotoSettingsOpen(false)

      const reader = new FileReader()
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : ''
        setProfilePhoto(result)
        saveProfilePhoto({ isAdmin, did, matricula }, result)
        persistProfilePhotoToServer(result)
      }
      reader.readAsDataURL(file)

      if (event.target) {
        event.target.value = ''
      }
    },
    [isAdmin, did, matricula, persistProfilePhotoToServer]
  )

  const handleRemoveProfilePhoto = useCallback(() => {
    if (isAdmin) {
      return
    }

    setIsPhotoSettingsOpen(false)
    setProfilePhoto('')
    removeProfilePhoto({ isAdmin, did, matricula })
    persistProfilePhotoToServer('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [isAdmin, did, matricula, persistProfilePhotoToServer])

  useEffect(() => {
    if (!profilePhoto) {
      setIsPhotoSettingsOpen(false)
    }
  }, [profilePhoto])

  const displayedPhoto = isAdmin ? labLogo : profilePhoto
  const hasPhoto = Boolean(displayedPhoto)
  const canEditPhoto = !isAdmin

  const profileInitials = useMemo(() => {
    if (!nome) return isAdmin ? 'SP' : 'P'
    return nome
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('')
  }, [nome, isAdmin])

  const openPhotoModal = useCallback(() => {
    if (!hasPhoto) return
    const altText = isAdmin
      ? 'Logo do laboratório ampliada'
      : `Foto de perfil de ${nome || 'usuário'} ampliada`
    setPhotoModalAlt(altText)
    setIsPhotoModalOpen(true)
  }, [hasPhoto, isAdmin, nome])

  const closePhotoModal = useCallback(() => {
    setIsPhotoModalOpen(false)
  }, [])

  const triggerPhotoUpload = useCallback(() => {
    if (!canEditPhoto) return
    fileInputRef.current?.click()
  }, [canEditPhoto])

  const togglePhotoSettings = useCallback(() => {
    if (!canEditPhoto) return
    setIsPhotoSettingsOpen((prev) => !prev)
  }, [canEditPhoto])

  const closePhotoSettings = useCallback(() => {
    setIsPhotoSettingsOpen(false)
  }, [])

  useEffect(() => {
    if (!isPhotoSettingsOpen) {
      return
    }

    function handleClickOutside(event) {
      if (
        photoSettingsMenuRef.current &&
        !photoSettingsMenuRef.current.contains(event.target) &&
        !photoSettingsButtonRef.current?.contains(event.target)
      ) {
        setIsPhotoSettingsOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsPhotoSettingsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isPhotoSettingsOpen])

  const value = useMemo(
    () => ({
      nome,
      isAdmin,
      profileInitials,
      profilePhoto,
      displayedPhoto,
      hasPhoto,
      canEditPhoto,
      isPhotoModalOpen,
      photoModalAlt,
      openPhotoModal,
      closePhotoModal,
      triggerPhotoUpload,
      handleProfilePhotoChange,
      handleRemoveProfilePhoto,
      isPhotoSettingsOpen,
      togglePhotoSettings,
      closePhotoSettings,
      photoSettingsMenuRef,
      photoSettingsButtonRef,
      fileInputRef,
    }),
    [
      nome,
      isAdmin,
      profileInitials,
      profilePhoto,
      displayedPhoto,
      hasPhoto,
      canEditPhoto,
      isPhotoModalOpen,
      photoModalAlt,
      openPhotoModal,
      closePhotoModal,
      triggerPhotoUpload,
      handleProfilePhotoChange,
      handleRemoveProfilePhoto,
      isPhotoSettingsOpen,
      togglePhotoSettings,
      closePhotoSettings,
    ]
  )

  return (
    <ProfilePhotoContext.Provider value={value}>
      {children}
      {canEditPhoto ? (
        <input
          ref={fileInputRef}
          id="profile-photo-input"
          className="app-header__profile-input"
          type="file"
          accept="image/*"
          onChange={handleProfilePhotoChange}
        />
      ) : null}
    </ProfilePhotoContext.Provider>
  )
}

export function useProfilePhoto() {
  const context = useContext(ProfilePhotoContext)
  if (!context) {
    throw new Error('useProfilePhoto deve ser usado dentro de ProfilePhotoProvider')
  }
  return context
}
