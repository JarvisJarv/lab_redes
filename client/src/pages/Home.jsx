import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'

function gerarUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function Home() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [did, setDid] = useState('')
  const [userName, setUserName] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [presencasCount, setPresencasCount] = useState(0)
  const [ultimaPresenca, setUltimaPresenca] = useState(null)

  useEffect(() => {
    const d = localStorage.getItem('userDID') || ''
    const n = localStorage.getItem('userName') || ''
    setDid(d)
    setUserName(n)

    try {
      const raw = localStorage.getItem('presencas')
      const arr = raw ? JSON.parse(raw) : []
      if (Array.isArray(arr) && arr.length > 0) {
        const ordered = [...arr].sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora))
        setPresencasCount(arr.length)
        setUltimaPresenca(ordered[0])
      } else {
        setPresencasCount(0)
        setUltimaPresenca(null)
      }
    } catch (err) {
      console.error(err)
      setPresencasCount(0)
      setUltimaPresenca(null)
    }
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

    const obj = {
      eventoID: codigoTrim,
      nomeEvento: codigoTrim || 'Evento sem nome',
      dataHora: new Date().toISOString(),
      did: did,
      hash: gerarUUID(),
    }

    try {
      const raw = localStorage.getItem('presencas')
      const arr = raw ? JSON.parse(raw) : []
      arr.push(obj)
      localStorage.setItem('presencas', JSON.stringify(arr))
      fecharModal()
      show('Presença registrada com sucesso!')
      setPresencasCount(arr.length)
      setUltimaPresenca(obj)
    } catch (err) {
      console.error(err)
      show('Erro ao salvar presença')
    }
  }

  function handleCopyDid() {
    if (!did) {
      show('DID não disponível no momento')
      return
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(did).then(
        () => show('DID copiado para a área de transferência!'),
        () => show('Não foi possível copiar o DID')
      )
    } else {
      show('Copie o DID manualmente: recurso indisponível neste navegador')
    }
  }

  const ultimoRegistro = useMemo(() => {
    if (!ultimaPresenca) return 'Nenhum registro encontrado'
    try {
      return new Date(ultimaPresenca.dataHora).toLocaleString()
    } catch (err) {
      return '—'
    }
  }, [ultimaPresenca])

  const ultimoEvento = ultimaPresenca?.nomeEvento || ultimaPresenca?.eventoID || 'Sem nome definido'

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="glass-panel glass-panel--highlight p-6 sm:p-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 space-y-4">
              <span className="chip">Área do participante</span>
              <div>
                <h1 className="text-3xl font-semibold sm:text-4xl">Gerencie suas presenças digitais</h1>
                <p className="section-subtitle max-w-xl">
                  Bem-vindo{userName ? `, ${userName}` : ''}! Acompanhe seus comprovantes, registre novos eventos e mantenha seu DID sempre por perto.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="btn-primary" onClick={abrirModal} type="button">
                  Registrar presença
                </button>
                <button className="btn-secondary" onClick={() => navigate('/historico')} type="button">
                  Acessar histórico
                </button>
              </div>
            </div>

            <aside className="glass-panel glass-panel--subtle w-full max-w-sm space-y-4 p-5">
              <header className="space-y-1">
                <span className="chip">Seu DID</span>
                <p className="text-sm text-slate-300">Use este identificador para validar sua participação em eventos.</p>
              </header>
              <div className="rounded-lg border border-dashed border-slate-500/60 bg-black/20 p-4 text-sm leading-relaxed">
                {did || '— DID não encontrado —'}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" onClick={handleCopyDid} type="button">
                  Copiar DID
                </button>
                <span className="badge">Confidencial</span>
              </div>
            </aside>
          </div>
        </section>

        <section className="summary-grid">
          <article className="glass-panel summary-card">
            <span className="summary-card__label">Presenças registradas</span>
            <span className="summary-card__value">{presencasCount}</span>
            <p className="summary-card__label">Total de comprovantes armazenados neste dispositivo.</p>
          </article>
          <article className="glass-panel summary-card">
            <span className="summary-card__label">Último registro</span>
            <span className="summary-card__value text-xl">{ultimoRegistro}</span>
            <p className="summary-card__label">Sincronize manualmente novos eventos quando necessário.</p>
          </article>
          <article className="glass-panel summary-card">
            <span className="summary-card__label">Evento mais recente</span>
            <span className="summary-card__value text-xl">{ultimaPresenca ? ultimoEvento : 'Aguardando registro'}</span>
            <p className="summary-card__label">Mantenha seu DID atualizado para futuras confirmações.</p>
          </article>
        </section>

        <section className="glass-panel p-6 sm:p-8 space-y-6">
          <header>
            <h2 className="section-title">O que você pode fazer por aqui</h2>
            <p className="section-subtitle">A experiência foi pensada para ser rápida, intuitiva e totalmente responsiva.</p>
          </header>

          <div className="quick-grid">
            <article className="quick-card">
              <div className="quick-card__title">Registrar presença em segundos</div>
              <p className="quick-card__description">
                Informe o código do evento ou escaneie um QR Code para gerar um comprovante instantaneamente no seu dispositivo.
              </p>
              <div className="quick-card__footer">
                <button className="btn-primary" onClick={abrirModal} type="button">
                  Registrar agora
                </button>
              </div>
            </article>

            <article className="quick-card">
              <div className="quick-card__title">Consultar histórico inteligente</div>
              <p className="quick-card__description">
                Visualize todos os seus comprovantes com detalhes completos e exporte informações sempre que precisar.
              </p>
              <div className="quick-card__footer">
                <button className="btn-secondary" onClick={() => navigate('/historico')} type="button">
                  Abrir histórico
                </button>
              </div>
            </article>

            <article className="quick-card">
              <div className="quick-card__title">Proteja seu DID</div>
              <p className="quick-card__description">
                O seu identificador descentralizado é único. Compartilhe apenas com organizadores confiáveis e mantenha-o seguro.
              </p>
              <div className="quick-card__footer">
                <button className="btn-secondary" onClick={handleCopyDid} type="button">
                  Copiar identificador
                </button>
                <span className="badge badge--success">Seguro</span>
              </div>
            </article>
          </div>
        </section>

        <section className="glass-panel glass-panel--subtle p-6 sm:p-8 space-y-5">
          <header>
            <h2 className="section-title">Como funciona</h2>
            <p className="section-subtitle">Siga as etapas abaixo para aproveitar todo o potencial do sistema.</p>
          </header>
          <ol className="info-list list-decimal">
            <li>Garanta que seu dispositivo esteja autenticado com o DID informado acima.</li>
            <li>Ao chegar em um evento, utilize o botão &quot;Registrar presença&quot; para escanear ou inserir o código.</li>
            <li>Confirme os detalhes do evento e salve seu comprovante localmente.</li>
            <li>Volte ao histórico para consultar, revisar ou validar participações passadas sempre que necessário.</li>
          </ol>
        </section>
      </div>

      {modalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-surface">
            <h4 className="modal-title">Registrar presença manualmente</h4>
            <p className="section-subtitle">Cole ou digite o código fornecido pelo organizador para gerar o comprovante.</p>
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="codigo-presenca">
                Código do evento
              </label>
              <input
                id="codigo-presenca"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ex: EVENTO-2024-01"
                autoFocus
              />
              <p className="input-hint">O comprovante ficará salvo apenas neste navegador.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={fecharModal} type="button">
                Cancelar
              </button>
              <button className="btn-primary" onClick={confirmarPresenca} type="button">
                Confirmar presença
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

