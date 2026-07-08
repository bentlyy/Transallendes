import { useEffect, useRef, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet.markercluster'
import { MAP } from '@/utils/constants'
import { getTruckStatusColor } from '@/utils/statusColors'

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
  showClusters?: boolean
}

function isValidCoord(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v)
}

function makeMarkerIcon(status: string) {
  const color = getTruckStatusColor(status)
  return L.divIcon({
    html: `<div style="width:28px;height:28px;background:${color};border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:12px;color:white;">🚛</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function makePopupHtml(m: { plate: string; status: string; speed?: number; driverName?: string }) {
  const color = getTruckStatusColor(m.status)
  return `<div style="font-family:system-ui;min-width:160px;">
    <strong>${m.plate}</strong><br/>
    <span style="color:${color};">● ${m.status}</span><br/>
    ${m.speed != null ? `<span>${m.speed} km/h</span><br/>` : ''}
    ${m.driverName ? `<span style="color:#64748b;">${m.driverName}</span>` : ''}
  </div>`
}

export default function MapView({
  positions = [],
  geofences = [],
  route = [],
  onMarkerClick,
  height = 500,
  center = MAP.DEFAULT_CENTER,
  zoom = MAP.DEFAULT_ZOOM,
  showClusters = true,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const geofenceLayersRef = useRef<L.Circle[]>([])
  const routeLayerRef = useRef<L.Polyline | null>(null)

  // Initialize map
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

    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      disableClusteringAtZoom: 16,
    })
    map.addLayer(clusterGroup)
    clusterGroupRef.current = clusterGroup

    const markersLayer = L.layerGroup()
    map.addLayer(markersLayer)
    markersLayerRef.current = markersLayer

    mapRef.current = map

    setTimeout(() => map.invalidateSize(), 100)

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Memoize valid markers
  const validMarkers = useMemo(() => {
    return positions
      .filter((p) => isValidCoord(p.lat) && isValidCoord(p.lng))
      .map((p) => ({
        key: p.truckId,
        lat: p.lat,
        lng: p.lng,
        plate: p.plate,
        status: p.status,
        speed: p.speed,
        heading: p.heading,
        driverName: p.driverName,
        lastUpdate: p.lastUpdate,
        onClick: () => onMarkerClick?.(p.truckId),
      }))
  }, [positions, onMarkerClick])

  // Render markers
  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    const clusterGroup = clusterGroupRef.current
    const markersLayer = markersLayerRef.current
    if (!clusterGroup || !markersLayer) return

    clusterGroup.clearLayers()
    markersLayer.clearLayers()

    validMarkers.forEach((m) => {
      const icon = makeMarkerIcon(m.status)
      const marker = L.marker([m.lat, m.lng], { icon })
      marker.bindPopup(makePopupHtml(m))
      if (m.onClick) marker.on('click', m.onClick)

      if (showClusters) {
        clusterGroup.addLayer(marker)
      } else {
        markersLayer.addLayer(marker)
      }
    })

    // Fit bounds
    if (validMarkers.length > 0) {
      const bounds = L.latLngBounds(validMarkers.map((m) => [m.lat, m.lng]))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
    }
  }, [validMarkers, showClusters])

  // Geofences
  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    geofenceLayersRef.current.forEach((l) => map.removeLayer(l))
    geofenceLayersRef.current = []

    geofences.forEach((g) => {
      if (g.type === 'circle' && g.radius && isValidCoord(g.lat) && isValidCoord(g.lng)) {
        const circle = L.circle([g.lat, g.lng], {
          radius: g.radius,
          color: g.color || '#3b82f6',
          fillColor: g.color || '#3b82f6',
          fillOpacity: 0.1,
          weight: 2,
        }).addTo(map)
        circle.bindPopup(`<strong>${g.name}</strong>`)
        geofenceLayersRef.current.push(circle)
      }
    })
  }, [geofences])

  // Route polyline
  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current)
    }
    const validRoutePoints = route.filter((p) => isValidCoord(p.lat) && isValidCoord(p.lng))
    if (validRoutePoints.length > 1) {
      const polyline = L.polyline(
        validRoutePoints.map((p) => [p.lat, p.lng]),
        { color: '#3b82f6', weight: 3, opacity: 0.7 }
      ).addTo(map)
      routeLayerRef.current = polyline
      map.fitBounds(polyline.getBounds(), { padding: [50, 50] })
    }
  }, [route])

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
    </div>
  )
}
