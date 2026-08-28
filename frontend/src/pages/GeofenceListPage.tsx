import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getGeofences, createGeofence, updateGeofence, deleteGeofence, type Geofence } from '@/api/geofences'
import DataTable, { type Column } from '@/components/DataTable'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import MapView from '@/components/MapView'
import { usePagination } from '@/hooks/usePagination'
import { motion } from 'framer-motion'
import { MapContainer, TileLayer, Circle, Polygon } from 'react-leaflet'

export default function GeofenceListPage() {
  const navigate = useNavigate()
  const [geofences, setGeofences] = useState<Geofence[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<Geofence | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Geofence>>({ name: '', type: 'circle', lat: 40.4168, lng: -3.7038, radius: 1000, color: '#3b82f6', enabled: true })
  const pag = usePagination()

  async function fetch() {
    setLoading(true)
    try {
      const res = await getGeofences({ page: String(pag.page), limit: String(pag.pageSize), search })
      setGeofences(res.data)
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
    setForm({ name: '', type: 'circle', lat: 40.4168, lng: -3.7038, radius: 1000, color: '#3b82f6', enabled: true })
    setModalOpen(true)
  }

  function openEdit(g: Geofence) {
    setEditItem(g)
    setForm({ name: g.name, type: g.type, lat: g.lat, lng: g.lng, radius: g.radius, color: g.color, enabled: g.enabled })
    setModalOpen(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editItem) {
        await updateGeofence(editItem.id, form)
      } else {
        await createGeofence(form)
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
      await deleteGeofence(deleteId)
      setDeleteId(null)
      await fetch()
    } catch {
      // ignore
    }
  }

  const geofenceTypeLabels: Record<string, string> = {
    circle: 'Círculo',
    polygon: 'Polígono',
    corridor: 'Corredor',
  }

  const columns: Column<Geofence>[] = [
    { key: 'name', header: 'Nombre', sortable: true },
    { key: 'type', header: 'Tipo', sortable: true, render: (g) => geofenceTypeLabels[g.type] || g.type },
    { key: 'radius', header: 'Radio (m)', render: (g) => g.radius ? `${g.radius}m` : '—' },
    { key: 'enabled', header: 'Activa', render: (g) => g.enabled ? '✅' : '❌' },
  ]

  const mapGeofences = geofences.map((g) => ({
    id: g.id,
    name: g.name,
    type: g.type,
    lat: g.lat,
    lng: g.lng,
    radius: g.radius,
    color: g.color,
  }))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Geocercas</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Nueva geocerca</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <MapView geofences={mapGeofences} height={350} />
      </div>

      <DataTable
        columns={columns}
        data={geofences}
        keyExtractor={(g) => g.id}
        loading={loading}
        searchable
        searchValue={search}
        onSearch={setSearch}
        pagination={{ ...pag, onPageChange: pag.setPage, onPageSizeChange: pag.setPageSize }}
        actions={(g) => (
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); openEdit(g) }}>✏️</button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); setDeleteId(g.id) }}>🗑️</button>
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Editar geocerca' : 'Nueva geocerca'} size="medium">
        <form onSubmit={handleSave}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'circle' | 'polygon' })}>
                <option value="circle">Círculo</option>
                <option value="polygon">Polígono</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Latitud</label>
              <input className="input" type="number" step="any" value={form.lat || ''} onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Longitud</label>
              <input className="input" type="number" step="any" value={form.lng || ''} onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })} required />
            </div>
          </div>
          {form.type === 'circle' && (
            <div className="form-group">
              <label className="form-label">Radio (metros)</label>
              <input className="input" type="number" value={form.radius || ''} onChange={(e) => setForm({ ...form, radius: Number(e.target.value) })} />
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Color</label>
              <input className="input" type="color" value={form.color || '#3b82f6'} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.enabled ?? true} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
                Activa
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Eliminar geocerca" message="¿Estás seguro de eliminar esta geocerca?" confirmLabel="Eliminar" />
    </motion.div>
  )
}
