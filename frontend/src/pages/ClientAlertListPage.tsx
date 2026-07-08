import { useState, useEffect } from 'react'
import { getAlerts, acknowledgeAlert, type Alert } from '@/api/alerts'
import DataTable, { type Column } from '@/components/DataTable'
import StatusBadge from '@/components/StatusBadge'
import { usePagination } from '@/hooks/usePagination'
import { formatRelativeTime } from '@/utils/formatters'
import { motion } from 'framer-motion'

export default function ClientAlertListPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const pag = usePagination(20)

  async function fetch() {
    setLoading(true)
    try {
      const res = await getAlerts({ page: String(pag.page), limit: String(pag.pageSize) })
      setAlerts(res.data)
      pag.setTotal(res.total)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [pag.page, pag.pageSize])

  async function handleAcknowledge(id: string) {
    setActionLoading(id)
    try { await acknowledgeAlert(id); await fetch() } catch { /* ignore */ }
    finally { setActionLoading(null) }
  }

  const columns: Column<Alert>[] = [
    { key: 'severity', header: 'Severidad', render: (a) => <StatusBadge status={a.severity} type="alert" /> },
    { key: 'title', header: 'Título', sortable: true },
    { key: 'message', header: 'Mensaje' },
    { key: 'truckPlate', header: 'Camión' },
    { key: 'createdAt', header: 'Creada', render: (a) => formatRelativeTime(a.createdAt) },
    { key: 'status', header: 'Estado', render: (a) => a.acknowledgedAt ? 'Vista' : 'Pendiente' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Mis Alertas</h2>
      <DataTable
        columns={columns}
        data={alerts}
        keyExtractor={(a) => a.id}
        loading={loading}
        pagination={{ ...pag, onPageChange: pag.setPage, onPageSizeChange: pag.setPageSize }}
        actions={(a) => (
          !a.acknowledgedAt ? (
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); handleAcknowledge(a.id) }} disabled={actionLoading === a.id}>
              👁️ Ver
            </button>
          ) : null
        )}
      />
    </motion.div>
  )
}
