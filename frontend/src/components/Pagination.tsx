interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  pageSize: number
  total: number
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  pageSize,
  total,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const delta = 2
    const start = Math.max(1, page - delta)
    const end = Math.min(totalPages, page + delta)

    if (start > 1) {
      pages.push(1)
      if (start > 2) pages.push('...')
    }
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', flexWrap: 'wrap', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
        <span>{total} resultados</span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="input"
            style={{ width: 'auto', padding: '2px 8px', fontSize: 13 }}
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>{s} / pág</option>
            ))}
          </select>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          className="btn btn-ghost"
          disabled={page === 1}
          onClick={() => onPageChange(1)}
          style={{ padding: '4px 8px' }}
        >
          «
        </button>
        <button
          className="btn btn-ghost"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          style={{ padding: '4px 8px' }}
        >
          ‹
        </button>
        {getPageNumbers().map((p, i) =>
          typeof p === 'string' ? (
            <span key={`ellipsis-${i}`} style={{ padding: '4px 8px', color: 'var(--muted)' }}>...</span>
          ) : (
            <button
              key={p}
              className={`btn ${p === page ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onPageChange(p)}
              style={{ padding: '4px 10px', minWidth: 32 }}
            >
              {p}
            </button>
          )
        )}
        <button
          className="btn btn-ghost"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          style={{ padding: '4px 8px' }}
        >
          ›
        </button>
        <button
          className="btn btn-ghost"
          disabled={page === totalPages}
          onClick={() => onPageChange(totalPages)}
          style={{ padding: '4px 8px' }}
        >
          »
        </button>
      </div>
    </div>
  )
}
