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

  const ultimaPresenca = presencas.length > 0 ? presencas[0] : null
  const primeiroRegistro = presencas.length > 0 ? presencas[presencas.length - 1] : null

  function formatarData(item) {
    if (!item?.dataHora) return '—'
    try {
      return new Date(item.dataHora).toLocaleString()
    } catch (err) {
      return '—'
    }
  }

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <section className="glass-panel p-6 sm:p-10 space-y-6">
            <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <span className="chip">Seus comprovantes</span>
                <div>
                  <h1 className="text-3xl font-semibold sm:text-4xl">Histórico de presenças</h1>
                  <p className="section-subtitle max-w-2xl">
                    Consulte cada participação registrada neste dispositivo. Todos os dados são mantidos localmente para proteger sua privacidade.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" onClick={() => navigate('/home')} type="button">
                  Voltar para a página inicial
                </button>
                <button className="btn-danger" onClick={limparHistorico} type="button">
                  Limpar histórico
                </button>
              </div>
            </header>

            <div className="summary-grid">
              <article className="glass-panel glass-panel--subtle summary-card">
                <span className="summary-card__label">Total de registros</span>
                <span className="summary-card__value">{presencas.length}</span>
                <p className="summary-card__label">Comprovantes salvos no armazenamento local.</p>
              </article>
              <article className="glass-panel glass-panel--subtle summary-card">
                <span className="summary-card__label">Último evento</span>
                <span className="summary-card__value text-xl">{ultimaPresenca ? ultimaPresenca.nomeEvento || ultimaPresenca.eventoID : 'Nenhum registro'}</span>
                <p className="summary-card__label">{ultimaPresenca ? formatarData(ultimaPresenca) : 'Aguarde um novo registro para visualizar detalhes.'}</p>
              </article>
              <article className="glass-panel glass-panel--subtle summary-card">
                <span className="summary-card__label">Primeiro registro</span>
                <span className="summary-card__value text-xl">{primeiroRegistro ? primeiroRegistro.nomeEvento || primeiroRegistro.eventoID : '—'}</span>
                <p className="summary-card__label">{primeiroRegistro ? formatarData(primeiroRegistro) : 'Nenhuma presença armazenada até o momento.'}</p>
              </article>
            </div>
          </section>

          {presencas.length === 0 ? (
            <section className="glass-panel glass-panel--subtle p-12 text-center">
              <h2 className="text-2xl font-semibold">Nenhuma presença registrada</h2>
              <p className="section-subtitle mt-3">
                Utilize o botão &quot;Registrar presença&quot; na tela inicial para adicionar seu primeiro comprovante.
              </p>
              <div className="mt-6 flex justify-center">
                <button className="btn-primary" onClick={() => navigate('/home')} type="button">
                  Registrar presença agora
                </button>
              </div>
            </section>
          ) : (
            <section className="space-y-6">
              <div className="glass-panel p-0">
                <div className="data-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Evento</th>
                        <th>Data e hora</th>
                        <th>DID</th>
                        <th>Hash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {presencas.map((p, idx) => (
                        <tr key={idx}>
                          <td>{p.nomeEvento || p.eventoID}</td>
                          <td>{formatarData(p)}</td>
                          <td className="break-words">{p.did}</td>
                          <td className="break-words">{p.hash}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="history-grid">
                {presencas.map((p, idx) => (
                  <article key={idx} className="history-card">
                    <div className="history-card__title">{p.nomeEvento || p.eventoID}</div>
                    <div className="history-card__meta">Registrado em {formatarData(p)}</div>
                    <div className="history-card__meta">DID: {p.did}</div>
                    <div className="history-card__meta">Hash: {p.hash}</div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <ModalConfirm
        open={confirmOpen}
        title="Limpar histórico"
        message="Deseja realmente remover todos os comprovantes armazenados neste dispositivo?"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doLimpar}
      />
    </>
  )
}
