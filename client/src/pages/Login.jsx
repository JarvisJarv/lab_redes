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

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-6 w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-4 text-center">Identidade do Aluno</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded">
            <h2 className="font-semibold mb-2">Criar Identidade</h2>
            <p className="text-sm mb-3">Preencha Nome e Matrícula e clique em criar. Isso gerará um par de chaves (ECDSA P-256). A chave privada ficará armazenada neste dispositivo.</p>
            <label className="block text-sm">Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full border p-2 rounded mb-2" />
            <label className="block text-sm">Matrícula</label>
            <input value={matricula} onChange={(e) => setMatricula(e.target.value)} className="w-full border p-2 rounded mb-2" />
            <label className="block text-sm">Curso</label>
            <input value={curso} onChange={(e) => setCurso(e.target.value)} className="w-full border p-2 rounded mb-3" />
            <button onClick={handleCreateIdentity} className="btn-primary w-full" disabled={loading}>{loading ? 'Criando...' : 'Criar Identidade'}</button>
          </div>

          <div className="p-4 border rounded">
            <h2 className="font-semibold mb-2">Login</h2>
                <p className="text-sm mb-3">Informe a matrícula usada na criação da identidade e clique em Login. Se não tiver o backup da chave privada neste dispositivo, importe-o primeiro.</p>
                <div className="mb-3">
                  <label className="block text-sm">Nome (opcional)</label>
                  <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full border p-2 rounded mb-2" placeholder="Nome (opcional)" />
                  <label className="block text-sm">Matrícula <span className="text-red-500">*</span></label>
                  <input value={matricula} onChange={(e) => setMatricula(e.target.value)} className={`w-full border p-2 rounded mb-2 ${!matricula.trim() ? 'border-red-400' : ''}`} placeholder="Ex: 2025001" />
                  {!matricula.trim() && <div className="text-xs text-red-500 mb-2">A matrícula é obrigatória para login.</div>}
                </div>
                <button onClick={handleLogin} className="btn-primary w-full" disabled={!matricula.trim()}>Login</button>
            <div className="mt-3 flex gap-2">
              <button onClick={handleExportBackup} className="btn-secondary">Exportar backup</button>
              <label className="btn-secondary cursor-pointer">
                Importar backup
                <input type="file" accept="application/json" onChange={handleImportFile} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4">
          {error && <div className="text-sm text-error">{error}</div>}
          {message && <div className="text-sm text-success">{message}</div>}
        </div>
      </div>
    </div>
  )
}
