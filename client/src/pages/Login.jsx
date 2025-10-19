import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const DEFAULT_CURSO = 'Sistemas de Informação'
const BACKUP_PREFIX = 'identidade-backup-'
const CREATE_REDIRECT_DELAY = 1200
const LOGIN_REDIRECT_DELAY = 600

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function publicJwkFromPrivateJwk(jwk) {
  if (!jwk) return null
  const { kty, crv, x, y } = jwk
  if (!kty || !crv || !x || !y) return null
  return { kty, crv, x, y, ext: true }
}

async function derivePublicKeyBase64(privateJwkString) {
  try {
    const jwk = JSON.parse(privateJwkString)
    const publicJwk = publicJwkFromPrivateJwk(jwk)
    if (!publicJwk) return null

    const publicKey = await window.crypto.subtle.importKey(
      'jwk',
      publicJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['verify']
    )
    const spki = await window.crypto.subtle.exportKey('spki', publicKey)
    return bufferToBase64(spki)
  } catch (err) {
    console.error('Erro ao derivar publicKey do JWK:', err)
    return null
  }
}

function gerarDid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `did:simulado:${crypto.randomUUID()}`
  }
  return `did:simulado:${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

function persistProfile({ userName, matricula, curso, did }) {
  if (userName !== undefined && userName !== null) localStorage.setItem('userName', userName)
  if (matricula !== undefined && matricula !== null) localStorage.setItem('matricula', matricula)
  if (curso !== undefined && curso !== null) localStorage.setItem('curso', curso)
  if (did !== undefined && did !== null) localStorage.setItem('userDID', did)
}

async function fetchUsersByMatricula(matricula) {
  const res = await fetch(`/api/users?matricula=${encodeURIComponent(matricula)}`)
  if (!res.ok) {
    throw new Error('Erro ao consultar o backend. Tente novamente.')
  }
  const data = await res.json()
  if (!Array.isArray(data)) {
    return []
  }
  return data
}

const highlightItems = [
  {
    title: 'Controle seguro',
    description: 'Suas credenciais permanecem criptografadas neste dispositivo com chaves ECDSA P-256.',
  },
  {
    title: 'Backup portátil',
    description: 'Exporte sua identidade para um arquivo JSON e mantenha o acesso em qualquer dispositivo.',
  },
  {
    title: 'Integração acadêmica',
    description: 'Utilize o mesmo DID para autenticação nas aplicações do laboratório de redes.',
  },
]

export default function Login() {
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [matricula, setMatricula] = useState('')
  const [curso, setCurso] = useState(DEFAULT_CURSO)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('userDID')) {
      navigate('/home')
    }
  }, [navigate])

  async function gerarParChaves() {
    return window.crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    )
  }

  async function exportPublicKeyBase64(publicKey) {
    const spki = await window.crypto.subtle.exportKey('spki', publicKey)
    return bufferToBase64(spki)
  }

  async function exportPrivateKeyJwk(privateKey) {
    return window.crypto.subtle.exportKey('jwk', privateKey)
  }

  async function handleCreateIdentity(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!nome.trim() || !matricula.trim()) {
      setError('Nome e Matrícula são obrigatórios')
      return
    }

    setLoading(true)
    try {
      const did = gerarDid()
      const keyPair = await gerarParChaves()
      const publicKeyB64 = await exportPublicKeyBase64(keyPair.publicKey)
      const privateJwk = await exportPrivateKeyJwk(keyPair.privateKey)

      localStorage.setItem('privateKeyJwk', JSON.stringify(privateJwk))
      persistProfile({ userName: nome.trim(), matricula: matricula.trim(), curso, did })

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: nome.trim(),
          matricula: matricula.trim(),
          curso,
          did,
          publicKey: publicKeyB64,
        }),
      })

      if (!res.ok && res.status !== 409) {
        const text = await res.text()
        throw new Error(text || 'Erro ao registrar usuário no backend')
      }

      setMessage(
        res.status === 409
          ? `Usuário já registrado no backend. Identidade local salva. DID: ${did}`
          : `Identidade criada com sucesso. DID: ${did}`
      )
      setTimeout(() => navigate('/home'), CREATE_REDIRECT_DELAY)
    } catch (err) {
      console.error(err)
      setError(`Erro ao criar identidade: ${err.message || ''}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    const privateKey = localStorage.getItem('privateKeyJwk')
    if (!privateKey) {
      setError('Identidade não encontrada neste dispositivo. Crie identidade ou importe backup.')
      return
    }

    const enteredMatricula = matricula.trim()
    const storedMatricula = localStorage.getItem('matricula')

    const redirect = (text, delay = LOGIN_REDIRECT_DELAY) => {
      setMessage(text)
      setTimeout(() => navigate('/home'), delay)
    }

    if (enteredMatricula && storedMatricula && enteredMatricula === storedMatricula) {
      try {
        const users = await fetchUsersByMatricula(enteredMatricula)
        if (users[0]) persistProfile(users[0])
      } catch (err) {
        console.warn('Erro ao atualizar perfil local:', err)
      }
      redirect('Autenticado — redirecionando...')
      return
    }

    if (enteredMatricula) {
      try {
        const users = await fetchUsersByMatricula(enteredMatricula)
        if (users.length === 0) {
          setError('Usuário informado não existe no backend. Crie identidade ou importe backup para este usuário.')
          return
        }

        const user = users[0]
        const localDid = localStorage.getItem('userDID')

        if (localDid && user.did === localDid) {
          persistProfile(user)
          redirect('Autenticado — redirecionando...')
          return
        }

        const derivedPublic = await derivePublicKeyBase64(privateKey)

        if (derivedPublic && user.publicKey && derivedPublic === user.publicKey) {
          persistProfile(user)
          redirect('Autenticado — redirecionando...')
          return
        }

        if (derivedPublic === null) {
          persistProfile(user)
          redirect('Autenticado por fallback (não foi possível derivar publicKey local). Redirecionando...')
          return
        }

        setError(
          'A chave privada presente neste dispositivo pertence a outra identidade. ' +
            'Importe o backup correto ou crie uma nova identidade para a matrícula informada.'
        )
        return
      } catch (err) {
        console.error('Erro ao verificar usuário no backend:', err)
        setError(err.message || 'Erro de rede ao verificar usuário. Tente novamente.')
        return
      }
    }

    const localDid = localStorage.getItem('userDID')
    if (localDid) {
      redirect('Autenticado — redirecionando...')
      return
    }

    setError('Identidade incompleta. Informe matrícula ou importe seu backup.')
  }

  function handleExportBackup() {
    const privateKeyJwk = localStorage.getItem('privateKeyJwk')
    if (!privateKeyJwk) {
      setError('Nenhuma chave privada encontrada para exportar')
      return
    }

    const payload = {
      privateKeyJwk: JSON.parse(privateKeyJwk),
      userDID: localStorage.getItem('userDID') || null,
      userName: localStorage.getItem('userName') || null,
      matricula: localStorage.getItem('matricula') || null,
      curso: localStorage.getItem('curso') || null,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${BACKUP_PREFIX}${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setMessage('Backup gerado. Guarde o arquivo em local seguro.')
  }

  async function handleImportFile(event) {
    const file = event.target.files && event.target.files[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.privateKeyJwk) throw new Error('Arquivo não contém privateKeyJwk')

      localStorage.setItem('privateKeyJwk', JSON.stringify(data.privateKeyJwk))
      persistProfile(data)
      setMessage('Backup importado com sucesso. Você pode agora fazer Login.')
      event.target.value = ''
    } catch (err) {
      console.error(err)
      setError(`Falha ao importar backup: ${err.message || 'arquivo inválido'}`)
    }
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.35),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(56,189,248,0.25),_transparent_60%)]" />
        <div className="absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 translate-x-24 translate-y-24 rounded-full bg-indigo-500/25 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-6 py-16 lg:px-10">
        <header className="max-w-3xl">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
            Identidade Digital do Aluno
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Conecte-se com uma experiência moderna, segura e pensada para o laboratório.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-200 sm:text-lg">
            Crie sua identidade descentralizada, autentique-se em segundos e leve seu backup com você. Tudo em uma interface redesenhada com foco em clareza e confiança.
          </p>
        </header>

        <main className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">Criar nova identidade</h2>
                <p className="mt-2 text-sm text-slate-200">
                  Preencha suas informações e gere um par de chaves ECDSA P-256 diretamente no navegador. A chave privada ficará salva apenas neste dispositivo.
                </p>
              </div>
              <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                Passo 1
              </span>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleCreateIdentity}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-cyan-100" htmlFor="create-name">
                  Nome completo
                </label>
                <input
                  id="create-name"
                  type="text"
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-300/60 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
                  placeholder="Ex: Maria Oliveira"
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-cyan-100" htmlFor="create-matricula">
                    Matrícula
                  </label>
                  <input
                    id="create-matricula"
                    type="text"
                    value={matricula}
                    onChange={(event) => setMatricula(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-300/60 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
                    placeholder="Ex: 2025001"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-cyan-100" htmlFor="create-curso">
                    Curso
                  </label>
                  <input
                    id="create-curso"
                    type="text"
                    value={curso}
                    onChange={(event) => setCurso(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-300/60 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/20 transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={loading}
              >
                {loading ? 'Gerando identidade...' : 'Criar identidade segura'}
              </button>
            </form>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {highlightItems.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100">
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-xs text-slate-200">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col justify-between gap-6 rounded-3xl border border-white/10 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">Entrar com sua identidade</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Autentique-se com a matrícula cadastrada. Se estiver em um novo dispositivo, importe o arquivo de backup antes de continuar.
                  </p>
                </div>
                <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
                  Passo 2
                </span>
              </div>

              <div className="mt-8 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-blue-100" htmlFor="login-name">
                    Nome (opcional)
                  </label>
                  <input
                    id="login-name"
                    type="text"
                    value={nome}
                    onChange={(event) => setNome(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-300/60 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                    placeholder="Como devemos chamá-lo(a)?"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <label className="font-medium text-blue-100" htmlFor="login-matricula">
                      Matrícula <span className="text-red-300">*</span>
                    </label>
                    {!matricula.trim() && <span className="text-xs text-red-200">Obrigatória para autenticar</span>}
                  </div>
                  <input
                    id="login-matricula"
                    type="text"
                    value={matricula}
                    onChange={(event) => setMatricula(event.target.value)}
                    className={`w-full rounded-xl border px-4 py-3 text-sm text-white placeholder:text-slate-300/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                      matricula.trim() ? 'border-white/10 bg-white/5 focus:border-blue-300' : 'border-red-400/60 bg-red-400/10 focus:border-red-300'
                    }`}
                    placeholder="Digite a matrícula registrada"
                  />
                </div>

                <button
                  onClick={handleLogin}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-blue-500/10 transition-all duration-150 hover:-translate-y-0.5 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:pointer-events-none disabled:opacity-70"
                  disabled={!matricula.trim()}
                >
                  Acessar painel
                </button>

                <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-200">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Gerencie seu backup</h3>
                      <p className="text-xs text-slate-200/80">
                        Guarde o arquivo exportado em local seguro para restaurar sua identidade em outros dispositivos.
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={handleExportBackup}
                        className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
                      >
                        Exportar backup
                      </button>
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20">
                        Importar backup
                        <input type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-200">
              <p>
                Precisa de ajuda? Verifique se o arquivo de backup corresponde à matrícula utilizada. Para suporte adicional, contate o monitor do laboratório.
              </p>
            </div>
          </section>
        </main>

        <footer className="text-xs text-slate-300/80">
          Identidade descentralizada experimental — mantenha seus dados pessoais protegidos.
        </footer>

        <div className="space-y-2">
          {error && <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-100">{error}</div>}
          {message && <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">{message}</div>}
        </div>
      </div>
    </div>
  )
}
