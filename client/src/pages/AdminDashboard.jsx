import React, { useEffect, useMemo, useState } from 'react'
import useVantaNet from '../hooks/useVantaNet'
import PhotoModal from '../components/PhotoModal'

function formatDateTime(isoString) {
  if (!isoString) return '—'
  try {
    const date = new Date(isoString)
    return date.toLocaleString()
  } catch (err) {
    return '—'
  }
}

function formatDateOnly(isoString) {
  if (!isoString) return '—'
  try {
    const date = new Date(isoString)
    return date.toLocaleDateString()
  } catch (err) {
    return '—'
  }
}

function getUserInitials(user) {
  const source = user?.userName || user?.matricula || ''
  if (!source) return 'ID'
  const parts = source
    .toString()
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return 'ID'
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  const first = parts[0]?.[0] || ''
  const last = parts[parts.length - 1]?.[0] || ''
  return `${first}${last}`.toUpperCase()
}

export default function AdminDashboard() {
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [usersError, setUsersError] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [presencas, setPresencas] = useState([])
  const [loadingPresencas, setLoadingPresencas] = useState(false)
  const [presencasError, setPresencasError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [eventSearchTerm, setEventSearchTerm] = useState('')
  const vantaRef = useVantaNet()
  const [photoPreview, setPhotoPreview] = useState({ isOpen: false, src: '', alt: '' })

  useEffect(() => {
    async function carregarUsuarios() {
      setLoadingUsers(true)
      setUsersError('')
      try {
        const res = await fetch('/api/users')
        if (!res.ok) {
          const txt = await res.text()
          throw new Error(txt || 'Erro ao buscar usuários')
        }
        const data = await res.json()
        if (Array.isArray(data)) {
          const ordenados = [...data].sort((a, b) => {
            const nomeA = (a.userName || '').toLowerCase()
            const nomeB = (b.userName || '').toLowerCase()
            return nomeA.localeCompare(nomeB)
          })
          setUsers(ordenados)
        } else {
          setUsers([])
        }
      } catch (err) {
        console.error('Erro ao carregar usuários', err)
        setUsersError(err.message || 'Erro ao carregar usuários')
        setUsers([])
      } finally {
        setLoadingUsers(false)
      }
    }

    carregarUsuarios()
  }, [])

  async function abrirHistorico(user) {
    setSelectedUser(user)
    setPresencas([])
    setPresencasError('')
    setEventSearchTerm('')
    if (!user?.did) {
      setPresencasError('Usuário não possui DID cadastrado.')
      return
    }

    setLoadingPresencas(true)
    try {
      const res = await fetch(`/api/presencas?did=${encodeURIComponent(user.did)}`)
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Erro ao buscar presenças')
      }
      const data = await res.json()
      if (Array.isArray(data)) {
        const ordenadas = [...data].sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora))
        setPresencas(ordenadas)
      } else {
        setPresencas([])
      }
    } catch (err) {
      console.error('Erro ao buscar presenças', err)
      setPresencasError(err.message || 'Erro ao buscar presenças')
      setPresencas([])
    } finally {
      setLoadingPresencas(false)
    }
  }

  function fecharModal() {
    setSelectedUser(null)
    setPresencas([])
    setPresencasError('')
    setLoadingPresencas(false)
    setEventSearchTerm('')
  }

  function abrirFoto(src, altBase) {
    if (!src) return
    setPhotoPreview({ isOpen: true, src, alt: altBase })
  }

  function fecharFoto() {
    setPhotoPreview((prev) => ({ ...prev, isOpen: false }))
  }

  function handleAvatarKeyDown(event, callback) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      callback()
    }
  }

  const totalUsuariosComDid = useMemo(() => users.filter((u) => Boolean(u.did)).length, [users])
  const totalCursosCadastrados = useMemo(() => {
    const cursos = new Set()
    users.forEach((user) => {
      if (user.curso) {
        cursos.add(user.curso)
      }
    })
    return cursos.size
  }, [users])

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) {
      return users
    }
    const normalized = searchTerm.trim().toLowerCase()
    return users.filter((user) => {
      return [user.userName, user.matricula, user.curso]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalized))
    })
  }, [users, searchTerm])

  const presencasAgrupadas = useMemo(() => {
    if (!presencas.length) return []

    const grupos = new Map()

    presencas.forEach((presenca) => {
      const chave = presenca.eventoID || presenca.nomeEvento || 'evento-desconhecido'
      const nomeEvento = presenca.nomeEvento || presenca.eventoID || 'Evento não identificado'

      if (!grupos.has(chave)) {
        grupos.set(chave, {
          nomeEvento,
          eventoID: presenca.eventoID,
          registros: [],
        })
      }

      grupos.get(chave).registros.push(presenca)
    })

    return Array.from(grupos.values())
      .map((grupo) => ({
        ...grupo,
        registros: grupo.registros
          .slice()
          .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora)),
      }))
      .sort((a, b) => {
        const dataA = a.registros[0]?.dataHora ? new Date(a.registros[0].dataHora) : 0
        const dataB = b.registros[0]?.dataHora ? new Date(b.registros[0].dataHora) : 0
        return dataB - dataA
      })
  }, [presencas])

  const presencasFiltradas = useMemo(() => {
    if (!eventSearchTerm.trim()) {
      return presencasAgrupadas
    }

    const normalized = eventSearchTerm.trim().toLowerCase()

    return presencasAgrupadas.filter((grupo) => {
      const nome = (grupo.nomeEvento || '').toLowerCase()
      const id = (grupo.eventoID || '').toLowerCase()

      if (nome.includes(normalized) || id.includes(normalized)) {
        return true
      }

      return grupo.registros.some((registro) => {
        const registroEvento = (registro.nomeEvento || registro.eventoID || '').toLowerCase()
        return registroEvento.includes(normalized)
      })
    })
  }, [presencasAgrupadas, eventSearchTerm])

  const primeiraPresenca = presencas.length > 0 ? presencas[presencas.length - 1] : null
  const ultimaPresenca = presencas.length > 0 ? presencas[0] : null

  return (
    <>
      <div className="page-with-vanta" ref={vantaRef}>
        <div className="page-with-vanta__content px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
            <section className="glass-panel p-6 sm:p-10 space-y-8">
              <header className="admin-hero">
                <div className="space-y-3">
                  <span className="chip">Painel administrativo</span>
                  <div>
                    <h1 className="text-3xl font-semibold sm:text-4xl">Gerencie alunos cadastrados</h1>
                    <p className="section-subtitle max-w-2xl">
                      Consulte rapidamente os dados de registro e o histórico de presença de cada participante do sistema.
                    </p>
                  </div>
                </div>
                <div className="admin-hero__stats">
                  <article className="admin-stat-card">
                    <span className="admin-stat-card__label">Total de alunos</span>
                    <strong className="admin-stat-card__value">{users.length}</strong>
                  </article>
                  <article className="admin-stat-card">
                    <span className="admin-stat-card__label">Alunos com DID</span>
                    <strong className="admin-stat-card__value">{totalUsuariosComDid}</strong>
                  </article>
                  <article className="admin-stat-card">
                    <span className="admin-stat-card__label">Cursos cadastrados</span>
                    <strong className="admin-stat-card__value">{totalCursosCadastrados}</strong>
                  </article>
                </div>
              </header>

              <div className="admin-toolbar">
                <div className="input-with-icon">
                  <label className="sr-only" htmlFor="admin-search">
                    Buscar aluno por nome, matrícula ou curso
                  </label>
                  <span className="input-with-icon__icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="11" cy="11" r="7" />
                      <line x1="16.65" y1="16.65" x2="21" y2="21" />
                    </svg>
                  </span>
                  <input
                    id="admin-search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Busque por nome, matrícula ou curso"
                    type="search"
                    autoComplete="off"
                  />
                </div>
                <div className="admin-toolbar__meta">
                  <span className="stat-badge">{users.length} cadastrados</span>
                  <span className="stat-badge">{totalUsuariosComDid} com DID</span>
                  <span className="stat-badge">{totalCursosCadastrados} cursos</span>
                </div>
              </div>

              <div className="glass-panel glass-panel--subtle p-0">
                {loadingUsers ? (
                  <div className="p-6 text-sm text-slate-200">Carregando usuários...</div>
                ) : usersError ? (
                  <div className="p-6 text-sm text-red-300">{usersError}</div>
                ) : users.length === 0 ? (
                  <div className="p-6 text-sm text-slate-200">Nenhum usuário cadastrado até o momento.</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="admin-empty-state">
                    <h3>Nenhum resultado encontrado</h3>
                    <p>Tente ajustar os termos da busca para localizar o aluno desejado.</p>
                  </div>
                ) : (
                  <>
                    <div className="data-table overflow-x-auto">
                      <table>
                        <thead>
                          <tr>
                            <th className="admin-users-table__photo">Foto</th>
                            <th>Nome</th>
                            <th>Matrícula</th>
                            <th>Curso</th>
                            <th>DID</th>
                            <th>Data de registro</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((user) => (
                            <tr key={user.id || user.did}>
                              <td className="admin-users-table__photo-cell">
                                <div
                                  className={`admin-user-avatar admin-user-avatar--table ${
                                    user.profilePhoto ? 'is-clickable' : ''
                                  }`}
                                  role={user.profilePhoto ? 'button' : undefined}
                                  tabIndex={user.profilePhoto ? 0 : -1}
                                  onClick={() =>
                                    user.profilePhoto &&
                                    abrirFoto(
                                      user.profilePhoto,
                                      `Foto de ${user.userName || user.matricula || 'usuário'} ampliada`
                                    )
                                  }
                                  onKeyDown={(event) =>
                                    user.profilePhoto &&
                                    handleAvatarKeyDown(event, () =>
                                      abrirFoto(
                                        user.profilePhoto,
                                        `Foto de ${user.userName || user.matricula || 'usuário'} ampliada`
                                      )
                                    )
                                  }
                                >
                                  {user.profilePhoto ? (
                                    <img
                                      src={user.profilePhoto}
                                      alt={`Foto de ${user.userName || user.matricula || 'usuário'}`}
                                    />
                                  ) : (
                                    <span>{getUserInitials(user)}</span>
                                  )}
                                </div>
                              </td>
                              <td className="font-medium">{user.userName || '—'}</td>
                              <td>{user.matricula || '—'}</td>
                              <td>{user.curso || '—'}</td>
                              <td>
                                {user.did ? <span className="badge badge--success">Registrado</span> : <span className="badge">Não informado</span>}
                              </td>
                              <td>{formatDateOnly(user.createdAt)}</td>
                              <td>
                                <button className="btn-secondary" type="button" onClick={() => abrirHistorico(user)}>
                                  Ver histórico
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="admin-user-cards">
                      {filteredUsers.map((user) => (
                        <article className="admin-user-card" key={(user.id || user.did) ?? user.matricula}>
                          <header className="admin-user-card__header">
                            <div className="admin-user-card__photo">
                              <div
                                className={`admin-user-avatar admin-user-avatar--card ${
                                  user.profilePhoto ? 'is-clickable' : ''
                                }`}
                                role={user.profilePhoto ? 'button' : undefined}
                                tabIndex={user.profilePhoto ? 0 : -1}
                                onClick={() =>
                                  user.profilePhoto &&
                                  abrirFoto(
                                    user.profilePhoto,
                                    `Foto de ${user.userName || user.matricula || 'usuário'} ampliada`
                                  )
                                }
                                onKeyDown={(event) =>
                                  user.profilePhoto &&
                                  handleAvatarKeyDown(event, () =>
                                    abrirFoto(
                                      user.profilePhoto,
                                      `Foto de ${user.userName || user.matricula || 'usuário'} ampliada`
                                    )
                                  )
                                }
                              >
                                {user.profilePhoto ? (
                                  <img
                                    src={user.profilePhoto}
                                    alt={`Foto de ${user.userName || user.matricula || 'usuário'}`}
                                  />
                                ) : (
                                  <span>{getUserInitials(user)}</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <h3>{user.userName || 'Nome não informado'}</h3>
                              <p>{user.curso || 'Curso não informado'}</p>
                            </div>
                          </header>
                          <dl>
                            <div>
                              <dt>Matrícula</dt>
                              <dd>{user.matricula || '—'}</dd>
                            </div>
                            <div>
                              <dt>DID</dt>
                              <dd>{user.did ? <span className="badge badge--success">Registrado</span> : 'Não informado'}</dd>
                            </div>
                            <div>
                              <dt>Cadastro</dt>
                              <dd>{formatDateOnly(user.createdAt)}</dd>
                            </div>
                          </dl>
                          <footer>
                            <button className="btn-secondary" type="button" onClick={() => abrirHistorico(user)}>
                              Ver histórico
                            </button>
                          </footer>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {selectedUser && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-surface history-modal max-w-3xl">
            <header className="history-modal__header">
              <div className="history-modal__title-group">
                <span className="history-modal__eyebrow">Histórico do aluno</span>
                <h2 className="modal-title history-modal__title">{selectedUser.userName || selectedUser.matricula}</h2>
                <div className="history-modal__meta">
                  <span className="history-modal__chip">
                    Matrícula
                    <strong>{selectedUser.matricula || '—'}</strong>
                  </span>
                  {selectedUser.did ? (
                    <span className="history-modal__chip history-modal__chip--accent">
                      DID
                      <code>{selectedUser.did}</code>
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                className="history-modal__close"
                onClick={fecharModal}
                type="button"
                aria-label="Fechar histórico"
              >
                <span aria-hidden="true">×</span>
                <span className="sr-only">Fechar</span>
              </button>
            </header>

            <section className="history-modal__summary summary-grid">
              <article className="glass-panel glass-panel--subtle summary-card">
                <span className="summary-card__label">Total de presenças</span>
                <span className="summary-card__value">{presencas.length}</span>
              </article>
              <article className="glass-panel glass-panel--subtle summary-card">
                <span className="summary-card__label">Primeiro registro</span>
                <span className="summary-card__value text-base">
                  {primeiraPresenca ? formatDateTime(primeiraPresenca.dataHora) : '—'}
                </span>
              </article>
              <article className="glass-panel glass-panel--subtle summary-card">
                <span className="summary-card__label">Último registro</span>
                <span className="summary-card__value text-base">
                  {ultimaPresenca ? formatDateTime(ultimaPresenca.dataHora) : '—'}
                </span>
              </article>
            </section>

            <div className="history-modal__body">
              {loadingPresencas ? (
                <div className="history-modal__status">Carregando presenças...</div>
              ) : presencasError ? (
                <div className="history-modal__status history-modal__status--error">{presencasError}</div>
              ) : presencas.length === 0 ? (
                <div className="history-modal__status history-modal__status--empty">
                  Nenhuma presença encontrada para este usuário.
                </div>
              ) : (
                <>
                  <div className="history-modal__search">
                    <label className="history-modal__search-label" htmlFor="history-event-search">
                      Pesquise eventos pelo nome
                    </label>
                    <div className="input-with-icon">
                      <span className="input-with-icon__icon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <circle cx="11" cy="11" r="7" />
                          <line x1="16.65" y1="16.65" x2="21" y2="21" />
                        </svg>
                      </span>
                      <input
                        id="history-event-search"
                        type="search"
                        placeholder="Digite o nome do evento"
                        value={eventSearchTerm}
                        onChange={(event) => setEventSearchTerm(event.target.value)}
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  {presencasFiltradas.length === 0 ? (
                    <div className="history-modal__status history-modal__status--empty">
                      Nenhum evento encontrado para “{eventSearchTerm}”.
                    </div>
                  ) : (
                    <div className="admin-events history-modal__events">
                      {presencasFiltradas.map((grupo) => (
                        <section className="event-group" key={grupo.eventoID || grupo.nomeEvento}>
                          <header className="event-group__header">
                            <div>
                              <h3>{grupo.nomeEvento}</h3>
                              <p>
                                {grupo.registros.length} presença{grupo.registros.length > 1 ? 's' : ''} • Última em{' '}
                                {grupo.registros[0]?.dataHora ? formatDateTime(grupo.registros[0].dataHora) : '—'}
                              </p>
                            </div>
                          </header>

                          <ol className="event-group__list">
                            {grupo.registros.map((presenca) => (
                              <li
                                className="event-group__item"
                                key={presenca.id || presenca.hash || `${presenca.eventoID}-${presenca.dataHora}`}
                              >
                                <div className="event-group__marker" aria-hidden="true" />
                                <div className="event-group__content">
                                  <span className="event-group__title">{grupo.nomeEvento}</span>
                                  <span className="event-group__meta">{formatDateTime(presenca.dataHora)}</span>
                                  <span className="event-group__hash" title={presenca.hash || 'Hash não informado'}>
                                    {presenca.hash || 'Hash não informado'}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ol>
                        </section>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <PhotoModal
        isOpen={photoPreview.isOpen}
        src={photoPreview.src}
        alt={photoPreview.alt}
        onClose={fecharFoto}
      />
    </>
  )
}
