import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTrucks, createTruck, updateTruck, deleteTruck, type Truck } from '@/api/trucks'
import { getDrivers, type Driver } from '@/api/drivers'
import DataTable, { type Column } from '@/components/DataTable'
import StatusBadge from '@/components/StatusBadge'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import { usePagination } from '@/hooks/usePagination'
import { formatDate, formatNumber } from '@/utils/formatters'
import { motion } from 'framer-motion'

export default function TruckListPage() {
  const navigate = useNavigate()
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<Truck | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Truck>>({ plate: '', brand: '', model: '', year: new Date().getFullYear(), type: '' })
  const pag = usePagination()

  async function fetch() {
    setLoading(true)
    try {
      const res = await getTrucks({ page: String(pag.page), limit: String(pag.pageSize), search })
      setTrucks(res.data)
      pag.setTotal(res.total)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [pag.page, pag.pageSize, search])

  useEffect(() => {
    getDrivers({ limit: '100' }).then((r) => setDrivers(r.data)).catch(() => {})
  }, [])

  function openCreate() {
    setEditItem(null)
    setForm({ plate: '', brand: '', model: '', year: new Date().getFullYear(), type: '' })
    setModalOpen(true)
  }

  function openEdit(truck: Truck) {
    setEditItem(truck)
    setForm({ plate: truck.plate, brand: truck.brand, model: truck.model, year: truck.year, type: truck.type, driverId: truck.driverId, clientId: truck.clientId })
    setModalOpen(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editItem) {
        await updateTruck(editItem.id, form)
      } else {
        await createTruck(form)
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
      await deleteTruck(deleteId)
      setDeleteId(null)
      await fetch()
    } catch {
      // ignore
    }
  }

  const columns: Column<Truck>[] = [
    { key: 'plate', header: 'Matrícula', sortable: true },
    { key: 'brand', header: 'Marca', sortable: true },
    { key: 'model', header: 'Modelo', sortable: true },
    { key: 'year', header: 'Año', sortable: true },
    { key: 'status', header: 'Estado', render: (t) => <StatusBadge status={t.status} type="truck" /> },
    { key: 'driverName', header: 'Conductor', sortable: true },
    { key: 'fuelLevel', header: 'Combustible', render: (t) => t.fuelLevel != null ? `${formatNumber(t.fuelLevel)}%` : '—' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Camiones</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo camión</button>
      </div>

      <DataTable
        columns={columns}
        data={trucks}
        keyExtractor={(t) => t.id}
        loading={loading}
        searchable
        searchValue={search}
        onSearch={setSearch}
        onRowClick={(t) => navigate(`/admin/trucks/${t.id}`)}
        pagination={{ ...pag, onPageChange: pag.setPage, onPageSizeChange: pag.setPageSize }}
        actions={(t) => (
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} title="Ver en mapa" onClick={(e) => { e.stopPropagation(); navigate(`/admin/map?truckId=${t.id}`) }}>🗺️</button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); openEdit(t) }}>✏️</button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); setDeleteId(t.id) }}>🗑️</button>
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Editar camión' : 'Nuevo camión'} size="medium">
        <form onSubmit={handleSave}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Matrícula</label>
              <input className="input" value={form.plate || ''} onChange={(e) => setForm({ ...form, plate: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Marca</label>
              <input className="input" value={form.brand || ''} onChange={(e) => setForm({ ...form, brand: e.target.value })} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Modelo</label>
              <input className="input" value={form.model || ''} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Año</label>
              <input className="input" type="number" value={form.year || ''} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="input" value={form.type || ''} onChange={(e) => setForm({ ...form, type: e.target.value })} required>
                <option value="">Seleccionar</option>
                <option value="tractor">Tractor</option>
                <option value="camion">Camión</option>
                <option value="furgoneta">Furgoneta</option>
                <option value="plataforma">Plataforma</option>
                <option value="frigorifico">Frigorífico</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Conductor</label>
              <select className="input" value={form.driverId || ''} onChange={(e) => setForm({ ...form, driverId: e.target.value || undefined })}>
                <option value="">Sin conductor</option>
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar camión"
        message="¿Estás seguro de eliminar este camión? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
      />
    </motion.div>
  )
}
