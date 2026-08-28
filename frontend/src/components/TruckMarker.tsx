import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { getTruckStatusColor } from '@/utils/statusColors'

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  in_maintenance: 'En mantenimiento',
  out_of_service: 'Fuera de servicio',
  retired: 'Retirado',
  available: 'Disponible',
  on_trip: 'En viaje',
  resting: 'Descanso',
  inactive: 'Inactivo',
  moving: 'En movimiento',
  stopped: 'Detenido',
  idle: 'Inactivo',
  engine_off: 'Apagado',
  alert: 'Alerta',
  disconnected: 'Desconectado',
}

interface TruckMarkerProps {
  map: L.Map
  lat: number
  lng: number
  plate: string
  status: string
  speed?: number
  heading?: number
  driverName?: string
  lastUpdate?: string
  onClick?: () => void
}

export default function TruckMarker({
  map,
  lat,
  lng,
  plate,
  status,
  speed,
  heading,
  driverName,
  lastUpdate,
  onClick,
}: TruckMarkerProps) {
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    const color = getTruckStatusColor(status)
    const iconHtml = `
      <div style="
        width: 32px; height: 32px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        font-size: 14px;
        color: white;
        ${status === 'moving' ? 'animation: pulse 2s infinite;' : ''}
      ">
        🚛
      </div>
    `

    const icon = L.divIcon({
      html: iconHtml,
      className: 'truck-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })

    const marker = L.marker([lat, lng], { icon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family: system-ui; min-width: 180px;">
          <strong style="font-size: 14px;">${plate}</strong><br/>
          <span style="color: ${color};">● ${STATUS_LABELS[status] || status}</span><br/>
          ${speed != null ? `<span>Velocidad: ${speed} km/h</span><br/>` : ''}
          ${driverName ? `<span>Conductor: ${driverName}</span><br/>` : ''}
          ${lastUpdate ? `<span style="font-size: 11px; color: #666;">${new Date(lastUpdate).toLocaleString('es')}</span>` : ''}
        </div>
      `)

    if (onClick) {
      marker.on('click', onClick)
    }

    markerRef.current = marker

    return () => {
      map.removeLayer(marker)
    }
  }, [map, lat, lng, plate, status, speed, heading, driverName, lastUpdate, onClick])

  // Update position
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    }
  }, [lat, lng])

  return null
}
