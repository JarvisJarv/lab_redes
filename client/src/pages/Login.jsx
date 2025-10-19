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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-6 w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-4 text-center">Identidade do Aluno</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded">
            <h2 className="font-semibold mb-2">Criar Identidade</h2>
            <p className="text-sm mb-3">
              Preencha Nome e Matrícula e clique em criar. Isso gerará um par de chaves (ECDSA P-256).
              A chave privada ficará armazenada neste dispositivo.
            </p>
            <label className="block text-sm">Nome</label>
            <input value={nome} onChange={(event) => setNome(event.target.value)} className="w-full border p-2 rounded mb-2" />
            <label className="block text-sm">Matrícula</label>
            <input
              value={matricula}
              onChange={(event) => setMatricula(event.target.value)}
              className="w-full border p-2 rounded mb-2"
            />
            <label className="block text-sm">Curso</label>
            <input
              value={curso}
              onChange={(event) => setCurso(event.target.value)}
              className="w-full border p-2 rounded mb-3"
            />
            <button onClick={handleCreateIdentity} className="btn-primary w-full" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Identidade'}
            </button>
          </div>

          <div className="p-4 border rounded">
            <h2 className="font-semibold mb-2">Login</h2>
            <p className="text-sm mb-3">
              Informe a matrícula usada na criação da identidade e clique em Login. Se não tiver o backup da chave privada neste
              dispositivo, importe-o primeiro.
            </p>
            <div className="mb-3">
              <label className="block text-sm">Nome (opcional)</label>
              <input
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                className="w-full border p-2 rounded mb-2"
                placeholder="Nome (opcional)"
              />
              <label className="block text-sm">
                Matrícula <span className="text-red-500">*</span>
              </label>
              <input
                value={matricula}
                onChange={(event) => setMatricula(event.target.value)}
                className={`w-full border p-2 rounded mb-2 ${!matricula.trim() ? 'border-red-400' : ''}`}
                placeholder="Ex: 2025001"
              />
              {!matricula.trim() && <div className="text-xs text-red-500 mb-2">A matrícula é obrigatória para login.</div>}
            </div>
            <button onClick={handleLogin} className="btn-primary w-full" disabled={!matricula.trim()}>
              Login
            </button>
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
