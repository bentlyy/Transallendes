import { useState, useEffect, type FormEvent } from 'react'
import { getMaintenance, createMaintenance, updateMaintenance, deleteMaintenance, getUpcomingMaintenance, type Maintenance } from '@/api/maintenance'
import { getTrucks, type Truck } from '@/api/trucks'
import DataTable, { type Column } from '@/components/DataTable'
import StatusBadge from '@/components/StatusBadge'
import StatCard from '@/components/StatCard'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import { usePagination } from '@/hooks/usePagination'
import { formatDate, formatCurrency } from '@/utils/formatters'
import { motion } from 'framer-motion'

export default function MaintenancePage() {
  const [items, setItems] = useState<Maintenance[]>([])
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [upcoming, setUpcoming] = useState<Maintenance[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<Maintenance | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Maintenance>>({ truckId: '', type: 'preventive', description: '', scheduledDate: new Date().toISOString().split('T')[0], mileage: 0 })
  const pag = usePagination()

  async function fetch() {
    setLoading(true)
    try {
      const [res, up] = await Promise.all([
        getMaintenance({ page: String(pag.page), limit: String(pag.pageSize), search }),
        getUpcomingMaintenance().catch(() => []),
      ])
      setItems(res.data)
      pag.setTotal(res.total)
      setUpcoming(up)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [pag.page, pag.pageSize, search])
  useEffect(() => { getTrucks({ limit: '100' }).then((r) => setTrucks(r.data)).catch(() => {}) }, [])

  function openCreate() {
    setEditItem(null)
    setForm({ truckId: '', type: 'preventive', description: '', scheduledDate: new Date().toISOString().split('T')[0], mileage: 0 })
    setModalOpen(true)
  }

  function openEdit(m: Maintenance) {
    setEditItem(m)
    setForm({ truckId: m.truckId, type: m.type, description: m.description, scheduledDate: m.scheduledDate.split('T')[0], mileage: m.mileage, notes: m.notes, cost: m.cost })
    setModalOpen(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editItem) {
        await updateMaintenance(editItem.id, form)
      } else {
        await createMaintenance(form)
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
      await deleteMaintenance(deleteId)
      setDeleteId(null)
      await fetch()
    } catch {
      // ignore
    }
  }

  const columns: Column<Maintenance>[] = [
    { key: 'truckPlate', header: 'Camión', sortable: true },
    { key: 'type', header: 'Tipo', sortable: true, render: (m) => ({
      preventive: 'Preventivo',
      corrective: 'Correctivo',
      predictive: 'Predictivo',
      inspection: 'Inspección',
      tire_change: 'Cambio de neumáticos',
      oil_change: 'Cambio de aceite',
      other: 'Otro',
    }[m.type] || m.type) },
    { key: 'description', header: 'Descripción' },
    { key: 'status', header: 'Estado', render: (m) => <StatusBadge status={m.status} type="maintenance" /> },
    { key: 'scheduledDate', header: 'Programado', render: (m) => {
      const date = new Date(m.scheduledDate)
      const color = m.status === 'overdue' ? 'var(--danger)' : date < new Date() && m.status !== 'completed' ? 'var(--warning)' : 'inherit'
      return <span style={{ color, fontWeight: color !== 'inherit' ? 600 : 400 }}>{formatDate(m.scheduledDate)}</span>
    }},
    { key: 'cost', header: 'Costo', render: (m) => formatCurrency(m.cost) },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Mantenimiento</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Programar mantenimiento</button>
      </div>

      {upcoming.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--warning)' }}>Próximos mantenimientos</h4>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {upcoming.slice(0, 5).map((m) => (
              <div key={m.id} style={{ fontSize: 13 }}>
                <strong>{m.truckPlate}</strong> — {formatDate(m.scheduledDate)}
              </div>
            ))}
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={items}
        keyExtractor={(m) => m.id}
        loading={loading}
        searchable
        searchValue={search}
        onSearch={setSearch}
        pagination={{ ...pag, onPageChange: pag.setPage, onPageSizeChange: pag.setPageSize }}
        actions={(m) => (
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); openEdit(m) }}>✏️</button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); setDeleteId(m.id) }}>🗑️</button>
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Editar mantenimiento' : 'Nuevo mantenimiento'} size="medium">
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Camión</label>
            <select className="input" value={form.truckId || ''} onChange={(e) => setForm({ ...form, truckId: e.target.value })} required>
              <option value="">Seleccionar</option>
              {trucks.map((t) => <option key={t.id} value={t.id}>{t.plate}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="preventive">Preventivo</option>
                <option value="corrective">Correctivo</option>
                <option value="predictive">Predictivo</option>
                <option value="inspection">Inspección</option>
                <option value="tire_change">Cambio de neumáticos</option>
                <option value="oil_change">Cambio de aceite</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha programada</label>
              <input className="input" type="date" value={form.scheduledDate?.split('T')[0] || ''} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="input" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Kilometraje</label>
              <input className="input" type="number" value={form.mileage ?? ''} onChange={(e) => setForm({ ...form, mileage: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-label">Costo estimado</label>
              <input className="input" type="number" value={form.cost ?? ''} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea className="input" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Eliminar mantenimiento" message="¿Estás seguro de eliminar este registro?" confirmLabel="Eliminar" />
    </motion.div>
  )
}
