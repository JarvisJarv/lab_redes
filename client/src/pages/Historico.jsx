import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'
import ModalConfirm from '../components/ModalConfirm'

const STORAGE_KEY = 'presencas'

function formatDateTime(isoString) {
  if (!isoString) return { date: 'Data indisponível', time: '' }
  try {
    const date = new Date(isoString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    }
  } catch {
    return { date: isoString, time: '' }
  }
}

export default function Historico() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [presencas, setPresencas] = useState([])
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    carregarPresencas()
  }, [])

  const total = presencas.length
  const ultimaPresenca = useMemo(() => presencas[0] || null, [presencas])
  const ultimaData = useMemo(() => (ultimaPresenca ? formatDateTime(ultimaPresenca.dataHora) : null), [ultimaPresenca])

  function carregarPresencas() {
    const raw = localStorage.getItem(STORAGE_KEY)
    try {
      const parsed = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed)) {
        const ordenado = parsed
          .slice()
          .sort((a, b) => new Date(b.dataHora || 0).getTime() - new Date(a.dataHora || 0).getTime())
        setPresencas(ordenado)
      } else {
        setPresencas([])
      }
    } catch (err) {
      console.error('Erro ao ler presenças', err)
      setPresencas([])
    }
  }

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
      <div className="space-y-10 pb-10 text-slate-100">
        <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/20 to-slate-900/40 p-8 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200">
                Histórico de presenças
              </span>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">Seu rastro de participações em um só lugar.</h1>
              <p className="text-sm text-slate-200 sm:text-base">
                Revise os eventos validados, consulte hashes para auditoria e limpe registros antigos quando desejar um novo ciclo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigate('/home')}
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/40 hover:bg-white/10"
              >
                Registrar nova presença
              </button>
              <button
                onClick={abrirConfirmacao}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-rose-400 to-red-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-rose-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-500/30"
              >
                Limpar histórico
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-cyan-500/15">
              <span className="text-[0.65rem] uppercase tracking-[0.3em] text-cyan-200">Presenças</span>
              <p className="mt-3 text-3xl font-semibold text-white">{total}</p>
              <p className="mt-1 text-xs text-slate-300">Total de registros armazenados neste dispositivo</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-slate-900/40">
              <span className="text-[0.65rem] uppercase tracking-[0.3em] text-cyan-200">Última presença</span>
              {ultimaData ? (
                <div className="mt-3 space-y-1 text-sm text-slate-100">
                  <p className="text-lg font-semibold text-white">{ultimaData.date}</p>
                  <p className="text-xs text-slate-300">Às {ultimaData.time}</p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-300">Nenhum evento registrado ainda.</p>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-cyan-500/15">
              <span className="text-[0.65rem] uppercase tracking-[0.3em] text-cyan-200">Hash mais recente</span>
              <p className="mt-3 break-all font-mono text-xs text-white/90">
                {ultimaPresenca?.hash || '—'}
              </p>
            </div>
          </div>
        </header>

        {presencas.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/20 bg-slate-900/40 p-10 text-center text-sm text-slate-300 shadow-inner shadow-black/30">
            Nenhuma presença registrada até o momento. Valide um evento para acompanhar o histórico detalhado aqui.
          </div>
        ) : (
          <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-white">Linha do tempo de presenças</h2>
            <p className="mt-2 text-sm text-slate-300">
              Cada registro traz o evento, data/hora e hash gerado no momento da validação para facilitar auditorias.
            </p>

            <div className="mt-6 space-y-6">
              {presencas.map((presenca, index) => {
                const dt = formatDateTime(presenca.dataHora)
                return (
                  <article
                    key={`${presenca.hash}-${index}`}
                    className="relative rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 sm:p-6"
                  >
                    {index !== presencas.length - 1 && (
                      <div className="pointer-events-none absolute left-6 top-12 -ml-px h-[calc(100%-3.5rem)] w-px bg-white/10" aria-hidden="true" />
                    )}
                    <span className="absolute -left-3 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20">
                      {total - index}
                    </span>
                    <div className="ml-10 space-y-3 text-sm text-slate-100">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                        <div>
                          <span className="text-[0.65rem] uppercase tracking-[0.28em] text-cyan-200">Evento</span>
                          <h3 className="mt-2 text-lg font-semibold text-white">{presenca.nomeEvento || presenca.eventoID}</h3>
                        </div>
                        <div className="text-xs text-slate-300">
                          <p>{dt.date}</p>
                          <p>{dt.time}</p>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                          <span className="text-[0.65rem] uppercase tracking-[0.25em] text-cyan-200">DID</span>
                          <p className="mt-2 break-all font-mono text-xs text-white/90">{presenca.did || '—'}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                          <span className="text-[0.65rem] uppercase tracking-[0.25em] text-cyan-200">Hash</span>
                          <p className="mt-2 break-all font-mono text-xs text-white/90">{presenca.hash || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}
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
