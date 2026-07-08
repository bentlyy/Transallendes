import { useState } from 'react'
import MapView from '@/components/MapView'
import MapFilters from '@/components/MapFilters'
import { useMapData } from '@/hooks/useMapData'
import { useAuth } from '@/hooks/useAuth'

export default function ClientMapPage() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const { positions, loading } = useMapData({ clientId: user?.tenantId || undefined, status: statusFilter || undefined, search: search || undefined })

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
        <MapView positions={positions} height="100%" />
      </div>
    </div>
  )
}
