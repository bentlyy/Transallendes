import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTenant, type Tenant } from '@/api/super-admin'
import StatusBadge from '@/components/StatusBadge'
import LoadingSpinner from '@/components/LoadingSpinner'
import DataTable, { type Column } from '@/components/DataTable'
import { formatDate } from '@/utils/formatters'
import { motion } from 'framer-motion'

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tenant, setTenant] = useState<(Tenant & { users: Record<string, unknown>[] }) | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const tenantId = id
    async function fetch() {
      try {
        const t = await getTenant(tenantId)
        setTenant(t)
      } catch {
        navigate('/super-admin/tenants')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id, navigate])

  if (loading || !tenant) return <LoadingSpinner fullPage text="Cargando..." />

  const userCols: Column<Record<string, unknown>>[] = [
    { key: 'name', header: 'Nombre' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Rol' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/super-admin/tenants')} style={{ fontSize: 18 }}>←</button>
        <h2 style={{ margin: 0, fontSize: 20 }}>{tenant.name}</h2>
        <StatusBadge status={tenant.status} type="truck" />
      </div>

      <div className="grid-2">
        <div className="card">
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>Información</h4>
          <div className="info-row"><span>Slug</span><span>{tenant.slug}</span></div>
          <div className="info-row"><span>Dominio</span><span>{tenant.domain || '—'}</span></div>
          <div className="info-row"><span>Creado</span><span>{formatDate(tenant.createdAt)}</span></div>
        </div>
      </div>

      <div className="card">
        <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>Usuarios ({tenant.users?.length || 0})</h4>
        <DataTable columns={userCols} data={tenant.users || []} keyExtractor={(u: Record<string, unknown>) => String(u.id)} />
      </div>
    </motion.div>
  )
}
