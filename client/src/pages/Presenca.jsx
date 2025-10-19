import React, { useEffect, useMemo, useState } from 'react'
import { useToast } from '../components/ToastProvider'

const AULA_FIXA = 'Redes de Computadores'

function formatDateTime(iso) {
  if (!iso) return { data: '—', hora: '—' }
  try {
    const d = new Date(iso)
    return {
      data: d.toLocaleDateString(),
      hora: d.toLocaleTimeString(),
    }
  } catch {
    return { data: iso, hora: '' }
  }
}

export default function Presenca() {
  const [presencas, setPresencas] = useState([])
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', text: '' })
  const userName = localStorage.getItem('userName') || localStorage.getItem('nome') || ''
  const userDID = localStorage.getItem('userDID')
  const { show } = useToast()

  useEffect(() => {
    loadPresencas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const total = presencas.length
  const ultimaPresenca = useMemo(() => presencas[0] || null, [presencas])
  const ultimaData = useMemo(() => (ultimaPresenca ? formatDateTime(ultimaPresenca.dataHora) : null), [ultimaPresenca])

  async function loadPresencas() {
    if (userDID) {
      try {
        const res = await fetch(`/api/presencas?did=${encodeURIComponent(userDID)}`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            const ordenado = data
              .slice()
              .sort((a, b) => new Date(b.dataHora || 0).getTime() - new Date(a.dataHora || 0).getTime())
            setPresencas(ordenado)
            return
          }
        }
      } catch (err) {
        console.warn('Falha ao buscar presenças no backend. Usando dados locais.', err)
      }
    }

    const raw = localStorage.getItem('presencas')
    try {
      const arr = raw ? JSON.parse(raw) : []
      const filtered = userDID ? arr.filter((p) => p.did === userDID) : arr
      const ordenado = filtered
        .slice()
        .sort((a, b) => new Date(b.dataHora || 0).getTime() - new Date(a.dataHora || 0).getTime())
      setPresencas(ordenado)
    } catch (err) {
      console.error('Erro ao carregar presenças locais:', err)
      setPresencas([])
    }
  }

  function resetFeedback() {
    setTimeout(() => setFeedback({ type: '', text: '' }), 5000)
  }

  async function handleRegister() {
    const did = userDID
    if (!did) {
      setFeedback({ type: 'error', text: 'Usuário não autenticado. Faça login novamente.' })
      return
    }

    setLoading(true)
    try {
      const payload = { did, eventoID: AULA_FIXA, nomeEvento: AULA_FIXA }
      const res = await fetch('/api/presenca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao registrar presença no servidor')
      }

      const data = await res.json()
      const dt = formatDateTime(data.dataHora)
      setFeedback({ type: 'success', text: `Presença registrada com sucesso em ${dt.data} às ${dt.hora}` })
      show('Presença registrada com sucesso!')

      await loadPresencas()

      try {
        const raw = localStorage.getItem('presencas')
        const arr = raw ? JSON.parse(raw) : []
        arr.push(data)
        localStorage.setItem('presencas', JSON.stringify(arr))
      } catch (err) {
        console.warn('Não foi possível atualizar o cache local de presenças:', err)
      }

      resetFeedback()
    } catch (err) {
      const message = err.message || 'Erro ao registrar presença'
      setFeedback({ type: 'error', text: message })
      show(message)
      resetFeedback()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-10 pb-10 text-slate-100">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/20 to-slate-900/40 p-8 shadow-2xl">
        <div className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/2 bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.2),_transparent_60%)]" />
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-4">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
              Aula monitorada
            </span>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">Olá, {userName || 'aluno'}.</h1>
            <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
              Registre sua presença com um clique e acompanhe os registros oficiais da disciplina <strong>{AULA_FIXA}</strong>.
            </p>
            {feedback.text && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                  feedback.type === 'success'
                    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                    : 'border-rose-400/40 bg-rose-400/10 text-rose-200'
                }`}
              >
                {feedback.text}
              </div>
            )}
          </div>

          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-cyan-500/20">
            <h2 className="text-lg font-semibold text-white">Detalhes rápidos</h2>
            <dl className="mt-4 space-y-3 text-sm text-slate-200">
              <div className="flex items-center justify-between">
                <dt className="text-xs uppercase tracking-[0.25em] text-cyan-200">Disciplina</dt>
                <dd className="text-sm text-white">{AULA_FIXA}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-xs uppercase tracking-[0.25em] text-cyan-200">Total</dt>
                <dd className="text-sm text-white">{total}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-xs uppercase tracking-[0.25em] text-cyan-200">Último registro</dt>
                <dd className="text-right text-sm text-white">
                  {ultimaData ? (
                    <>
                      <span className="block">{ultimaData.data}</span>
                      <span className="text-xs text-slate-300">{ultimaData.hora}</span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-300">Nenhum registro</span>
                  )}
                </dd>
              </div>
            </dl>

            <button
              onClick={handleRegister}
              disabled={loading}
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Registrando presença...' : 'Registrar presença agora'}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Histórico de presenças</h2>
            <p className="text-sm text-slate-300">Conferir cada registro ajuda a manter o acompanhamento oficial atualizado.</p>
          </div>
        </div>

        {presencas.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-sm text-slate-300">
            Nenhuma presença registrada ainda. Use o botão acima para gerar o primeiro registro.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.2em] text-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">Aula</th>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Hora</th>
                  <th className="px-4 py-3 text-left">Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-white/5 text-slate-100">
                {presencas.map((p) => {
                  const dt = formatDateTime(p.dataHora)
                  return (
                    <tr key={p.id || `${p.eventoID}-${p.dataHora}`}> 
                      <td className="px-4 py-3 text-sm font-medium text-white">{p.nomeEvento || p.eventoID}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{dt.data}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{dt.hora}</td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-200">{p.hash || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
