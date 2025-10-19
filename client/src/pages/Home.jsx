import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'

const STORAGE_KEY = 'presencas'

function gerarUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function Home() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [did, setDid] = useState('')
  const [userName, setUserName] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [codigo, setCodigo] = useState('')

  useEffect(() => {
    setDid(localStorage.getItem('userDID') || '')
    setUserName(localStorage.getItem('userName') || '')
  }, [])

  function abrirModal() {
    setCodigo('')
    setModalOpen(true)
  }

  function fecharModal() {
    setModalOpen(false)
  }

  function confirmarPresenca() {
    const codigoTrim = (codigo || '').toString().trim()
    if (!codigoTrim) {
      show('Por favor, informe o código do evento')
      return
    }

    const registro = {
      eventoID: codigoTrim,
      nomeEvento: codigoTrim,
      dataHora: new Date().toISOString(),
      did,
      hash: gerarUUID(),
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const arr = raw ? JSON.parse(raw) : []
      arr.push(registro)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
      fecharModal()
      show('Presença registrada com sucesso!')
    } catch (err) {
      console.error('Erro ao salvar presença:', err)
      show('Erro ao salvar presença')
    }
  }

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-start bg-transparent text-white">
      <div className="w-full max-w-3xl mx-auto">
        <div className="card p-6 mb-4 text-center">
          <h2 className="text-xl font-bold mb-2">Bem-vindo{userName ? `, ${userName}` : ''}</h2>
          <p className="text-sm mb-2">Seu DID:</p>
          <div className="w-full break-words bg-white/10 p-3 rounded-md mb-3">{did || '— não encontrado —'}</div>

          <div className="flex gap-3 flex-wrap justify-center">
            <button className="btn-primary" onClick={abrirModal}>
              Escanear QR Code
            </button>

            <button
              className="btn-primary btn-secondary"
              onClick={() => navigate('/historico')}
            >
              Ver Histórico
            </button>
          </div>
        </div>

        <div className="card p-6 text-center">
          <h3 className="font-semibold mb-2">Ações rápidas</h3>
          <p className="text-sm text-black/70">Use o botão "Escanear QR Code" para registrar presença manualmente.</p>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/60" onClick={fecharModal}></div>
          <div className="bg-white text-black rounded-md p-6 z-10 w-full max-w-md">
            <h4 className="text-lg font-bold mb-3">Escanear / Inserir código do evento</h4>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="w-full border p-2 rounded mb-3"
              placeholder="Cole ou digite o código (ex: EVENTO123)"
            />
            <div className="flex justify-end gap-2">
              <button className="btn-primary bg-gray-300 text-black" onClick={fecharModal}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={confirmarPresenca}>
                Confirmar Presença
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

