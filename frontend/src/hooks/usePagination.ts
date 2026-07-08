import { useState } from 'react'
import { PAGINATION } from '@/utils/constants'

export function usePagination(initialPageSize = PAGINATION.DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [total, setTotal] = useState(0)

  const totalPages = Math.ceil(total / pageSize) || 1

  return {
    page,
    pageSize,
    total,
    totalPages,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size)
      setPage(1)
    },
    setTotal,
    reset: () => {
      setPage(1)
      setTotal(0)
    },
  }
}
