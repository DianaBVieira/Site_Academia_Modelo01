import { useEffect, useState } from 'react'
import { Building2, RefreshCw } from 'lucide-react'
import { listAcademies, listStudents, updateAcademyStatus } from './database'
import type { AcademyRecord } from './types'

export default function OwnerWorkspace() {
  const [academies, setAcademies] = useState<AcademyRecord[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const items = await listAcademies()
      setAcademies(items)
      const entries = await Promise.all(items.map(async academy => {
        try { return [academy.id, (await listStudents(academy.id)).length] as const }
        catch { return [academy.id, 0] as const }
      }))
      setCounts(Object.fromEntries(entries))
    } catch {
      setError('Não foi possível carregar as academias agora.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function toggleActive(academy: AcademyRecord) {
    await updateAcademyStatus(academy.id, !academy.active)
    setAcademies(current => current.map(item => item.id === academy.id ? { ...item, active: !academy.active } : item))
  }

  return <main className="page admin-workspace">
    <div className="page-heading">
      <div>
        <p className="eyebrow">Painel do dono</p>
        <h1>Academias na plataforma</h1>
        <p className="muted">Novas academias são criadas pelo script de provisionamento. Aqui você acompanha e ativa ou desativa o acesso de cada uma.</p>
      </div>
      <button className="secondary" onClick={load}><RefreshCw size={17} /> Atualizar</button>
    </div>
    {loading && <div className="library-state"><RefreshCw className="spin" /> Carregando academias...</div>}
    {error && <div className="library-state error">{error}<button className="secondary" onClick={load}>Tentar novamente</button></div>}
    {!loading && !error && <section className="students-table">
      <div className="table-head">
        <span>Academia</span>
        <span>Contato</span>
        <span>Alunos</span>
        <span>Situação</span>
        <span />
      </div>
      {academies.map(academy => <div className="table-row" key={academy.id}>
        <div className="student-cell">
          <span className="avatar"><Building2 size={18} /></span>
          <div><strong>{academy.name}</strong><small>{academy.slug}</small></div>
        </div>
        <span>{academy.contactEmail || academy.phone || '—'}</span>
        <span>{counts[academy.id] ?? '—'}</span>
        <span className={`status status-${academy.active ? 'ativo' : 'vencido'}`}>{academy.active ? 'Ativa' : 'Inativa'}</span>
        <button className="secondary" onClick={() => toggleActive(academy)}>{academy.active ? 'Desativar' : 'Ativar'}</button>
      </div>)}
      {academies.length === 0 && <p className="muted">Nenhuma academia cadastrada ainda. Use o script scripts/create-academy.mjs para criar a primeira.</p>}
    </section>}
  </main>
}
