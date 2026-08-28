import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { MAP } from '@/utils/constants'

interface MapPosition {
  id: string
  truckId: string
  plate: string
  lat: number
  lng: number
  speed: number
  heading: number
  status: string
  ignition: boolean
  driverName?: string
  lastUpdate: string
}

interface GeofenceData {
  id: string
  name: string
  type: 'circle' | 'polygon'
  lat: number
  lng: number
  radius?: number
  color: string
}

interface RoutePoint {
  lat: number
  lng: number
}

interface MapViewProps {
  positions?: MapPosition[]
  geofences?: GeofenceData[]
  route?: RoutePoint[]
  onMarkerClick?: (truckId: string) => void
  height?: string | number
  center?: [number, number]
  zoom?: number
  highlightedTruckId?: string
  disableAutoFit?: boolean
}

function isValidCoord(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v)
}

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

function getMarkerColor(status: string): string {
  switch (status) {
    case 'moving': return '#22c55e'
    case 'stopped':
    case 'engine_off': return '#ef4444'
    case 'idle': return '#f59e0b'
    case 'alert': return '#dc2626'
    case 'disconnected': return '#94a3b8'
    default: return '#94a3b8'
  }
}

const RING_ON = '#22c55e'
const RING_OFF = '#ef4444'

function makeMarkerIcon(_status: string, ignition: boolean, highlighted = false) {
  const ringColor = ignition ? RING_ON : RING_OFF
  const ringWidth = highlighted ? 3 : 2
  const circleSize = highlighted ? 32 : 28
  const fontSize = highlighted ? 16 : 14
  const pulse = ignition ? 'animation: truck-pulse 2s infinite;' : ''
  const shadow = highlighted
    ? '0 0 0 3px rgba(59,130,246,0.4),0 2px 6px rgba(0,0,0,0.2)'
    : '0 1px 4px rgba(0,0,0,0.15)'

  return L.divIcon({
    html: `<div style="
      width:${circleSize}px;height:${circleSize}px;
      background:rgba(255,255,255,0.92);
      border:${ringWidth}px solid ${ringColor};
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:${shadow};
      ${pulse}
      font-size:${fontSize}px;line-height:1;
    ">
      🚛
    </div>`,
    className: '',
    iconSize: [circleSize + 6, circleSize + 6],
    iconAnchor: [(circleSize + 6) / 2, (circleSize + 6) / 2],
  })
}

function makeTooltipHtml(m: {
  plate: string
  status: string
  speed: number
  ignition: boolean
  driverName?: string
}) {
  const color = getMarkerColor(m.status)
  const label = STATUS_LABELS[m.status] || m.status
  return `<div style="font-family:system-ui,sans-serif;min-width:150px;line-height:1.5;">
    <strong style="font-size:14px;">${m.plate}</strong><br/>
    <span style="color:${color};font-size:13px;">● ${label}</span><br/>
    <span style="font-size:13px;">🚀 ${m.speed} km/h</span><br/>
    <span style="font-size:13px;">${m.ignition ? '⛽ Encendido' : '⛽ Apagado'}</span>
    ${m.driverName ? `<br/><span style="font-size:12px;color:#64748b;">👤 ${m.driverName}</span>` : ''}
  </div>`
}

