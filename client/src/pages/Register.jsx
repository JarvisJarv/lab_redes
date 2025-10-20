import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import labLogo from '../assets/lab-logo.png'

function abToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function gerarDID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return 'did:simulado:' + crypto.randomUUID()
  return 'did:simulado:' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export default function Register() {
  const vantaRef = useRef(null)
  const [registerNome, setRegisterNome] = useState('')
  const [registerMatricula, setRegisterMatricula] = useState('')
  const [registerCurso, setRegisterCurso] = useState('Sistemas de Informação')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
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
    const storedCurso = localStorage.getItem('curso') || ''

    if (storedName) {
      setRegisterNome(storedName)
    }
    if (storedMatricula) {
      setRegisterMatricula(storedMatricula)
    }
    if (storedCurso) {
      setRegisterCurso(storedCurso)
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

  async function gerarParChaves() {
    const keyPair = await window.crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    )
    return keyPair
  }

  async function exportPublicKeyBase64(publicKey) {
    const spki = await window.crypto.subtle.exportKey('spki', publicKey)
    return abToBase64(spki)
  }

  async function exportPrivateKeyJwk(privateKey) {
    const jwk = await window.crypto.subtle.exportKey('jwk', privateKey)
    return jwk
  }

  async function handleCreateIdentity(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!registerNome.trim() || !registerMatricula.trim()) {
      setError('Nome e Matrícula são obrigatórios')
      return
    }
    setLoading(true)
    try {
      localStorage.removeItem('isAdmin')
      const did = gerarDID()
      const kp = await gerarParChaves()
      const publicKeyB64 = await exportPublicKeyBase64(kp.publicKey)
      const privateJwk = await exportPrivateKeyJwk(kp.privateKey)

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: registerNome.trim(),
          matricula: registerMatricula.trim(),
          curso: registerCurso,
          did,
          publicKey: publicKeyB64,
        }),
      })
      if (!res.ok) {
        if (res.status === 409) {
          setError('Usuário já registrado. Utilize a identidade existente para acessar.')
          return
        }
        const txt = await res.text()
        throw new Error(txt || 'Erro ao registrar usuário no backend')
      }

      localStorage.setItem('privateKeyJwk', JSON.stringify(privateJwk))
      localStorage.setItem('userDID', did)
      localStorage.setItem('userName', registerNome.trim())
      localStorage.setItem('matricula', registerMatricula.trim())
      localStorage.setItem('curso', registerCurso)

      setMessage('Identidade criada com sucesso neste dispositivo. Redirecionando para o login...')
      setTimeout(() => navigate('/'), 1200)
    } catch (err) {
      console.error(err)
      setError('Erro ao criar identidade: ' + (err.message || ''))
    } finally {
      setLoading(false)
    }
  }

  const inputClassName =
    'w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-slate-300 transition focus:border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/60'
  const subtleTextClass = 'text-sm text-slate-300'
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
                Crie sua identidade digital acadêmica com segurança
              </h1>
              <p className="mt-3 max-w-xl text-sm text-slate-200 sm:text-base">
                Gere um par de chaves criptográficas único e mantenha a privacidade dos seus dados para acessar os recursos do laboratório.
              </p>
            </div>

            <div className="flex flex-col gap-6 lg:gap-8">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Criar identidade</h2>
                    <p className="mt-1 text-sm text-slate-200">
                      Use seu nome, matrícula e curso para gerar um DID exclusivo.
                    </p>
                  </div>
                  <div className="hidden rounded-full bg-gradient-to-br from-cyan-400/40 to-blue-500/40 p-3 text-cyan-100 sm:block">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                      <path d="M12 1.75a.75.75 0 0 1 .707.498l2.076 5.926 6.243.269a.75.75 0 0 1 .431 1.348l-4.88 3.763 1.7 6.091a.75.75 0 0 1-1.142.828L12 16.93l-5.135 3.545a.75.75 0 0 1-1.142-.828l1.7-6.091-4.88-3.763a.75.75 0 0 1 .431-1.348l6.244-.269 2.075-5.926A.75.75 0 0 1 12 1.75Z" />
                    </svg>
                  </div>
                </div>

                <form onSubmit={handleCreateIdentity} className="mt-6 space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-100">Nome completo</label>
                    <input
                      value={registerNome}
                      onChange={(e) => setRegisterNome(e.target.value)}
                      className={inputClassName}
                      placeholder="Ex: Maria Silva"
                    />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-100">Matrícula</label>
                      <input
                        value={registerMatricula}
                        onChange={(e) => setRegisterMatricula(e.target.value)}
                        className={inputClassName}
                        placeholder="Ex: 2025001"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-100">Curso</label>
                      <input
                        value={registerCurso}
                        onChange={(e) => setRegisterCurso(e.target.value)}
                        className={inputClassName}
                      />
                    </div>
                  </div>
                  <p className={subtleTextClass}>
                    Ao continuar, geraremos um par de chaves ECDSA (P-256) localmente e armazenaremos sua chave privada neste dispositivo.
                  </p>
                  <button type="submit" className={primaryButtonClass} disabled={loading}>
                    {loading ? 'Criando identidade…' : 'Gerar identidade segura'}
                  </button>
                </form>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-100 backdrop-blur-xl sm:p-7">
                <h3 className="text-base font-semibold text-white">Já possui identidade?</h3>
                <p className="mt-2 text-slate-200">
                  Caso já tenha gerado sua identidade neste ou em outro dispositivo, volte para a página de login para acessar o laboratório.
                </p>
                <Link
                  to="/"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400/90 via-sky-400/90 to-blue-500/90 px-4 py-2 font-semibold text-slate-900 transition hover:scale-[1.01] hover:shadow-lg"
                >
                  Ir para o login
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {error && <div className="text-red-200">{error}</div>}
            {message && <div className="text-emerald-200">{message}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
