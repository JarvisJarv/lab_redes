import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'
import ModalConfirm from '../components/ModalConfirm'

const STORAGE_KEY = 'presencas'

export default function Historico() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [presencas, setPresencas] = useState([])
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    try {
      const parsed = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed)) {
        setPresencas(parsed.slice().reverse())
      } else {
        setPresencas([])
      }
    } catch (err) {
      console.error('Erro ao ler presencas', err)
      setPresencas([])
    }
  }, [])

  function abrirConfirmacao() {
    setConfirmOpen(true)
  }

  function limparHistorico() {
    localStorage.removeItem(STORAGE_KEY)
    setPresencas([])
    setConfirmOpen(false)
    show('Histórico limpo')
  }

  return (
    <>
      <div className="min-h-screen p-4 flex flex-col items-center text-white">
        <div className="w-full max-w-4xl">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Histórico de Presenças</h1>
            <div className="flex gap-2">
              <button className="btn-primary bg-gray-700" onClick={() => navigate('/home')}>
                Voltar
              </button>
              <button className="btn-primary bg-red-600" onClick={abrirConfirmacao}>
                Limpar Histórico
              </button>
            </div>
          </div>

          {presencas.length === 0 ? (
            <div className="card p-6 text-center">Nenhuma presença registrada ainda.</div>
          ) : (
            <div className="overflow-x-auto card p-4">
              <table className="w-full table-auto text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2">Evento</th>
                    <th className="p-2">Data/Hora</th>
                    <th className="p-2">DID</th>
                    <th className="p-2">Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {presencas.map((presenca, index) => (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="p-2 align-top">{presenca.nomeEvento || presenca.eventoID}</td>
                      <td className="p-2 align-top">{new Date(presenca.dataHora).toLocaleString()}</td>
                      <td className="p-2 align-top break-words">{presenca.did}</td>
                      <td className="p-2 align-top break-words">{presenca.hash}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ModalConfirm
        open={confirmOpen}
        title="Limpar histórico"
        message="Deseja realmente limpar todo o histórico de presenças?"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={limparHistorico}
      />
    </>
  )
}
