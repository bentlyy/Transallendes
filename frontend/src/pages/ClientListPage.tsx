import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClients, createClient, updateClient, type Client } from '@/api/clients'
import DataTable, { type Column } from '@/components/DataTable'
import StatusBadge from '@/components/StatusBadge'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import { usePagination } from '@/hooks/usePagination'
import { formatPhone } from '@/utils/formatters'
import { motion } from 'framer-motion'

export default function ClientListPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<Client | null>(null)
  const [toggleItem, setToggleItem] = useState<Client | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState<Partial<Client>>({})
  const pag = usePagination()

  async function fetchClients() {
    setLoading(true)
    try {
      const res = await getClients({ page: '1', limit: '9999', search })
      const sorted = [...res.data].sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1
        if (a.status !== 'active' && b.status === 'active') return 1
        return (a.name || '').localeCompare(b.name || '', 'es')
      })
      pag.setTotal(sorted.length)
      setClients(sorted)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClients() }, [search])

  function openCreate() {
    setEditItem(null)
    setForm({ name: '', contactName: '', email: '', phone: '', address: '', city: '', country: '' })
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(c: Client) {
    setEditItem(c)
    setForm({
      name: c.name || '',
      contactName: c.contactName || '',
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
      city: c.city || '',
      country: c.country || '',
    })
    setFormError('')
    setModalOpen(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      if (editItem) {
        await updateClient(editItem.id, form)
      } else {
        await createClient(form)
      }
      setModalOpen(false)
      await fetchClients()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      setFormError(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStatus() {
    if (!toggleItem) return
    try {
      await updateClient(toggleItem.id, { status: toggleItem.status === 'active' ? 'inactive' : 'active' })
      setToggleItem(null)
      await fetchClients()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar estado'
      setFormError(msg)
    }
  }

  const columns: Column<Client>[] = [
    { key: 'name', header: 'Empresa', sortable: true },
    { key: 'contactName', header: 'Contacto', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'phone', header: 'Teléfono', render: (c) => formatPhone(c.phone) },
    { key: 'city', header: 'Ciudad', sortable: true },
    { key: 'country', header: 'País', sortable: true },
    { key: 'status', header: 'Estado', render: (c) => <StatusBadge status={c.status} type="truck" /> },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Clientes</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo cliente</button>
      </div>

      <DataTable
        columns={columns}
        data={clients}
        keyExtractor={(c) => c.id}
        loading={loading}
        searchable
        searchValue={search}
        onSearch={setSearch}
        onRowClick={(c) => navigate(`/admin/clients/${c.id}`)}
        pagination={{ ...pag, onPageChange: pag.setPage, onPageSizeChange: pag.setPageSize }}
        rowClassName={(c) => c.status !== 'active' ? 'row-inactive' : undefined}
        actions={(c) => (
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); openEdit(c) }}>✏️</button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, color: c.status === 'active' ? 'var(--warning)' : 'var(--success)' }} onClick={(e) => { e.stopPropagation(); setToggleItem(c) }} title={c.status === 'active' ? 'Desactivar' : 'Activar'}>
              {c.status === 'active' ? '🔒' : '🔓'}
            </button>
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Editar cliente' : 'Nuevo cliente'} size="medium">
        <form onSubmit={handleSave}>
          {formError && (
            <div style={{ padding: '10px 14px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {formError}
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Empresa *</label>
              <input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Contacto</label>
              <input className="input" value={form.contactName || ''} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="input" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono *</label>
              <input className="input" type="tel" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input className="input" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Ciudad</label>
              <input className="input" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">País</label>
              <input className="input" value={form.country || ''} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toggleItem}
        onClose={() => setToggleItem(null)}
        onConfirm={handleToggleStatus}
        title={toggleItem?.status === 'active' ? 'Desactivar cliente' : 'Activar cliente'}
        message={toggleItem?.status === 'active'
          ? `¿Estás seguro de desactivar "${toggleItem?.name}"? No podrá iniciar sesión ni aparecerá en las listas.`
          : `¿Estás seguro de activar "${toggleItem?.name}"?`
        }
        confirmLabel={toggleItem?.status === 'active' ? 'Desactivar' : 'Activar'}
      />
    </motion.div>
  )
}
