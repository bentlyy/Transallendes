import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTrips, createTrip, updateTripStatus, deleteTrip, type Trip } from '@/api/trips'
import { getTrucks, type Truck } from '@/api/trucks'
import { getDrivers, type Driver } from '@/api/drivers'
import { getClients, type Client } from '@/api/clients'
import DataTable, { type Column } from '@/components/DataTable'
import StatusBadge from '@/components/StatusBadge'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import { usePagination } from '@/hooks/usePagination'
import { formatDate, formatCurrency, formatDistance } from '@/utils/formatters'
import { TRIP_STATUS } from '@/utils/constants'
import { motion } from 'framer-motion'

const STATUS_FILTERS = ['', 'planned', 'assigned', 'in_progress', 'completed', 'cancelled', 'delayed']

export default function TripListPage() {
  const navigate = useNavigate()
  const [trips, setTrips] = useState<Trip[]>([])
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Trip>>({ origin: '', destination: '', scheduledDate: new Date().toISOString().split('T')[0] })
  const pag = usePagination()

  async function fetch() {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(pag.page), limit: String(pag.pageSize) }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      const res = await getTrips(params)
      setTrips(res.data)
      pag.setTotal(res.total)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [pag.page, pag.pageSize, search, statusFilter])

  useEffect(() => {
    Promise.all([
      getTrucks({ limit: '100' }).then((r) => setTrucks(r.data)).catch(() => {}),
      getDrivers({ limit: '100' }).then((r) => setDrivers(r.data)).catch(() => {}),
      getClients({ limit: '100' }).then((r) => setClients(r.data)).catch(() => {}),
    ])
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await createTrip(form)
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
      await deleteTrip(deleteId)
      setDeleteId(null)
      await fetch()
    } catch {
      // ignore
    }
  }

  const columns: Column<Trip>[] = [
    { key: 'code', header: 'Código', sortable: true },
    { key: 'origin', header: 'Origen', sortable: true },
    { key: 'destination', header: 'Destino', sortable: true },
    { key: 'status', header: 'Estado', render: (t) => <StatusBadge status={t.status} type="trip" /> },
    { key: 'truckPlate', header: 'Camión', sortable: true },
    { key: 'driverName', header: 'Conductor', sortable: true },
    { key: 'clientName', header: 'Cliente', sortable: true },
    { key: 'scheduledDate', header: 'Fecha', render: (t) => formatDate(t.scheduledDate) },
    { key: 'cost', header: 'Costo', render: (t) => formatCurrency(t.cost) },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Viajes</h2>
        <button className="btn btn-primary" onClick={() => { setForm({ origin: '', destination: '', scheduledDate: new Date().toISOString().split('T')[0] }); setModalOpen(true) }}>+ Nuevo viaje</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((s) => (
          <button key={s} className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setStatusFilter(s); pag.setPage(1) }} style={{ fontSize: 12, padding: '4px 10px' }}>
            {s ? ({ planned: 'Planificado', assigned: 'Asignado', in_progress: 'En ruta', completed: 'Completado', cancelled: 'Cancelado', delayed: 'Retrasado' }[s] || s) : 'Todos'}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={trips}
        keyExtractor={(t) => t.id}
        loading={loading}
        searchable
        searchValue={search}
        onSearch={setSearch}
        onRowClick={(t) => navigate(`/admin/trips/${t.id}`)}
        pagination={{ ...pag, onPageChange: pag.setPage, onPageSizeChange: pag.setPageSize }}
        actions={(t) => (
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); setDeleteId(t.id) }}>🗑️</button>
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo viaje" size="medium">
        <form onSubmit={handleCreate}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Origen</label>
              <input className="input" value={form.origin || ''} onChange={(e) => setForm({ ...form, origin: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Destino</label>
              <input className="input" value={form.destination || ''} onChange={(e) => setForm({ ...form, destination: e.target.value })} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fecha programada</label>
              <input className="input" type="date" value={form.scheduledDate?.split('T')[0] || ''} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Camión</label>
              <select className="input" value={form.truckId || ''} onChange={(e) => setForm({ ...form, truckId: e.target.value || undefined })}>
                <option value="">Seleccionar</option>
                {trucks.map((t) => <option key={t.id} value={t.id}>{t.plate}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Conductor</label>
              <select className="input" value={form.driverId || ''} onChange={(e) => setForm({ ...form, driverId: e.target.value || undefined })}>
                <option value="">Seleccionar</option>
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cliente</label>
              <select className="input" value={form.clientId || ''} onChange={(e) => setForm({ ...form, clientId: e.target.value || undefined })}>
                <option value="">Seleccionar</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creando...' : 'Crear viaje'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Eliminar viaje" message="¿Estás seguro de eliminar este viaje?" confirmLabel="Eliminar" />
    </motion.div>
  )
}
