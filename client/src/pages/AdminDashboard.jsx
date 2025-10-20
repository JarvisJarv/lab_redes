import React, { useEffect, useState } from 'react'
import useVantaNet from '../hooks/useVantaNet'

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

export default function AdminDashboard() {
  const vantaRef = useVantaNet()
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [usersError, setUsersError] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [presencas, setPresencas] = useState([])
  const [loadingPresencas, setLoadingPresencas] = useState(false)
  const [presencasError, setPresencasError] = useState('')

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
  }

  return (
    <>
      <div className="page-with-vanta" ref={vantaRef}>
        <div className="page-with-vanta__content px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
            <section className="glass-panel p-6 sm:p-10 space-y-6">
              <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <span className="chip">Painel administrativo</span>
                  <div>
                    <h1 className="text-3xl font-semibold sm:text-4xl">Gerencie alunos cadastrados</h1>
                    <p className="section-subtitle max-w-2xl">
                      Consulte rapidamente os dados de registro e o histórico de presença de cada participante do sistema.
                    </p>
                  </div>
                </div>
                <div className="glass-panel glass-panel--subtle p-4 text-sm text-slate-200">
                  Total de alunos cadastrados: <strong>{users.length}</strong>
                </div>
              </header>

              <div className="glass-panel glass-panel--subtle p-0">
                {loadingUsers ? (
                  <div className="p-6 text-sm text-slate-200">Carregando usuários...</div>
                ) : usersError ? (
                  <div className="p-6 text-sm text-red-300">{usersError}</div>
                ) : users.length === 0 ? (
                  <div className="p-6 text-sm text-slate-200">Nenhum usuário cadastrado até o momento.</div>
                ) : (
                  <div className="data-table overflow-x-auto">
                    <table>
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Matrícula</th>
                          <th>Curso</th>
                          <th>Data de registro</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id || user.did}>
                            <td>{user.userName || '—'}</td>
                            <td>{user.matricula || '—'}</td>
                            <td>{user.curso || '—'}</td>
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
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {selectedUser && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-surface max-w-3xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="modal-title text-left">Histórico de {selectedUser.userName || selectedUser.matricula}</h2>
                <p className="section-subtitle text-left">
                  Matrícula: <span className="font-medium">{selectedUser.matricula || '—'}</span>
                  {selectedUser.did ? (
                    <>
                      {' '}- DID: <span className="font-mono text-xs text-slate-200">{selectedUser.did}</span>
                    </>
                  ) : null}
                </p>
              </div>
              <button className="btn-ghost" onClick={fecharModal} type="button">
                Fechar
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {loadingPresencas ? (
                <div className="text-sm text-slate-200">Carregando presenças...</div>
              ) : presencasError ? (
                <div className="text-sm text-red-300">{presencasError}</div>
              ) : presencas.length === 0 ? (
                <div className="text-sm text-slate-200">Nenhuma presença encontrada para este usuário.</div>
              ) : (
                <div className="glass-panel glass-panel--subtle p-0">
                  <div className="data-table overflow-x-auto">
                    <table>
                      <thead>
                        <tr>
                          <th>Evento</th>
                          <th>Data e hora</th>
                          <th>Hash</th>
                        </tr>
                      </thead>
                      <tbody>
                        {presencas.map((p) => (
                          <tr key={p.id}>
                            <td>{p.nomeEvento || p.eventoID || '—'}</td>
                            <td>{formatDateTime(p.dataHora)}</td>
                            <td className="break-words text-xs text-slate-200">{p.hash || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
