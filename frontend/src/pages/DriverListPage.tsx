import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDrivers, createDriver, updateDriver, deleteDriver, type Driver } from '@/api/drivers'
import DataTable, { type Column } from '@/components/DataTable'
import StatusBadge from '@/components/StatusBadge'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import { usePagination } from '@/hooks/usePagination'
import { formatDate, formatPhone } from '@/utils/formatters'
import { motion } from 'framer-motion'

export default function DriverListPage() {
  const navigate = useNavigate()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<Driver | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Driver>>({ name: '', email: '', phone: '', licenseNumber: '', licenseType: '' })
  const pag = usePagination()

  async function fetch() {
    setLoading(true)
    try {
      const res = await getDrivers({ page: String(pag.page), limit: String(pag.pageSize), search })
      setDrivers(res.data)
      pag.setTotal(res.total)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [pag.page, pag.pageSize, search])

  function openCreate() {
    setEditItem(null)
    setForm({ name: '', email: '', phone: '', licenseNumber: '', licenseType: 'B' })
    setModalOpen(true)
  }

  function openEdit(d: Driver) {
    setEditItem(d)
    setForm({ name: d.name, email: d.email, phone: d.phone, licenseNumber: d.licenseNumber, licenseType: d.licenseType })
    setModalOpen(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editItem) {
        await updateDriver(editItem.id, form)
      } else {
        await createDriver(form)
      }
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
      await deleteDriver(deleteId)
      setDeleteId(null)
      await fetch()
    } catch {
      // ignore
    }
  }

  const columns: Column<Driver>[] = [
    { key: 'name', header: 'Nombre', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'phone', header: 'Teléfono', render: (d) => formatPhone(d.phone) },
    { key: 'licenseNumber', header: 'Licencia', sortable: true },
    { key: 'licenseType', header: 'Tipo', sortable: true },
    { key: 'licenseExpiry', header: 'Vencimiento licencia', render: (d) => {
      const expiry = new Date(d.licenseExpiry)
      const color = expiry < new Date() ? 'var(--danger)' : expiry < new Date(Date.now() + 30 * 86400000) ? 'var(--warning)' : 'inherit'
      return <span style={{ color }}>{formatDate(d.licenseExpiry)}</span>
    }},
    { key: 'status', header: 'Estado', render: (d) => <StatusBadge status={d.status} type="truck" /> },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Conductores</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo conductor</button>
      </div>

      <DataTable
        columns={columns}
        data={drivers}
        keyExtractor={(d) => d.id}
        loading={loading}
        searchable
        searchValue={search}
        onSearch={setSearch}
        onRowClick={(d) => navigate(`/admin/drivers/${d.id}`)}
        pagination={{ ...pag, onPageChange: pag.setPage, onPageSizeChange: pag.setPageSize }}
        actions={(d) => (
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); openEdit(d) }}>✏️</button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); setDeleteId(d.id) }}>🗑️</button>
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Editar conductor' : 'Nuevo conductor'} size="medium">
        <form onSubmit={handleSave}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="input" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="input" type="tel" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de licencia</label>
              <select className="input" value={form.licenseType || 'B'} onChange={(e) => setForm({ ...form, licenseType: e.target.value })}>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="C+E">C+E</option>
                <option value="D">D</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Número de licencia</label>
            <input className="input" value={form.licenseNumber || ''} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} required />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Eliminar conductor" message="¿Estás seguro de eliminar este conductor?" confirmLabel="Eliminar" />
    </motion.div>
  )
}
