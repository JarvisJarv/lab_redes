import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'

const STORAGE_KEY = 'presencas'

const tips = [
  {
    title: 'Sincronização inteligente',
    description: 'Quando estiver conectado, as presenças são buscadas automaticamente no backend para manter o histórico alinhado.',
  },
  {
    title: 'Backup atualizado',
    description: 'Gerencie o arquivo JSON da sua identidade pela tela de login e mantenha-o seguro em nuvem criptografada.',
  },
  {
    title: 'Transparência de registros',
    description: 'Cada presença gera um hash local para auditoria. Consulte-os na aba de histórico quando precisar comprovar.',
  },
]

function gerarUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function formatDateTime(isoString) {
  if (!isoString) return null
  try {
    const date = new Date(isoString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    }
  } catch (err) {
    console.warn('Não foi possível formatar data:', err)
    return null
  }
}

export default function Home() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [did, setDid] = useState('')
  const [userName, setUserName] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [presencas, setPresencas] = useState([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setDid(localStorage.getItem('userDID') || '')
    setUserName(localStorage.getItem('userName') || '')
    atualizarHistorico()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function atualizarHistorico() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      setPresencas([])
      return
    }

    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        setPresencas([])
        return
      }

      const ordenado = parsed
        .slice()
        .sort((a, b) => new Date(b.dataHora || 0).getTime() - new Date(a.dataHora || 0).getTime())
      setPresencas(ordenado)
    } catch (err) {
      console.error('Erro ao ler presenças:', err)
      setPresencas([])
    }
  }

  const ultimaPresenca = useMemo(() => presencas[0] || null, [presencas])
  const ultimaPresencaFormatada = useMemo(() => formatDateTime(ultimaPresenca?.dataHora), [ultimaPresenca])

  function abrirModal() {
    setCodigo('')
    setModalOpen(true)
  }

  function fecharModal() {
    setModalOpen(false)
  }

  async function handleCopyDid() {
    if (!did) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(did)
      } else {
        const temp = document.createElement('textarea')
        temp.value = did
        document.body.appendChild(temp)
        temp.select()
        document.execCommand('copy')
        document.body.removeChild(temp)
      }
      setCopied(true)
      show('DID copiado para a área de transferência')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Erro ao copiar DID:', err)
      show('Não foi possível copiar o DID automaticamente')
    }
  }

  function confirmarPresenca() {
    const codigoTrim = (codigo || '').toString().trim()
    if (!codigoTrim) {
      show('Por favor, informe o código do evento')
      return
    }

    if (!did) {
      show('DID não encontrado. Faça login novamente.')
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
      atualizarHistorico()
      fecharModal()
      show('Presença registrada com sucesso!')
    } catch (err) {
      console.error('Erro ao salvar presença:', err)
      show('Erro ao salvar presença')
    }
  }

  return (
    <div className="space-y-10 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/20 to-slate-900/40 p-8 shadow-2xl">
        <div className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/2 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_60%)]" />
        <div className="pointer-events-none absolute -left-32 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-4">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
              Bem-vindo{userName ? `, ${userName}` : ''}
            </span>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Acompanhe e valide sua presença com um painel elegante e intuitivo.
            </h1>
            <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
              Consulte seu DID, registre presenças com códigos de evento e visualize métricas em tempo real. Tudo centralizado em uma experiência fluida para o laboratório.
            </p>

            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100 shadow-lg shadow-cyan-500/10 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-[0.65rem] uppercase tracking-[0.25em] text-cyan-200">Seu DID</span>
                <p className="mt-2 break-all font-mono text-xs text-white sm:text-sm">{did || '— não encontrado —'}</p>
              </div>
              <button
                onClick={handleCopyDid}
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-white/40 hover:bg-white/10"
              >
                {copied ? 'Copiado!' : 'Copiar DID'}
              </button>
            </div>
          </div>

          <div className="grid w-full gap-4 sm:grid-cols-2 lg:w-auto lg:max-w-sm">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-blue-500/10">
              <span className="text-[0.65rem] uppercase tracking-[0.3em] text-cyan-200">Total</span>
              <p className="mt-3 text-3xl font-semibold text-white">{presencas.length}</p>
              <p className="mt-1 text-xs text-slate-300">Presenças registradas neste dispositivo</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-slate-900/40">
              <span className="text-[0.65rem] uppercase tracking-[0.3em] text-cyan-200">Último registro</span>
              {ultimaPresencaFormatada ? (
                <div className="mt-3 space-y-1 text-sm text-slate-100">
                  <p className="text-lg font-semibold text-white">{ultimaPresencaFormatada.date}</p>
                  <p className="text-xs text-slate-300">Às {ultimaPresencaFormatada.time}</p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-300">Nenhuma presença registrada ainda.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Registrar presença</h2>
              <p className="mt-1 text-sm text-slate-300">
                Use um código fornecido durante o evento ou a leitura de QR Code para validar sua participação instantaneamente.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={abrirModal}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/30"
              >
                Inserir código
              </button>
              <button
                onClick={() => navigate('/historico')}
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/40 hover:bg-white/10"
              >
                Ver histórico
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
              <h3 className="text-sm font-semibold text-white">Fluxo presencial</h3>
              <p className="mt-2 text-xs text-slate-300">
                Aponte a câmera para o QR Code do evento ou digite o código único compartilhado pelo responsável para registrar sua presença.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
              <h3 className="text-sm font-semibold text-white">Sincronização offline</h3>
              <p className="mt-2 text-xs text-slate-300">
                Mesmo sem conexão, as presenças ficam salvas localmente e podem ser consultadas na aba de histórico posteriormente.
              </p>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-white">Boas práticas</h2>
          <p className="text-sm text-slate-300">
            Domine o ecossistema de presenças com pequenas dicas selecionadas para o seu dia a dia.
          </p>
          <div className="space-y-4">
            {tips.map((tip) => (
              <div key={tip.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-white">{tip.title}</h3>
                <p className="mt-1 text-xs text-slate-300">{tip.description}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={fecharModal} />
          <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/40">
            <h3 className="text-xl font-semibold text-white">Insira o código do evento</h3>
            <p className="mt-2 text-sm text-slate-300">
              Cole o identificador recebido ou digite manualmente. Cada código gera um hash único para o seu histórico.
            </p>
            <input
              value={codigo}
              onChange={(event) => setCodigo(event.target.value)}
              className="mt-6 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-300/60 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
              placeholder="Ex: EVENTO123"
            />
            <div className="mt-6 flex justify-end gap-2 text-sm font-semibold">
              <button
                className="rounded-full border border-white/20 px-5 py-2 text-slate-100 transition hover:border-white/40 hover:bg-white/10"
                onClick={fecharModal}
              >
                Cancelar
              </button>
              <button
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2 text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/30"
                onClick={confirmarPresenca}
              >
                Confirmar presença
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

