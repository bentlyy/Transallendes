import { useState, useEffect } from 'react'
import { getUsers } from '@/api/super-admin'
import DataTable, { type Column } from '@/components/DataTable'
import { usePagination } from '@/hooks/usePagination'
import { formatDate } from '@/utils/formatters'
import { motion } from 'framer-motion'

export default function GlobalUserListPage() {
  const [users, setUsers] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const pag = usePagination()

  async function fetch() {
    setLoading(true)
    try {
      const res = await getUsers({ page: String(pag.page), limit: String(pag.pageSize), search })
      setUsers(res.data)
      pag.setTotal(res.total)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [pag.page, pag.pageSize, search])

  const columns: Column<Record<string, unknown>>[] = [
    { key: 'name', header: 'Nombre', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'role', header: 'Rol', sortable: true },
    { key: 'tenantName', header: 'Inquilino', sortable: true },
    { key: 'createdAt', header: 'Creado', render: (u: Record<string, unknown>) => formatDate(u.createdAt as string) },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Usuarios Globales</h2>
      <DataTable
        columns={columns}
        data={users}
        keyExtractor={(u: Record<string, unknown>) => String(u.id)}
        loading={loading}
        searchable
        searchValue={search}
        onSearch={setSearch}
        pagination={{ ...pag, onPageChange: pag.setPage, onPageSizeChange: pag.setPageSize }}
      />
    </motion.div>
  )
}
