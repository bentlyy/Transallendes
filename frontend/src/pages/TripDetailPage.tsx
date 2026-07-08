import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTrip, getTripPositions, updateTripStatus, type Trip, type TripPosition } from '@/api/trips'
import StatusBadge from '@/components/StatusBadge'
import MapView from '@/components/MapView'
import TripTimeline from '@/components/TripTimeline'
import LoadingSpinner from '@/components/LoadingSpinner'
import { formatDate, formatDateTime, formatCurrency, formatDistance } from '@/utils/formatters'
import { TRIP_STATUS } from '@/utils/constants'
import { motion } from 'framer-motion'

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [positions, setPositions] = useState<TripPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!id) return
    async function fetch() {
      try {
        const [t, pos] = await Promise.all([
          getTrip(id),
          getTripPositions(id).catch(() => []),
        ])
        setTrip(t)
        setPositions(pos)
      } catch {
        navigate('/admin/trips')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id, navigate])

  async function handleStatusChange(newStatus: string) {
    if (!trip) return
    setUpdating(true)
    try {
      const updated = await updateTripStatus(trip.id, newStatus)
      setTrip(updated)
    } catch {
      // ignore
    } finally {
      setUpdating(false)
    }
  }

  if (loading || !trip) return <LoadingSpinner fullPage text="Cargando viaje..." />

  const nextStatuses: Record<string, string[]> = {
    planned: ['assigned', 'cancelled'],
    assigned: ['loading', 'cancelled'],
    loading: ['in_progress', 'cancelled'],
    in_progress: ['resting', 'completed', 'delayed'],
    resting: ['in_progress', 'completed'],
    delayed: ['in_progress', 'cancelled'],
  }

  const availableTransitions = nextStatuses[trip.status] || []

  const routePoints = positions.map((p) => ({ lat: p.lat, lng: p.lng }))

  const timelineEvents = [
    { status: 'planned', timestamp: trip.createdAt, location: trip.origin },
    ...(trip.startedAt ? [{ status: 'in_progress' as const, timestamp: trip.startedAt, location: trip.origin }] : []),
    ...(trip.completedAt ? [{ status: 'completed' as const, timestamp: trip.completedAt, location: trip.destination }] : []),
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/admin/trips')} style={{ fontSize: 18 }}>←</button>
        <h2 style={{ margin: 0, fontSize: 20 }}>Viaje {trip.code}</h2>
        <StatusBadge status={trip.status} type="trip" />
        {availableTransitions.map((s) => (
          <button key={s} className={`btn btn-sm ${s === 'cancelled' ? 'btn-danger' : 'btn-primary'}`} onClick={() => handleStatusChange(s)} disabled={updating}>
            {{
              assigned: 'Asignar',
              loading: 'Cargando',
              in_progress: 'Iniciar viaje',
              completed: 'Completar',
              cancelled: 'Cancelar',
              resting: 'Descanso',
              delayed: 'Retrasar',
            }[s] || s}
          </button>
        ))}
      </div>

      <div className="grid-3">
        <div className="card">
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>Información</h4>
          <div className="info-row"><span>Origen</span><span>{trip.origin}</span></div>
          <div className="info-row"><span>Destino</span><span>{trip.destination}</span></div>
          <div className="info-row"><span>Fecha</span><span>{formatDate(trip.scheduledDate)}</span></div>
          <div className="info-row"><span>Distancia</span><span>{formatDistance(trip.distance)}</span></div>
        </div>
        <div className="card">
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>Asignación</h4>
          <div className="info-row"><span>Camion</span><span>{trip.truckPlate || '—'}</span></div>
          <div className="info-row"><span>Conductor</span><span>{trip.driverName || '—'}</span></div>
          <div className="info-row"><span>Cliente</span><span>{trip.clientName || '—'}</span></div>
        </div>
        <div className="card">
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>Costos</h4>
          <div className="info-row"><span>Total</span><span>{formatCurrency(trip.cost)}</span></div>
          <div className="info-row"><span>Combustible</span><span>{formatCurrency(trip.fuelCost)}</span></div>
          <div className="info-row"><span>Duración real</span><span>{trip.actualDuration ? `${trip.actualDuration}h` : '—'}</span></div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <h4 style={{ margin: '16px 16px 0', fontSize: 14, color: 'var(--muted)' }}>Ruta</h4>
          <MapView
            positions={routePoints.length > 0 ? [{
              id: trip.id,
              truckId: trip.truckId || '',
              plate: trip.truckPlate || '',
              lat: routePoints[routePoints.length - 1].lat,
              lng: routePoints[routePoints.length - 1].lng,
              speed: 0,
              heading: 0,
              status: trip.status,
              ignition: true,
              lastUpdate: trip.updatedAt,
            }] : []}
            route={routePoints}
            height={350}
          />
        </div>
        <div className="card">
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>Línea de tiempo</h4>
          <TripTimeline events={timelineEvents} />
        </div>
      </div>
    </motion.div>
  )
}
