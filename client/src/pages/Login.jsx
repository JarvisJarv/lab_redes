import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

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

// Helper: gera DID simples
function gerarDID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return 'did:simulado:' + crypto.randomUUID()
  return 'did:simulado:' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// Observação: para produção, armazene privateKey em IndexedDB e, se possível, encriptado com senha.
// Aqui usamos localStorage para simplicidade do protótipo.

export default function Login() {
  const [nome, setNome] = useState('')
  const [matricula, setMatricula] = useState('')
  const [curso, setCurso] = useState('Sistemas de Informação')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const existing = localStorage.getItem('userDID')
    if (existing) {
      navigate('/home')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function gerarParChaves() {
    // ECDSA P-256
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
    // Export as JWK for storage (not ideal but simple here)
    const jwk = await window.crypto.subtle.exportKey('jwk', privateKey)
    return jwk
  }

  async function handleCreateIdentity(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!nome.trim() || !matricula.trim()) {
      setError('Nome e Matrícula são obrigatórios')
      return
    }
    setLoading(true)
    try {
      const did = gerarDID()
      const kp = await gerarParChaves()
      const publicKeyB64 = await exportPublicKeyBase64(kp.publicKey)
      const privateJwk = await exportPrivateKeyJwk(kp.privateKey)

      // Salva privateKey no localStorage (JWK). Em produção, usar IndexedDB e encriptação.
      localStorage.setItem('privateKeyJwk', JSON.stringify(privateJwk))
      localStorage.setItem('userDID', did)
      localStorage.setItem('userName', nome.trim())
      localStorage.setItem('matricula', matricula.trim())
      localStorage.setItem('curso', curso)

      // Envia publicKey ao backend
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: nome.trim(), matricula: matricula.trim(), curso, did, publicKey: publicKeyB64 }),
      })
      if (!res.ok) {
        if (res.status === 409) {
          // Usuário já registrado no backend — não é fatal, prosseguimos com identidade local
          setMessage(`Usuário já registrado no backend. Identidade local salva. DID: ${did}`)
        } else {
          const txt = await res.text()
          throw new Error(txt || 'Erro ao registrar usuário no backend')
        }
      } else {
        setMessage(`Identidade criada com sucesso. DID: ${did}`)
      }
      setTimeout(() => navigate('/home'), 1200)
    } catch (err) {
      console.error(err)
      setError('Erro ao criar identidade: ' + (err.message || ''))
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    // Verifica privateKey
    const pk = localStorage.getItem('privateKeyJwk')
    if (!pk) {
      setError('Identidade não encontrada neste dispositivo. Crie identidade ou importe backup.')
      return
    }

    const enteredMat = (matricula || '').toString().trim()
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
        }
      } catch (err) {
        console.warn('Erro ao garantir perfil:', err)
      }
    }

    if (enteredMat && storedMat && enteredMat === storedMat) {
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
          setError('Usuário informado não existe no backend. Crie identidade ou importe backup para este usuário.')
          return
        }
        const user = arr[0]
        const localDid = localStorage.getItem('userDID')
        // Se o DID do backend corresponder ao DID local, permitir
          if (localDid && user.did === localDid) {
          // restaura nome/matricula se necessário
            if (!localStorage.getItem('userName')) localStorage.setItem('userName', user.userName || '')
            if (!localStorage.getItem('matricula')) localStorage.setItem('matricula', user.matricula || '')
            await ensureProfile(enteredMat)
            setMessage('Autenticado — redirecionando...')
            setTimeout(() => navigate('/home'), 600)
            return
        }

        // Tentar derivar a publicKey do privateKeyJwk local e comparar com a do backend
        const localPrivateJwk = localStorage.getItem('privateKeyJwk')
        if (localPrivateJwk) {
          const derivedPubB64 = await publicSpkiBase64FromPrivateJwkString(localPrivateJwk)
            if (derivedPubB64 && user.publicKey && derivedPubB64 === user.publicKey) {
            // corresponde — autenticar
              if (!localStorage.getItem('userName')) localStorage.setItem('userName', user.userName || '')
              if (!localStorage.getItem('userDID')) localStorage.setItem('userDID', user.did || '')
              if (!localStorage.getItem('matricula')) localStorage.setItem('matricula', user.matricula || '')
              await ensureProfile(enteredMat)
              setMessage('Autenticado — redirecionando...')
              setTimeout(() => navigate('/home'), 600)
              return
          }

          // Se derivação falhou (null), permitir fallback — alerta o usuário
          if (derivedPubB64 === null) {
            // Não foi possível derivar a publicKey localmente; como existe privateKey e usuário no backend,
            // prosseguimos com um login por matrícula (fallback). Em produção, não é recomendado sem verificação.
            if (!localStorage.getItem('userName')) localStorage.setItem('userName', user.userName || '')
            if (!localStorage.getItem('userDID')) localStorage.setItem('userDID', user.did || '')
            if (!localStorage.getItem('matricula')) localStorage.setItem('matricula', user.matricula || '')
            await ensureProfile(enteredMat)
            setMessage('Autenticado por fallback (não foi possível derivar publicKey local). Redirecionando...')
            setTimeout(() => navigate('/home'), 600)
            return
          }
        }

        // Se derivação ocorreu e não corresponde, não podemos autenticar com chave privada de outro usuário
        setError('A chave privada presente neste dispositivo pertence a outra identidade. Importe o backup correto ou crie uma nova identidade para a matrícula informada.')
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
      setMessage('Autenticado — redirecionando...')
      setTimeout(() => navigate('/home'), 600)
      return
    }

    setError('Identidade incompleta. Informe matrícula ou importe seu backup.')
  }

  // Exporta backup (privateKeyJwk + metadados) como arquivo JSON para o usuário baixar
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
    const a = document.createElement('a')
    a.href = url
    a.download = `identidade-backup-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setMessage('Backup gerado. Guarde o arquivo em local seguro.')
  }

  // Importa backup JSON (espera privateKeyJwk e metadados)
  async function handleImportFile(e) {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    try {
      const text = await f.text()
      const obj = JSON.parse(text)
      if (!obj.privateKeyJwk) throw new Error('Arquivo não contém privateKeyJwk')
      localStorage.setItem('privateKeyJwk', JSON.stringify(obj.privateKeyJwk))
      if (obj.userDID) localStorage.setItem('userDID', obj.userDID)
      if (obj.userName) localStorage.setItem('userName', obj.userName)
      if (obj.matricula) localStorage.setItem('matricula', obj.matricula)
      if (obj.curso) localStorage.setItem('curso', obj.curso)
      setMessage('Backup importado com sucesso. Você pode agora fazer Login.')
      // limpa o input
      e.target.value = ''
    } catch (err) {
      console.error(err)
      setError('Falha ao importar backup: ' + (err.message || 'arquivo inválido'))
    }
  }

  const inputClassName =
    'w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-slate-300 transition focus:border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/60'
  const subtleTextClass = 'text-sm text-slate-300'
  const primaryButtonClass =
    'inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 px-4 py-3 font-semibold text-slate-900 shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01] hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:opacity-60'
  const secondaryButtonClass =
    'inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-cyan-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200'

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-32 h-96 w-96 rounded-full bg-cyan-500/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/10 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-10">
        <div className="mb-10 text-center lg:text-left">
          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
            Identidade Self-Sovereign
          </span>
          <h1 className="mt-6 text-3xl font-semibold sm:text-4xl lg:text-5xl">
            Entre com segurança e crie sua identidade digital acadêmica
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-200 sm:text-lg">
            Gere um par de chaves criptográficas, mantenha a privacidade dos seus dados e
            tenha acesso rápido às funcionalidades do laboratório de redes. Tudo em uma
            interface moderna, clara e responsiva.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_minmax(0,1fr)]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Criar Identidade</h2>
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

            <form onSubmit={handleCreateIdentity} className="mt-8 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-100">Nome completo</label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputClassName} placeholder="Ex: Maria Silva" />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-100">Matrícula</label>
                  <input value={matricula} onChange={(e) => setMatricula(e.target.value)} className={inputClassName} placeholder="Ex: 2025001" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-100">Curso</label>
                  <input value={curso} onChange={(e) => setCurso(e.target.value)} className={inputClassName} />
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

          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 backdrop-blur-xl sm:p-8">
              <h2 className="text-xl font-semibold text-white">Login rápido</h2>
              <p className="mt-1 text-sm text-slate-200">
                Autentique-se com sua matrícula e chave privada local ou importe seu backup para continuar.
              </p>

              <form onSubmit={handleLogin} className="mt-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-100">Nome (opcional)</label>
                  <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputClassName} placeholder="Como deseja ser chamado?" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-100">
                    Matrícula <span className="text-red-300">*</span>
                  </label>
                  <input
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    className={`${inputClassName} ${!matricula.trim() ? 'ring-1 ring-red-400/80' : ''}`}
                    placeholder="Informe sua matrícula"
                  />
                  {!matricula.trim() && (
                    <span className="text-xs text-red-200">A matrícula é obrigatória para realizar o login.</span>
                  )}
                </div>

                <button type="submit" className={primaryButtonClass} disabled={!matricula.trim()}>
                  Entrar agora
                </button>
              </form>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button onClick={handleExportBackup} className={secondaryButtonClass}>
                  Exportar backup
                </button>
                <label className={`${secondaryButtonClass} cursor-pointer`}>Importar backup
                  <input type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
                </label>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-100 backdrop-blur-xl sm:p-7">
              <h3 className="text-base font-semibold text-white">Dicas de segurança</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-200">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-cyan-300" />
                  Guarde o arquivo de backup em um local seguro e privado.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-cyan-300" />
                  Nunca compartilhe sua chave privada com terceiros.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-cyan-300" />
                  Use o mesmo dispositivo para evitar bloqueios durante o login.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-2">
          {error && <div className="text-sm text-red-200">{error}</div>}
          {message && <div className="text-sm text-emerald-200">{message}</div>}
        </div>
      </div>
    </div>
  )
}
