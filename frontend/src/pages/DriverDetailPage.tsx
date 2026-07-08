import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDriver, getDriverTrips, type Driver, type DriverTrip } from '@/api/drivers'
import StatusBadge from '@/components/StatusBadge'
import LoadingSpinner from '@/components/LoadingSpinner'
import DataTable, { type Column } from '@/components/DataTable'
import { formatDate, formatPhone, formatDistance } from '@/utils/formatters'
import { motion } from 'framer-motion'

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [trips, setTrips] = useState<DriverTrip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    async function fetch() {
      try {
        const [d, t] = await Promise.all([
          getDriver(id),
          getDriverTrips(id).catch(() => ({ data: [] })),
        ])
        setDriver(d)
        setTrips(t.data)
      } catch {
        navigate('/admin/drivers')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id, navigate])

  if (loading || !driver) return <LoadingSpinner fullPage text="Cargando conductor..." />

  const tripCols: Column<DriverTrip>[] = [
    { key: 'id', header: 'ID', render: (t) => t.id.slice(0, 8) },
    { key: 'truckPlate', header: 'Camión', sortable: true },
    { key: 'origin', header: 'Origen', sortable: true },
    { key: 'destination', header: 'Destino', sortable: true },
    { key: 'status', header: 'Estado', render: (t) => <StatusBadge status={t.status} type="trip" /> },
    { key: 'startedAt', header: 'Inicio', render: (t) => formatDate(t.startedAt) },
    { key: 'distance', header: 'Distancia', render: (t) => formatDistance(t.distance) },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/admin/drivers')} style={{ fontSize: 18 }}>←</button>
        <h2 style={{ margin: 0, fontSize: 20 }}>{driver.name}</h2>
        <StatusBadge status={driver.status} type="truck" />
      </div>

      <div className="grid-3">
        <div className="card">
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>Información Personal</h4>
          <div className="info-row"><span>Email</span><span>{driver.email}</span></div>
          <div className="info-row"><span>Teléfono</span><span>{formatPhone(driver.phone)}</span></div>
        </div>
        <div className="card">
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>Licencia</h4>
          <div className="info-row"><span>Número</span><span>{driver.licenseNumber}</span></div>
          <div className="info-row"><span>Tipo</span><span>{driver.licenseType}</span></div>
          <div className="info-row"><span>Vencimiento</span>
            <span style={{ color: new Date(driver.licenseExpiry) < new Date() ? 'var(--danger)' : 'inherit' }}>
              {formatDate(driver.licenseExpiry)}
            </span>
          </div>
        </div>
        <div className="card">
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>Cliente</h4>
          <p style={{ margin: 0, fontSize: 14 }}>{driver.clientName || '—'}</p>
        </div>
      </div>

      <div className="card">
        <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>Historial de Viajes</h4>
        <DataTable
          columns={tripCols}
          data={trips}
          keyExtractor={(t) => t.id}
          onRowClick={(t) => navigate(`/admin/trips/${t.id}`)}
        />
      </div>
    </motion.div>
  )
}
