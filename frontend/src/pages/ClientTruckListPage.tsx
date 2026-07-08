import { useState, useEffect } from 'react'
import { getTrucks, type Truck } from '@/api/trucks'
import DataTable, { type Column } from '@/components/DataTable'
import StatusBadge from '@/components/StatusBadge'
import { usePagination } from '@/hooks/usePagination'
import { formatNumber } from '@/utils/formatters'
import { motion } from 'framer-motion'

export default function ClientTruckListPage() {
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [loading, setLoading] = useState(true)
  const pag = usePagination()

  async function fetch() {
    setLoading(true)
    try {
      const res = await getTrucks({ page: String(pag.page), limit: String(pag.pageSize) })
      setTrucks(res.data)
      pag.setTotal(res.total)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [pag.page, pag.pageSize])

  const columns: Column<Truck>[] = [
    { key: 'plate', header: 'Matrícula', sortable: true },
    { key: 'brand', header: 'Marca', sortable: true },
    { key: 'model', header: 'Modelo' },
    { key: 'year', header: 'Año' },
    { key: 'status', header: 'Estado', render: (t) => <StatusBadge status={t.status} type="truck" /> },
    { key: 'fuelLevel', header: 'Combustible', render: (t) => t.fuelLevel != null ? `${formatNumber(t.fuelLevel)}%` : '—' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Mis Camiones</h2>
      <DataTable
        columns={columns}
        data={trucks}
        keyExtractor={(t) => t.id}
        loading={loading}
        pagination={{ ...pag, onPageChange: pag.setPage, onPageSizeChange: pag.setPageSize }}
      />
    </motion.div>
  )
}