function animateMarker(marker: L.Marker, target: L.LatLng, duration = 1200) {
  const start = marker.getLatLng()
  if (start.equals(target)) return
  const begin = performance.now()
  function step(now: number) {
    const t = Math.min((now - begin) / duration, 1)
    const e = 1 - Math.pow(1 - t, 3)
    marker.setLatLng([
      start.lat + (target.lat - start.lat) * e,
      start.lng + (target.lng - start.lng) * e,
    ])
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

export default function MapView({
  positions = [],
  geofences = [],
  route = [],
  onMarkerClick,
  height = 500,
  center = MAP.DEFAULT_CENTER,
  zoom = MAP.DEFAULT_ZOOM,
  highlightedTruckId,
  disableAutoFit = false,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const geofenceLayersRef = useRef<L.Circle[]>([])
  const routeLayerRef = useRef<L.Polyline | null>(null)
  const initialFitDone = useRef(false)
  const lastHighlightedRef = useRef<string | undefined>(undefined)

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: true,
    })

    L.tileLayer(MAP.TILE_URL, {
      attribution: MAP.TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map
    setTimeout(() => map.invalidateSize(), 100)

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current.clear()
      initialFitDone.current = false
      lastHighlightedRef.current = undefined
    }
  }, [center, zoom])

  // Sync markers with positions (update/create/remove with smooth animation)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const valid = positions.filter((p) => isValidCoord(p.lat) && isValidCoord(p.lng))

    // Fit bounds once on first valid data (only when no route is provided)
    if (!disableAutoFit && !initialFitDone.current && valid.length > 0 && route.length === 0) {
      const bounds = L.latLngBounds(valid.map((p) => [p.lat, p.lng]))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
      initialFitDone.current = true
    }

    const newKeys = new Set(valid.map((p) => p.truckId))

    // Remove stale markers
    for (const [truckId, marker] of markersRef.current) {
      if (!newKeys.has(truckId)) {
        map.removeLayer(marker)
        markersRef.current.delete(truckId)
      }
    }

    // Update or create markers
    valid.forEach((p) => {
      const existing = markersRef.current.get(p.truckId)
      const targetLatLng = L.latLng(p.lat, p.lng)
      const highlighted = p.truckId === highlightedTruckId
      const icon = makeMarkerIcon(p.status, p.ignition, highlighted)

      if (existing) {
        existing.setIcon(icon)
        animateMarker(existing, targetLatLng)
        if (existing.getTooltip()) {
          existing.setTooltipContent(makeTooltipHtml(p))
        }
      } else {
        const marker = L.marker([p.lat, p.lng], { icon })
        marker.bindTooltip(makeTooltipHtml(p), {
          sticky: true,
          direction: 'top',
          offset: [0, -8],
        })
        if (onMarkerClick) {
          marker.on('click', () => onMarkerClick(p.truckId))
        }
        marker.addTo(map)
        markersRef.current.set(p.truckId, marker)
      }
    })
  }, [positions, onMarkerClick, highlightedTruckId, route.length])

  // Only re-center when highlightedTruckId changes to a specific truck
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (highlightedTruckId && highlightedTruckId !== lastHighlightedRef.current) {
      lastHighlightedRef.current = highlightedTruckId
      setTimeout(() => {
        const marker = markersRef.current.get(highlightedTruckId)
        if (marker) {
          map.setView(marker.getLatLng(), 14, { animate: true })
        }
      }, 100)
    } else if (!highlightedTruckId) {
      lastHighlightedRef.current = undefined
    }
  }, [highlightedTruckId])

  // Geofences
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    geofenceLayersRef.current.forEach((l) => map.removeLayer(l))
    geofenceLayersRef.current = []

    geofences.forEach((g) => {
      if (g.type === 'circle' && g.radius && isValidCoord(g.lat) && isValidCoord(g.lng)) {
        const circle = L.circle([g.lat, g.lng], {
          radius: g.radius,
          color: g.color || '#3b82f6',
          fillColor: g.color || '#3b82f6',
          fillOpacity: 0.08,
          weight: 2,
        }).addTo(map)
        circle.bindPopup(`<strong>${g.name}</strong>`)
        geofenceLayersRef.current.push(circle)
      }
    })
  }, [geofences])

  // Route polyline — fit bounds only once
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current)
    }
    const validRoutePoints = route.filter((p) => isValidCoord(p.lat) && isValidCoord(p.lng))
    if (validRoutePoints.length > 1) {
      const polyline = L.polyline(
        validRoutePoints.map((p) => [p.lat, p.lng]),
        { color: '#3b82f6', weight: 3, opacity: 0.6 }
      ).addTo(map)

      if (!disableAutoFit && !initialFitDone.current) {
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] })
        initialFitDone.current = true
      }
      routeLayerRef.current = polyline
    }
  }, [route])

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
    </div>
  )
}
