import { TRUCK_STATUS } from '@/utils/constants'
import { getTruckStatusColor } from '@/utils/statusColors'

interface MapFiltersProps {
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  search: string
  onSearchChange: (query: string) => void
  clientId?: string
  onClientChange?: (clientId: string) => void
  clients?: { id: string; companyName: string }[]
  dateFrom?: string
  dateTo?: string
  onDateFromChange?: (date: string) => void
  onDateToChange?: (date: string) => void
}

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: TRUCK_STATUS.MOVING, label: 'En movimiento' },
  { value: TRUCK_STATUS.STOPPED, label: 'Detenido' },
  { value: TRUCK_STATUS.IDLE, label: 'Inactivo' },
  { value: TRUCK_STATUS.ENGINE_OFF, label: 'Apagado' },
  { value: TRUCK_STATUS.ALERT, label: 'Alerta' },
  { value: TRUCK_STATUS.DISCONNECTED, label: 'Desconectado' },
]

export default function MapFilters({
  statusFilter,
  onStatusFilterChange,
  search,
  onSearchChange,
  clientId,
  onClientChange,
  clients,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: MapFiltersProps) {
  return (
    <div className="card" style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <input
        className="input"
        type="text"
        placeholder="Buscar por matrícula..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ maxWidth: 200 }}
      />
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            className={`btn ${statusFilter === f.value ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onStatusFilterChange(f.value)}
            style={{ fontSize: 12, padding: '4px 10px' }}
          >
            {f.value && (
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: getTruckStatusColor(f.value),
                  marginRight: 4,
                }}
              />
            )}
            {f.label}
          </button>
        ))}
      </div>
      {clients && onClientChange && (
        <select
          className="input"
          value={clientId || ''}
          onChange={(e) => onClientChange(e.target.value)}
          style={{ maxWidth: 180 }}
        >
          <option value="">Todos los clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.companyName}</option>
          ))}
        </select>
      )}
      {onDateFromChange && (
        <input
          className="input"
          type="date"
          value={dateFrom || ''}
          onChange={(e) => onDateFromChange(e.target.value)}
          style={{ maxWidth: 150 }}
        />
      )}
      {onDateToChange && (
        <input
          className="input"
          type="date"
          value={dateTo || ''}
          onChange={(e) => onDateToChange(e.target.value)}
          style={{ maxWidth: 150 }}
        />
      )}
    </div>
  )
}
