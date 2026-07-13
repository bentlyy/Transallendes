import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import MapView from '@/components/MapView'
import MapFilters from '@/components/MapFilters'
import { useMapData } from '@/hooks/useMapData'

export default function AdminMapPage() {
  const [searchParams] = useSearchParams()
  const truckIdParam = searchParams.get('truckId') || undefined
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { positions, loading } = useMapData({ status: statusFilter || undefined, search: search || undefined })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Mapa de Flota</h2>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          {loading ? 'Actualizando...' : `${positions.length} vehículos`}
        </span>
      </div>
      <MapFilters
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        search={search}
        onSearchChange={setSearch}
      />
      <div style={{ flex: 1, borderRadius: 8, overflow: 'hidden' }}>
        <MapView
          positions={positions}
          height="100%"
          highlightedTruckId={truckIdParam}
          onMarkerClick={(truckId) => navigate(`/admin/trucks/${truckId}`)}
        />
      </div>
    </div>
  )
}
