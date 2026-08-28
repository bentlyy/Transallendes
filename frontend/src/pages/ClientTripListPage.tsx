import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTrips, type Trip } from '@/api/trips'
import DataTable, { type Column } from '@/components/DataTable'
import StatusBadge from '@/components/StatusBadge'
import { usePagination } from '@/hooks/usePagination'
import { formatDate, formatCurrency } from '@/utils/formatters'
import { motion } from 'framer-motion'

export default function ClientTripListPage() {
  const navigate = useNavigate()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const pag = usePagination()

  async function fetch() {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(pag.page), limit: String(pag.pageSize) }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      const res = await getTrips(params)
      setTrips(res.data)
      pag.setTotal(res.total)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [pag.page, pag.pageSize, search, statusFilter])

  const STATUS_FILTERS = ['', 'pending', 'in_progress', 'completed', 'cancelled']

  const columns: Column<Trip>[] = [
    { key: 'code', header: 'Código', sortable: true },
    { key: 'origin', header: 'Origen', sortable: true },
    { key: 'destination', header: 'Destino', sortable: true },
    { key: 'status', header: 'Estado', render: (t) => <StatusBadge status={t.status} type="trip" /> },
    { key: 'truckPlate', header: 'Camión' },
    { key: 'driverName', header: 'Conductor' },
    { key: 'scheduledDate', header: 'Fecha', render: (t) => formatDate(t.scheduledDate) },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Mis Viajes</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((s) => (
          <button key={s} className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setStatusFilter(s); pag.setPage(1) }} style={{ fontSize: 12, padding: '4px 10px' }}>
            {s ? { pending: 'Pendiente', in_progress: 'En ruta', completed: 'Completado', cancelled: 'Cancelado' }[s] || s : 'Todos'}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={trips}
        keyExtractor={(t) => t.id}
        loading={loading}
        searchable
        searchValue={search}
        onSearch={setSearch}
        onRowClick={(t) => navigate(`/portal/trips/${t.id}`)}
        pagination={{ ...pag, onPageChange: pag.setPage, onPageSizeChange: pag.setPageSize }}
      />
    </motion.div>
  )
}
