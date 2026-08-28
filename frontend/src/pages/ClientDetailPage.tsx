import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getClient, getClientTrips, getClientTrucks, getClientStats, type Client, type ClientStats } from '@/api/clients'
import StatusBadge from '@/components/StatusBadge'
import StatCard from '@/components/StatCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import DataTable, { type Column } from '@/components/DataTable'
import { formatPhone } from '@/utils/formatters'
import { motion } from 'framer-motion'

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [trips, setTrips] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const clientId = id
    async function fetch() {
      try {
        const [c, s, t] = await Promise.all([
          getClient(clientId),
          getClientStats(clientId).catch(() => null),
          getClientTrips(clientId, { limit: '10' }).catch(() => ({ data: [] })),
        ])
        setClient(c)
        setStats(s)
        setTrips(t.data)
      } catch {
        navigate('/admin/clients')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id, navigate])

  if (loading || !client) return <LoadingSpinner fullPage text="Cargando cliente..." />

  const tripCols: Column<Record<string, unknown>>[] = [
    { key: 'tripNumber', header: 'Código' },
    { key: 'originCity', header: 'Origen' },
    { key: 'destinationCity', header: 'Destino' },
    { key: 'status', header: 'Estado', render: (t: Record<string, unknown>) => <StatusBadge status={String(t.status || '')} type="trip" /> },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/admin/clients')} style={{ fontSize: 18 }}>←</button>
        <h2 style={{ margin: 0, fontSize: 20 }}>{client.name}</h2>
        <StatusBadge status={client.status} type="truck" />
      </div>

      <div className="card">
        <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>Información</h4>
        <div className="info-row"><span>Contacto</span><span>{client.contactName || '—'}</span></div>
        <div className="info-row"><span>Email</span><span>{client.email}</span></div>
        <div className="info-row"><span>Teléfono</span><span>{formatPhone(client.phone)}</span></div>
        <div className="info-row"><span>Dirección</span><span>{[client.address, client.city, client.country].filter(Boolean).join(', ') || '—'}</span></div>
      </div>

      {stats && (
        <div className="grid-4">
          <StatCard icon="🛣️" label="Viajes totales" value={stats.totalTrips} />
          <StatCard icon="🚛" label="Camiones activos" value={stats.activeTrucks} />
          <StatCard icon="💰" label="Ingresos totales" value={`$${stats.totalRevenue.toLocaleString()}`} color="#22c55e" />
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>Últimos viajes</h4>
          <DataTable columns={tripCols} data={trips} keyExtractor={(t: Record<string, unknown>) => String(t.id)} />
        </div>
      </div>
    </motion.div>
  )
}
