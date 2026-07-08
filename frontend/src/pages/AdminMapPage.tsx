import { useState } from 'react'
import MapView from '@/components/MapView'
import MapFilters from '@/components/MapFilters'
import { useMapData } from '@/hooks/useMapData'
import { useNavigate } from 'react-router-dom'

export default function AdminMapPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { positions, loading } = useMapData({ status: statusFilter || undefined, search: search || undefined })

  const filteredPositions = positions.map((p) => ({
    ...p,
    status: p.status,
  }))

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
          positions={filteredPositions}
          height="100%"
          onMarkerClick={(truckId) => navigate(`/admin/trucks/${truckId}`)}
        />
      </div>
    </div>
  )
}
