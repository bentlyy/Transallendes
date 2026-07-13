import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../../src/shared/db.js', () => ({
  query: vi.fn(),
  pool: { query: vi.fn() },
}))

import { query } from '../../../../src/shared/db.js'

const mockQuery = query as ReturnType<typeof vi.fn>
const TENANT = 'tenant-1'

beforeEach(() => {
  vi.clearAllMocks()
})

async function loadModule() {
  return import('../../../../src/modules/trucks/trucks.service.js')
}

describe('TrucksService', () => {
  describe('findById', () => {
    it('should return truck when found', async () => {
      const fakeRow = { id: 1, plate: 'ABC-123', tenant_id: TENANT, brand: 'Toyota' }
      mockQuery.mockResolvedValueOnce({ rows: [fakeRow] })

      const svc = await loadModule()
      const result = await svc.findById(TENANT, 1)

      expect(result).toEqual(fakeRow)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT t.*'),
        [1, TENANT],
      )
    })

    it('should throw NotFoundError when truck not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const svc = await loadModule()
      await expect(svc.findById(TENANT, 999)).rejects.toThrow('Truck not found')
    })
  })

  describe('findAll', () => {
    it('should return paginated results', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, plate: 'ABC-123', tenant_id: TENANT }] })

      const svc = await loadModule()
      const result = await svc.findAll(TENANT, { page: 1, limit: 20 })

      expect(result.total).toBe(1)
      expect(result.data).toHaveLength(1)
      expect(result.pagination.page).toBe(1)
    })

    it('should filter by status', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] })

      const svc = await loadModule()
      await svc.findAll(TENANT, { status: 'active' })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("t.status = $2"),
        expect.arrayContaining(['active']),
      )
    })
  })

  describe('create', () => {
    it('should insert and return truck', async () => {
      const input = { plate: 'NEW-001', brand: 'Nissan', model: 'Navara', year: 2024 }
      const fakeRow = { id: 2, ...input, tenant_id: TENANT }
      mockQuery.mockResolvedValueOnce({ rows: [fakeRow] })

      const svc = await loadModule()
      const result = await svc.create(TENANT, input)

      expect(result).toMatchObject(fakeRow)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO trucks'),
        expect.arrayContaining([TENANT, 'NEW-001', 'Nissan']),
      )
    })
  })

  describe('update', () => {
    it('should update and return truck', async () => {
      const fakeRow = { id: 1, plate: 'UPD-001', tenant_id: TENANT, brand: 'Ford' }
      mockQuery.mockResolvedValueOnce({ rows: [fakeRow] })

      const svc = await loadModule()
      const result = await svc.update(TENANT, 1, { plate: 'UPD-001' })

      expect(result).toMatchObject(fakeRow)
    })

    it('should throw NotFoundError when update fails', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const svc = await loadModule()
      await expect(svc.update(TENANT, 999, { plate: 'GHOST' })).rejects.toThrow('Truck not found')
    })
  })

  describe('remove', () => {
    it('should delete and return void', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] })

      const svc = await loadModule()
      await expect(svc.remove(TENANT, 1)).resolves.toBeUndefined()
    })

    it('should throw NotFoundError when deleting non-existent', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const svc = await loadModule()
      await expect(svc.remove(TENANT, 999)).rejects.toThrow('Truck not found')
    })
  })
})
