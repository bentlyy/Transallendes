import { getTruckStatusColor, getTruckStatusBg, getTripStatusColor, getTripStatusBg, getAlertSeverityColor, getAlertSeverityBg, getMaintenanceStatusColor } from '@/utils/statusColors'

interface StatusBadgeProps {
  status: string
  type?: 'truck' | 'trip' | 'alert' | 'maintenance'
  label?: string
}

const STATUS_LABELS: Record<string, Record<string, string>> = {
  truck: {
    moving: 'En movimiento',
    stopped: 'Detenido',
    idle: 'Inactivo',
    engine_off: 'Apagado',
    alert: 'Alerta',
    disconnected: 'Desconectado',
  },
  trip: {
    planned: 'Planificado',
    assigned: 'Asignado',
    loading: 'Cargando',
    in_progress: 'En ruta',
    resting: 'Descanso',
    completed: 'Completado',
    cancelled: 'Cancelado',
    delayed: 'Retrasado',
  },
  alert: {
    critical: 'Crítico',
    high: 'Alto',
    medium: 'Medio',
    low: 'Bajo',
  },
}

export default function StatusBadge({ status, type = 'truck', label }: StatusBadgeProps) {
  let color: string
  let bg: string

  switch (type) {
    case 'trip':
      color = getTripStatusColor(status)
      bg = getTripStatusBg(status)
      break
    case 'alert':
      color = getAlertSeverityColor(status)
      bg = getAlertSeverityBg(status)
      break
    case 'maintenance':
      color = getMaintenanceStatusColor(status)
      bg = `${color}20`
      break
    default:
      color = getTruckStatusColor(status)
      bg = getTruckStatusBg(status)
  }

  const displayLabel = label || STATUS_LABELS[type]?.[status] || status

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color,
        backgroundColor: bg,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
      {displayLabel}
    </span>
  )
}
