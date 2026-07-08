import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTrip, getTripPositions, type Trip, type TripPosition } from '@/api/trips'
import StatusBadge from '@/components/StatusBadge'
import MapView from '@/components/MapView'
import LoadingSpinner from '@/components/LoadingSpinner'
import { formatDate, formatCurrency, formatDistance } from '@/utils/formatters'
import { motion } from 'framer-motion'

export default function ClientTripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [positions, setPositions] = useState<TripPosition[]>([])
  const [loading, setLoading] = useState(true)

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
        navigate('/portal/trips')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id, navigate])

  if (loading || !trip) return <LoadingSpinner fullPage text="Cargando viaje..." />

  const routePoints = positions.map((p) => ({ lat: p.lat, lng: p.lng }))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/portal/trips')} style={{ fontSize: 18 }}>←</button>
        <h2 style={{ margin: 0, fontSize: 20 }}>Viaje {trip.code}</h2>
        <StatusBadge status={trip.status} type="trip" />
      </div>

      <div className="grid-3">
        <div className="card">
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>Detalles</h4>
          <div className="info-row"><span>Origen</span><span>{trip.origin}</span></div>
          <div className="info-row"><span>Destino</span><span>{trip.destination}</span></div>
          <div className="info-row"><span>Fecha</span><span>{formatDate(trip.scheduledDate)}</span></div>
          <div className="info-row"><span>Distancia</span><span>{formatDistance(trip.distance)}</span></div>
        </div>
        <div className="card">
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>Asignación</h4>
          <div className="info-row"><span>Camion</span><span>{trip.truckPlate || '—'}</span></div>
          <div className="info-row"><span>Conductor</span><span>{trip.driverName || '—'}</span></div>
        </div>
        <div className="card">
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>Costos</h4>
          <div className="info-row"><span>Total</span><span>{formatCurrency(trip.cost)}</span></div>
          <div className="info-row"><span>Combustible</span><span>{formatCurrency(trip.fuelCost)}</span></div>
        </div>
      </div>

      {routePoints.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <h4 style={{ margin: '16px 16px 0', fontSize: 14, color: 'var(--muted)' }}>Ruta</h4>
          <MapView route={routePoints} height={350} />
        </div>
      )}
    </motion.div>
  )
}
