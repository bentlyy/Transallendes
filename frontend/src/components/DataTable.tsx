import { useState, useMemo, type ReactNode } from 'react'
import Pagination from './Pagination'
import LoadingSpinner from './LoadingSpinner'
import EmptyState from './EmptyState'

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (item: T) => ReactNode
  width?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  loading?: boolean
  pagination?: {
    page: number
    totalPages: number
    total: number
    pageSize: number
    onPageChange: (page: number) => void
    onPageSizeChange?: (size: number) => void
  }
  searchable?: boolean
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  searchValue?: string
  emptyTitle?: string
  emptyMessage?: string
  onRowClick?: (item: T) => void
  actions?: (item: T) => ReactNode
}

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading,
  pagination,
  searchable,
  searchPlaceholder = 'Buscar...',
  onSearch,
  searchValue,
  emptyTitle = 'Sin datos',
  emptyMessage = 'No se encontraron registros',
  onRowClick,
  actions,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const sortedData = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey]
      const bVal = (b as Record<string, unknown>)[sortKey]
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = String(aVal).localeCompare(String(bVal), 'es')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <LoadingSpinner text="Cargando datos..." />
      </div>
    )
  }

  if (!data.length) {
    return (
      <EmptyState title={emptyTitle} message={emptyMessage} />
    )
  }

  return (
    <div>
      {searchable && (
        <div style={{ marginBottom: 12 }}>
          <input
            className="input"
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue || ''}
            onChange={(e) => onSearch?.(e.target.value)}
            style={{ maxWidth: 320 }}
          />
        </div>
      )}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width, cursor: col.sortable ? 'pointer' : 'default' }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, userSelect: 'none' }}>
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      <span style={{ fontSize: 10 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </span>
                </th>
              ))}
              {actions && <th style={{ width: 80 }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render
                      ? col.render(item)
                      : String((item as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
                {actions && <td onClick={(e) => e.stopPropagation()}>{actions(item)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageSizeChange={pagination.onPageSizeChange}
        />
      )}
    </div>
  )
}
