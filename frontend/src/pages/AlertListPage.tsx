import { useState, useEffect } from 'react'
import { getAlerts, acknowledgeAlert, resolveAlert, getAlertStats, type Alert, type AlertStats } from '@/api/alerts'
import DataTable, { type Column } from '@/components/DataTable'
import StatusBadge from '@/components/StatusBadge'
import StatCard from '@/components/StatCard'
import { usePagination } from '@/hooks/usePagination'
import { formatDateTime, formatRelativeTime } from '@/utils/formatters'
import { motion } from 'framer-motion'

const SEVERITY_FILTERS = ['', 'critical', 'high', 'medium', 'low']

export default function AlertListPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stats, setStats] = useState<AlertStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const pag = usePagination(20)

  async function fetch() {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(pag.page), limit: String(pag.pageSize) }
      if (severityFilter) params.severity = severityFilter
      if (statusFilter) params.status = statusFilter
      const [res, s] = await Promise.all([
        getAlerts(params),
        getAlertStats().catch(() => null),
      ])
      setAlerts(res.data)
      pag.setTotal(res.total)
      if (s) setStats(s)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [pag.page, pag.pageSize, severityFilter, statusFilter])

  async function handleAcknowledge(id: string) {
    setActionLoading(id)
    try { await acknowledgeAlert(id); await fetch() } catch { /* ignore */ }
    finally { setActionLoading(null) }
  }

  async function handleResolve(id: string) {
    setActionLoading(id)
    try { await resolveAlert(id); await fetch() } catch { /* ignore */ }
    finally { setActionLoading(null) }
  }

  const columns: Column<Alert>[] = [
    { key: 'severity', header: 'Severidad', render: (a) => <StatusBadge status={a.severity} type="alert" /> },
    { key: 'title', header: 'Título', sortable: true },
    { key: 'message', header: 'Mensaje' },
    { key: 'truckPlate', header: 'Camión', sortable: true },
    { key: 'driverName', header: 'Conductor' },
    { key: 'status', header: 'Estado', render: (a) => {
      if (a.resolvedAt) return <StatusBadge status="completed" type="trip" label="Resuelta" />
      if (a.acknowledgedAt) return <StatusBadge status="in_progress" type="trip" label="Vista" />
      return <StatusBadge status="alert" type="truck" label="Pendiente" />
    }},
    { key: 'createdAt', header: 'Creada', render: (a) => formatRelativeTime(a.createdAt) },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Alertas</h2>

      {stats && (
        <div className="grid-4">
          <StatCard icon="🔴" label="Críticas" value={stats.critical} color="#ef4444" />
          <StatCard icon="🟠" label="Altas" value={stats.high} color="#f97316" />
          <StatCard icon="🟡" label="Medias" value={stats.medium} color="#f59e0b" />
          <StatCard icon="⚪" label="Bajas" value={stats.low} color="#6b7280" />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {SEVERITY_FILTERS.map((s) => (
          <button key={s} className={`btn ${severityFilter === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setSeverityFilter(s); pag.setPage(1) }} style={{ fontSize: 12, padding: '4px 10px' }}>
            {s ? { critical: 'Crítico', high: 'Alto', medium: 'Medio', low: 'Bajo' }[s] || s : 'Todos'}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <select className="input" style={{ width: 'auto', fontSize: 12 }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); pag.setPage(1) }}>
          <option value="">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="acknowledged">Vistas</option>
          <option value="resolved">Resueltas</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={alerts}
        keyExtractor={(a) => a.id}
        loading={loading}
        pagination={{ ...pag, onPageChange: pag.setPage, onPageSizeChange: pag.setPageSize }}
        actions={(a) => (
          <div style={{ display: 'flex', gap: 4 }}>
            {!a.acknowledgedAt && (
              <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); handleAcknowledge(a.id) }} disabled={actionLoading === a.id}>
                👁️
              </button>
            )}
            {!a.resolvedAt && (
              <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, color: 'var(--success)' }} onClick={(e) => { e.stopPropagation(); handleResolve(a.id) }} disabled={actionLoading === a.id}>
                ✅
              </button>
            )}
          </div>
        )}
      />
    </motion.div>
  )
}
