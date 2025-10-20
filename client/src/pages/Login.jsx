import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import labLogo from '../assets/lab-logo.png'
import { removeProfilePhoto, saveProfilePhoto } from '../utils/profilePhotoStorage'

// Helper: export ArrayBuffer para base64
function abToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Helper: cria publicJwk a partir de privateJwk quando x/y estão presentes
function publicJwkFromPrivateJwk(jwk) {
  if (!jwk) return null
  const { kty, crv, x, y } = jwk
  if (!kty || !crv || !x || !y) return null
  return { kty, crv, x, y, ext: true }
}

async function publicSpkiBase64FromPrivateJwkString(privateJwkString) {
  try {
    const jwk = JSON.parse(privateJwkString)
    const pubJwk = publicJwkFromPrivateJwk(jwk)
    if (!pubJwk) return null
    const pubKey = await window.crypto.subtle.importKey('jwk', pubJwk, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify'])
    const spki = await window.crypto.subtle.exportKey('spki', pubKey)
    return abToBase64(spki)
  } catch (err) {
    console.error('Erro ao derivar publicKey do JWK:', err)
    return null
  }
}

// Observação: para produção, armazene privateKey em IndexedDB e, se possível, encriptado com senha.
// Aqui usamos localStorage para simplicidade do protótipo.

export default function Login() {
  const vantaRef = useRef(null)
  const [loginNome, setLoginNome] = useState('')
  const [loginMatricula, setLoginMatricula] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let vantaEffect
    let canceled = false

    const loadScript = (src) =>
      new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`)
        if (existing) {
          if (existing.getAttribute('data-loaded') === 'true') {
            resolve()
            return
          }
          existing.addEventListener('load', resolve, { once: true })
          existing.addEventListener('error', reject, { once: true })
          return
        }

        const script = document.createElement('script')
        script.src = src
        script.async = true
        script.setAttribute('data-loaded', 'false')
        script.onload = () => {
          script.setAttribute('data-loaded', 'true')
          resolve()
        }
        script.onerror = (event) => {
          script.remove()
          reject(event)
        }
        document.body.appendChild(script)
      })

    async function initVanta() {
      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js')
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/vanta/0.5.24/vanta.net.min.js')

        if (canceled || !vantaRef.current || !window.VANTA || !window.VANTA.NET) return

        vantaEffect = window.VANTA.NET({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 1.0,
          backgroundColor: 0xa3243,
          color: 0xffffff,
          points: 15.0,
          maxDistance: 16.0,
          spacing: 16.0,
        })
      } catch (err) {
        console.error('Erro ao inicializar animação Vanta:', err)
      }
    }

    initVanta()

    return () => {
      canceled = true
      if (vantaEffect) {
        vantaEffect.destroy()
      }
    }
  }, [])

  useEffect(() => {
    const storedName = localStorage.getItem('userName') || ''
    const storedMatricula = localStorage.getItem('matricula') || ''
    if (storedName) {
      setLoginNome(storedName)
    }
    if (storedMatricula) {
      setLoginMatricula(storedMatricula)
    }

    const existing = localStorage.getItem('userDID')
    const isAdmin = localStorage.getItem('isAdmin') === 'true'
    if (isAdmin) {
      navigate('/admin')
      return
    }
    if (existing) {
      navigate('/home')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    const trimmedLoginName = loginNome.trim()
    const enteredMat = (loginMatricula || '').toString().trim()

    localStorage.removeItem('isAdmin')

    if (trimmedLoginName.toLowerCase() === 'admin' && enteredMat.toLowerCase() === 'admin') {
      localStorage.setItem('isAdmin', 'true')
      localStorage.setItem('userName', 'admin')
      localStorage.setItem('matricula', 'admin')
      localStorage.removeItem('userDID')
      setMessage('Acesso administrativo concedido. Redirecionando...')
      setTimeout(() => navigate('/admin'), 600)
      return
    }

    // Verifica privateKey para usuários padrão
    const pk = localStorage.getItem('privateKeyJwk')
    if (!pk) {
      setError(
        'Este dispositivo não possui a chave privada necessária para esta identidade. Entre em contato com um administrador para recuperar o acesso.'
      )
      return
    }

    const storedMat = localStorage.getItem('matricula')

    // Caso o usuário tenha digitado a matrícula e ela coincida com a local -> permitir
    async function ensureProfile(mat) {
      // garante que userDID e userName estejam no localStorage; busca no backend se faltar
      const existingDid = localStorage.getItem('userDID')
      const existingName = localStorage.getItem('userName')
      if (existingDid && existingName) return
      const m = mat || localStorage.getItem('matricula')
      if (!m) return
      try {
        const r = await fetch(`/api/users?matricula=${encodeURIComponent(m)}`)
        if (!r.ok) return
        const arr = await r.json()
        if (Array.isArray(arr) && arr.length > 0) {
          const u = arr[0]
          if (u.did) localStorage.setItem('userDID', u.did)
          if (u.userName) localStorage.setItem('userName', u.userName)
          if (u.matricula) localStorage.setItem('matricula', u.matricula)
          const context = {
            isAdmin: false,
            did: u.did || '',
            matricula: u.matricula || '',
          }
          if (u.profilePhoto) {
            saveProfilePhoto(context, u.profilePhoto)
          } else {
            removeProfilePhoto(context)
          }
        }
      } catch (err) {
        console.warn('Erro ao garantir perfil:', err)
      }
    }

    const persistLoginName = () => {
      if (trimmedLoginName) {
        localStorage.setItem('userName', trimmedLoginName)
        setLoginNome(trimmedLoginName)
      }
    }

    if (enteredMat && storedMat && enteredMat === storedMat) {
      persistLoginName()
      await ensureProfile(enteredMat)
      setMessage('Autenticado — redirecionando...')
      setTimeout(() => navigate('/home'), 600)
      return
    }

    // Se a matrícula digitada difere da armazenada, verificamos no backend se esse usuário existe
    if (enteredMat) {
      try {
        const res = await fetch(`/api/users?matricula=${encodeURIComponent(enteredMat)}`)
        if (!res.ok) {
          setError('Erro ao consultar o backend. Tente novamente.')
          return
        }
        const arr = await res.json()
        if (!Array.isArray(arr) || arr.length === 0) {
          setError('Usuário informado não existe no cadastro. Crie uma identidade para este usuário.')
          return
        }
        const user = arr[0]
        const localDid = localStorage.getItem('userDID')
        // Se o DID do backend corresponder ao DID local, permitir
        if (localDid && user.did === localDid) {
          // restaura nome/matricula se necessário
          if (!localStorage.getItem('userName')) localStorage.setItem('userName', user.userName || '')
          if (!localStorage.getItem('matricula')) localStorage.setItem('matricula', user.matricula || '')
          persistLoginName()
          await ensureProfile(enteredMat)
          setMessage('Autenticado — redirecionando...')
          setTimeout(() => navigate('/home'), 600)
          return
        }

        // Tentar derivar a publicKey do privateKeyJwk local e comparar com a do backend
        const localPrivateJwk = localStorage.getItem('privateKeyJwk')
        if (localPrivateJwk) {
          const derivedPubB64 = await publicSpkiBase64FromPrivateJwkString(localPrivateJwk)

          if (derivedPubB64 === null) {
            setError(
              'Não foi possível validar a chave privada armazenada neste dispositivo. Procure um administrador para restaurar o acesso antes de continuar.'
            )
            return
          }

          if (!user.publicKey) {
            setError(
              'A identidade informada não possui chave pública registrada. Entre em contato com um administrador para regularizar seu cadastro.'
            )
            return
          }

          if (derivedPubB64 && derivedPubB64 === user.publicKey) {
            if (!localStorage.getItem('userName')) localStorage.setItem('userName', user.userName || '')
            if (!localStorage.getItem('userDID')) localStorage.setItem('userDID', user.did || '')
            if (!localStorage.getItem('matricula')) localStorage.setItem('matricula', user.matricula || '')
            persistLoginName()
            await ensureProfile(enteredMat)
            setMessage('Autenticado — redirecionando...')
            setTimeout(() => navigate('/home'), 600)
            return
          }
        }

        setError(
          'A identidade informada existe, mas este dispositivo não possui a chave privada correspondente. Gere a identidade neste aparelho ou procure um administrador para liberar o acesso.'
        )
        return
      } catch (err) {
        console.error('Erro ao verificar usuário no backend:', err)
        setError('Erro de rede ao verificar usuário. Tente novamente.')
        return
      }
    }

    // Nenhuma matrícula digitada: se tiver DID local, permitir; caso contrário, bloquear
    const localDid = localStorage.getItem('userDID')
    if (localDid) {
      persistLoginName()
      setMessage('Autenticado — redirecionando...')
      setTimeout(() => navigate('/home'), 600)
      return
    }

    setError('Identidade incompleta. Informe matrícula ou crie uma nova identidade.')
  }

  const inputClassName =
    'w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-slate-300 transition focus:border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/60'
  const primaryButtonClass =
    'inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 px-4 py-3 font-semibold text-slate-900 shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01] hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:opacity-60'
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div ref={vantaRef} className="absolute inset-0" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-32 h-96 w-96 rounded-full bg-cyan-500/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/10 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full space-y-10">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_minmax(0,1fr)] lg:items-center">
            <div className="text-center lg:text-left">
              <img
                src={labLogo}
                alt="Laboratório de Redes"
                className="mx-auto mb-4 h-16 w-auto drop-shadow-xl lg:mx-0"
              />
              <span className="inline-flex items-center justify-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                Self-sovereign identity
              </span>
              <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
                Entre com segurança e crie sua identidade digital acadêmica
              </h1>
              <p className="mt-3 max-w-xl text-sm text-slate-200 sm:text-base">
                Gere um par de chaves criptográficas, mantenha a privacidade dos seus dados e
                tenha acesso rápido às funcionalidades do laboratório de redes.
              </p>
            </div>

            <div className="flex flex-col gap-6 lg:gap-8">
              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 backdrop-blur-xl sm:p-8">
                <h2 className="text-xl font-semibold text-white">Login rápido</h2>
                <p className="mt-1 text-sm text-slate-200">Autentique-se com seu Nome e matrícula.</p>

                {(error || message) && (
                  <div className="mt-6 space-y-2 text-sm">
                    {error && (
                      <div className="rounded-xl border border-red-300/30 bg-red-900/30 px-4 py-3 text-red-200">
                        {error}
                      </div>
                    )}
                    {message && (
                      <div className="rounded-xl border border-emerald-300/30 bg-emerald-900/20 px-4 py-3 text-emerald-200">
                        {message}
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleLogin} className="mt-6 space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-100">
                      Nome <span className="text-red-300">*</span>
                    </label>
                    <input
                      value={loginNome}
                      onChange={(e) => setLoginNome(e.target.value)}
                      className={`${inputClassName} ${!loginNome.trim() ? 'ring-1 ring-red-400/80' : ''}`}
                      placeholder="Insira seu nome"
                    />
                    {!loginNome.trim() && (
                      <span className="text-xs text-red-200">O nome é obrigatório para realizar o login.</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-100">
                      Matrícula <span className="text-red-300">*</span>
                    </label>
                    <input
                      value={loginMatricula}
                      onChange={(e) => setLoginMatricula(e.target.value)}
                      className={`${inputClassName} ${!loginMatricula.trim() ? 'ring-1 ring-red-400/80' : ''}`}
                      placeholder="Informe sua matrícula"
                    />
                    {!loginMatricula.trim() && (
                      <span className="text-xs text-red-200">A matrícula é obrigatória para realizar o login.</span>
                    )}
                  </div>
                  <button type="submit" className={primaryButtonClass} disabled={!loginMatricula.trim() || !loginNome.trim()}>
                    Entrar agora
                  </button>
                </form>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100">
                  <p className="text-slate-200">Ainda não tem sua identidade acadêmica?</p>
                  <Link
                    to="/register"
                    className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400/90 via-sky-400/90 to-blue-500/90 px-4 py-2 font-semibold text-slate-900 transition hover:scale-[1.01] hover:shadow-lg"
                  >
                    Criar identidade
                  </Link>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-100 backdrop-blur-xl sm:p-7">
                <h3 className="text-base font-semibold text-white">Dicas de segurança</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-200">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-cyan-300" />
                    Verifique se o nome e a matrícula inseridos correspondem aos dados cadastrados antes de prosseguir.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-cyan-300" />
                    Guarde o dispositivo em que sua identidade foi criada, pois a chave privada fica salva localmente.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-cyan-300" />
                    Em caso de perda do acesso, gere uma nova identidade e informe a organização responsável.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

