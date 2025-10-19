import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'
import ModalConfirm from '../components/ModalConfirm'

export default function Historico() {
  const navigate = useNavigate()
  const [presencas, setPresencas] = useState([])

  useEffect(() => {
    const raw = localStorage.getItem('presencas')
    try {
      const arr = raw ? JSON.parse(raw) : []
      setPresencas(Array.isArray(arr) ? arr.reverse() : [])
    } catch (err) {
      console.error('Erro ao ler presencas', err)
      setPresencas([])
    }
  }, [])

  const { show } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)

  function limparHistorico() {
    setConfirmOpen(true)
  }

  function doLimpar() {
    localStorage.removeItem('presencas')
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
              <button className="btn-primary bg-red-600" onClick={limparHistorico}>
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
                {presencas.map((p, idx) => (
                  <tr key={idx} className="border-b last:border-b-0">
                    <td className="p-2 align-top">{p.nomeEvento || p.eventoID}</td>
                    <td className="p-2 align-top">{new Date(p.dataHora).toLocaleString()}</td>
                    <td className="p-2 align-top break-words">{p.did}</td>
                    <td className="p-2 align-top break-words">{p.hash}</td>
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
      onConfirm={doLimpar}
    />
    </>
  )
}
