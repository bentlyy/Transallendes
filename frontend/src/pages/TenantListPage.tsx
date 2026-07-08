import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTenants, createTenant, deleteTenant, getStats, type Tenant, type SuperAdminStats } from '@/api/super-admin'
import DataTable, { type Column } from '@/components/DataTable'
import StatusBadge from '@/components/StatusBadge'
import StatCard from '@/components/StatCard'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import { usePagination } from '@/hooks/usePagination'
import { formatDate } from '@/utils/formatters'
import { motion } from 'framer-motion'

export default function TenantListPage() {
  const navigate = useNavigate()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [stats, setStats] = useState<SuperAdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Tenant>>({ name: '', slug: '', domain: '' })
  const pag = usePagination()

  async function fetch() {
    setLoading(true)
    try {
      const [res, s] = await Promise.all([
        getTenants({ page: String(pag.page), limit: String(pag.pageSize), search }),
        getStats().catch(() => null),
      ])
      setTenants(res.data)
      pag.setTotal(res.total)
      if (s) setStats(s)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [pag.page, pag.pageSize, search])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await createTenant(form)
      setModalOpen(false)
      await fetch()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteTenant(deleteId)
      setDeleteId(null)
      await fetch()
    } catch {
      // ignore
    }
  }

  const columns: Column<Tenant>[] = [
    { key: 'name', header: 'Nombre', sortable: true },
    { key: 'slug', header: 'Slug', sortable: true },
    { key: 'domain', header: 'Dominio' },
    { key: 'status', header: 'Estado', render: (t) => <StatusBadge status={t.status} type="truck" /> },
    { key: 'createdAt', header: 'Creado', render: (t) => formatDate(t.createdAt) },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Inquilinos</h2>

      {stats && (
        <div className="grid-4">
          <StatCard icon="🏢" label="Total inquilinos" value={stats.totalTenants} />
          <StatCard icon="✅" label="Activos" value={stats.activeTenants} color="#22c55e" />
          <StatCard icon="👥" label="Usuarios" value={stats.totalUsers} />
          <StatCard icon="🚛" label="Camiones" value={stats.totalTrucks} />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={() => { setForm({ name: '', slug: '', domain: '' }); setModalOpen(true) }}>+ Nuevo inquilino</button>
      </div>

      <DataTable
        columns={columns}
        data={tenants}
        keyExtractor={(t) => t.id}
        loading={loading}
        searchable
        searchValue={search}
        onSearch={setSearch}
        onRowClick={(t) => navigate(`/super-admin/tenants/${t.id}`)}
        pagination={{ ...pag, onPageChange: pag.setPage, onPageSizeChange: pag.setPageSize }}
        actions={(t) => (
          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); setDeleteId(t.id) }}>🗑️</button>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo inquilino" size="small">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Slug</label>
            <input className="input" value={form.slug || ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} required placeholder="mi-empresa" />
          </div>
          <div className="form-group">
            <label className="form-label">Dominio (opcional)</label>
            <input className="input" value={form.domain || ''} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="miempresa.com" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creando...' : 'Crear'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Eliminar inquilino" message="¿Estás seguro? Se eliminarán todos los datos asociados." confirmLabel="Eliminar" />
    </motion.div>
  )
}
