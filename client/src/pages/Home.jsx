import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'
import useVantaNet from '../hooks/useVantaNet'
import { getProfilePhotoStorageKey, loadProfilePhoto } from '../utils/profilePhotoStorage'

function gerarUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function Home() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [did, setDid] = useState('')
  const [userName, setUserName] = useState('')
  const [matricula, setMatricula] = useState('')
  const [profilePhoto, setProfilePhoto] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [presencasCount, setPresencasCount] = useState(0)
  const [ultimaPresenca, setUltimaPresenca] = useState(null)
  const vantaRef = useVantaNet()

  function atualizarResumoComLista(lista, didFiltro) {
    if (!Array.isArray(lista) || lista.length === 0) {
      setPresencasCount(0)
      setUltimaPresenca(null)
      return
    }

    const filtro = didFiltro ? lista.filter((item) => item.did === didFiltro) : lista
    if (filtro.length === 0) {
      setPresencasCount(0)
      setUltimaPresenca(null)
      return
    }

    const ordenadas = [...filtro].sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora))
    setPresencasCount(ordenadas.length)
    setUltimaPresenca(ordenadas[0])
  }

  async function carregarPresencas(didValor) {
    const alvoDid = typeof didValor === 'string' ? didValor : did

    if (alvoDid) {
      try {
        const res = await fetch(`/api/presencas?did=${encodeURIComponent(alvoDid)}`)
        if (res.ok) {
          const dados = await res.json()
          if (Array.isArray(dados)) {
            atualizarResumoComLista(dados, alvoDid)
            try {
              localStorage.setItem('presencas', JSON.stringify(dados))
            } catch (err) {
              console.warn('Não foi possível armazenar presenças localmente', err)
            }
            return
          }
        }
      } catch (err) {
        console.warn('Erro ao sincronizar presenças com o servidor', err)
      }
    }

    try {
      const raw = localStorage.getItem('presencas')
      const arr = raw ? JSON.parse(raw) : []
      atualizarResumoComLista(arr, alvoDid || null)
    } catch (err) {
      console.error(err)
      atualizarResumoComLista([], alvoDid || null)
    }
  }

  useEffect(() => {
    const d = localStorage.getItem('userDID') || ''
    const n = localStorage.getItem('userName') || ''
    const m = localStorage.getItem('matricula') || ''
    setDid(d)
    setUserName(n)
    setMatricula(m)
    carregarPresencas(d)
  }, [])

  const profileStorageContext = useMemo(
    () => ({ isAdmin: false, did, matricula }),
    [did, matricula],
  )
  const profileStorageKey = useMemo(
    () => getProfilePhotoStorageKey(profileStorageContext),
    [profileStorageContext],
  )
  const profileKeyRef = useRef(profileStorageKey)

  useEffect(() => {
    profileKeyRef.current = profileStorageKey
  }, [profileStorageKey])

  useEffect(() => {
    if (!did && !matricula) {
      setProfilePhoto('')
      return
    }

    const foto = loadProfilePhoto(profileStorageContext)
    setProfilePhoto(foto)
  }, [did, matricula, profileStorageContext])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    function handleProfilePhotoUpdate(event) {
      const eventKey = event?.detail?.key
      if (!eventKey || eventKey !== profileKeyRef.current) {
        return
      }

      const nextPhoto = typeof event.detail.dataUrl === 'string' ? event.detail.dataUrl : ''
      setProfilePhoto(nextPhoto)
    }

    window.addEventListener('profile-photo-updated', handleProfilePhotoUpdate)

    return () => {
      window.removeEventListener('profile-photo-updated', handleProfilePhotoUpdate)
    }
  }, [])

  function abrirModal() {
    setCodigo('')
    setModalOpen(true)
  }

  function fecharModal() {
    setModalOpen(false)
    setRegistrando(false)
  }

  async function confirmarPresenca() {
    const codigoTrim = (codigo || '').toString().trim()
    if (!codigoTrim) {
      show('Por favor, informe o código do evento')
      return
    }

    if (!did) {
      show('Identidade não encontrada. Faça login novamente.')
      return
    }

    setRegistrando(true)

    try {
      const payload = {
        eventoID: codigoTrim,
        nomeEvento: codigoTrim || 'Evento sem nome',
        did,
      }
      const res = await fetch('/api/presenca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const texto = await res.text()
        throw new Error(texto || 'Erro ao registrar presença no servidor')
      }

      const registro = await res.json()
      fecharModal()
      setCodigo('')
      show('Presença registrada com sucesso!')
      await carregarPresencas(did)
      try {
        const raw = localStorage.getItem('presencas')
        const arr = raw ? JSON.parse(raw) : []
        const atualizadas = Array.isArray(arr) ? [...arr.filter((p) => p.id !== registro.id), registro] : [registro]
        localStorage.setItem('presencas', JSON.stringify(atualizadas))
      } catch (err) {
        console.warn('Não foi possível atualizar as presenças locais', err)
      }
    } catch (err) {
      console.error('Erro ao registrar presença', err)
      let fallbackSucesso = false
      try {
        const raw = localStorage.getItem('presencas')
        const arr = raw ? JSON.parse(raw) : []
        const fallback = {
          id: gerarUUID(),
          eventoID: codigoTrim,
          nomeEvento: codigoTrim || 'Evento sem nome',
          dataHora: new Date().toISOString(),
          did,
          hash: gerarUUID(),
        }
        const atualizadas = Array.isArray(arr) ? [...arr, fallback] : [fallback]
        localStorage.setItem('presencas', JSON.stringify(atualizadas))
        atualizarResumoComLista(atualizadas, did)
        fecharModal()
        setCodigo('')
        show('Presença salva localmente. Sincronize quando possível.')
        fallbackSucesso = true
      } catch (storageErr) {
        console.error('Erro ao salvar presença localmente', storageErr)
      }

      if (!fallbackSucesso) {
        show(err.message || 'Erro ao registrar presença')
      }
    } finally {
      setRegistrando(false)
    }
  }

  function abrirLeitorQr() {
    show('Aponte a câmera do dispositivo para o QR Code disponível no evento para registrar sua presença.')
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

  const participantInitials = useMemo(() => {
    if (!userName) return 'P'
    return userName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join('')
  }, [userName])

  const profilePhotoAlt = useMemo(
    () => (userName ? `Foto do participante ${userName}` : 'Foto do participante autenticado'),
    [userName]
  )

  return (
    <>
      <div className="page-with-vanta" ref={vantaRef}>
        <div className="page-with-vanta__content px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="glass-panel glass-panel--highlight p-6 sm:p-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 space-y-4">
              <span className="chip">Área do participante</span>
              <div>
                <h1 className="text-3xl font-semibold sm:text-4xl">Gerencie suas presenças digitais</h1>
                <p className="section-subtitle max-w-xl">
                  Bem-vindo{userName ? `, ${userName}` : ''}! Acompanhe seus comprovantes, registre novos eventos e mantenha suas presenças sempre organizadas.
                </p>
              </div>
              <div className="participant-profile">
                <div className="participant-profile__photo">
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt={profilePhotoAlt}
                    />
                  ) : (
                    <span>{participantInitials}</span>
                  )}
                </div>
                <div className="participant-profile__details">
                  <p className="participant-profile__name">{userName || 'Participante autenticado'}</p>
                  {!profilePhoto ? (
                    <p className="participant-profile__caption">
                      Adicione uma foto pelo menu de configurações no topo para personalizar seu perfil.
                    </p>
                  ) : null}
                </div>
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
                <span className="chip">Identificador protegido</span>
                <p className="text-sm text-slate-300">Seu identificador descentralizado é gerenciado automaticamente pela aplicação e permanece oculto para sua segurança.</p>
              </header>
              <div className="rounded-lg border border-dashed border-slate-500/60 bg-black/20 p-4 text-sm leading-relaxed text-slate-300">
                Apenas a aplicação possui acesso ao identificador quando necessário.
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="badge">Acesso restrito</span>
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
            <p className="summary-card__label">Mantenha seus comprovantes atualizados para futuras confirmações.</p>
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
                <button className="btn-secondary" onClick={abrirLeitorQr} type="button">
                  Ler QR Code
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
              <div className="quick-card__title">Mantenha tudo sincronizado</div>
              <p className="quick-card__description">
                Os seus comprovantes ficam armazenados com segurança neste dispositivo. Sincronize com a organização sempre que necessário.
              </p>
              <div className="quick-card__footer">
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
            <li>Garanta que seu dispositivo esteja autenticado com as credenciais fornecidas pela instituição.</li>
            <li>Ao chegar em um evento, utilize o botão &quot;Registrar presença&quot; para escanear ou inserir o código.</li>
            <li>Confirme os detalhes do evento e salve seu comprovante localmente.</li>
            <li>Volte ao histórico para consultar, revisar ou validar participações passadas sempre que necessário.</li>
          </ol>
        </section>
          </div>
        </div>
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
              <button className="btn-primary" onClick={confirmarPresenca} type="button" disabled={registrando}>
                {registrando ? 'Registrando...' : 'Confirmar presença'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

