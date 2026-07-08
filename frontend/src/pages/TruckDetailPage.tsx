import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTruck, getTruckPositions, type Truck, type TruckPosition } from '@/api/trucks'
import { getMaintenance, type Maintenance } from '@/api/maintenance'
import StatusBadge from '@/components/StatusBadge'
import MapView from '@/components/MapView'
import LoadingSpinner from '@/components/LoadingSpinner'
import DataTable, { type Column } from '@/components/DataTable'
import { formatDate, formatDateTime, formatNumber, formatSpeed, formatFuel } from '@/utils/formatters'
import { motion } from 'framer-motion'

export default function TruckDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [truck, setTruck] = useState<Truck | null>(null)
  const [positions, setPositions] = useState<TruckPosition[]>([])
  const [maintenance, setMaintenance] = useState<Maintenance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    async function fetch() {
      try {
        const [t, pos, maint] = await Promise.all([
          getTruck(id),
          getTruckPositions(id, { from: new Date(Date.now() - 86400000).toISOString() }).catch(() => []),
          getMaintenance({ truckId: id, limit: '10' }).catch(() => ({ data: [] })),
        ])
        setTruck(t)
        setPositions(pos)
        setMaintenance(maint.data)
      } catch {
        navigate('/admin/trucks')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id, navigate])

  if (loading || !truck) return <LoadingSpinner fullPage text="Cargando camión..." />

  const routePoints = positions.map((p) => ({ lat: p.lat, lng: p.lng }))

  const maintCols: Column<Maintenance>[] = [
    { key: 'type', header: 'Tipo' },
    { key: 'status', header: 'Estado', render: (m) => <StatusBadge status={m.status} type="maintenance" /> },
    { key: 'description', header: 'Descripción' },
    { key: 'scheduledDate', header: 'Programado', render: (m) => formatDate(m.scheduledDate) },
    { key: 'cost', header: 'Costo', render: (m) => m.cost ? `$${m.cost}` : '—' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/admin/trucks')} style={{ fontSize: 18 }}>←</button>
        <h2 style={{ margin: 0, fontSize: 20 }}>{truck.plate}</h2>
        <StatusBadge status={truck.status} type="truck" />
      </div>

      <div className="grid-3">
        <div className="card">
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>Información General</h4>
          <div className="info-row"><span>Marca</span><span>{truck.brand}</span></div>
          <div className="info-row"><span>Modelo</span><span>{truck.model}</span></div>
          <div className="info-row"><span>Año</span><span>{truck.year}</span></div>
          <div className="info-row"><span>Tipo</span><span>{truck.type}</span></div>
        </div>
        <div className="card">
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>Estado Actual</h4>
          <div className="info-row"><span>Velocidad</span><span>{formatSpeed(truck.speed)}</span></div>
          <div className="info-row"><span>Combustible</span><span>{truck.fuelLevel != null ? `${formatNumber(truck.fuelLevel)}%` : '—'}</span></div>
          <div className="info-row"><span>Kilometraje</span><span>{truck.mileage ? `${formatNumber(truck.mileage)} km` : '—'}</span></div>
          <div className="info-row"><span>Última actualización</span><span>{formatDateTime(truck.lastPositionUpdate)}</span></div>
        </div>
        <div className="card">
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>Conductor</h4>
          {truck.driverName ? (
            <>
              <div className="info-row"><span>Nombre</span><span>{truck.driverName}</span></div>
              {truck.driverId && (
                <button className="btn btn-ghost" style={{ marginTop: 8, fontSize: 13, padding: '4px 8px' }} onClick={() => navigate(`/admin/drivers/${truck.driverId}`)}>
                  Ver conductor →
                </button>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Sin conductor asignado</p>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <h4 style={{ margin: '16px 16px 0', fontSize: 14, color: 'var(--muted)' }}>Últimos movimientos</h4>
        <MapView
          positions={positions.length > 0 ? [{
            id: truck.id,
            truckId: truck.id,
            plate: truck.plate,
            lat: positions[positions.length - 1].lat,
            lng: positions[positions.length - 1].lng,
            speed: positions[positions.length - 1].speed,
            heading: positions[positions.length - 1].heading,
            status: truck.status,
            ignition: truck.ignition ?? false,
            driverName: truck.driverName,
            lastUpdate: positions[positions.length - 1].recordedAt,
          }] : []}
          route={routePoints}
          height={350}
        />
      </div>

      <div className="card">
        <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>Historial de Mantenimiento</h4>
        <DataTable columns={maintCols} data={maintenance} keyExtractor={(m) => m.id} />
      </div>
    </motion.div>
  )
}
