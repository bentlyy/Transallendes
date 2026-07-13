import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPoolQuery = vi.fn()
vi.mock('../../../../src/shared/db.js', () => ({
  pool: { query: (...args: unknown[]) => mockPoolQuery(...args) },
}))

const TENANT = 'tenant-1'

beforeEach(() => {
  vi.clearAllMocks()
})

async function loadModule() {
  return import('../../../../src/modules/trips/trips.service.js')
}

describe('TripsService', () => {
  describe('findById', () => {
    it('should return trip when found', async () => {
      const fakeTrip = { id: 1, trip_number: 'TMS-001', tenant_id: TENANT }
      mockPoolQuery.mockResolvedValueOnce({ rows: [fakeTrip] })

      const svc = await loadModule()
      const result = await svc.findById(TENANT, 1)

      expect(result).toEqual(fakeTrip)
    })

    it('should throw NotFoundError when not found', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] })

      const svc = await loadModule()
      await expect(svc.findById(TENANT, 999)).rejects.toThrow('Trip with id 999 not found')
    })
  })

  describe('findAll', () => {
    it('should return paginated results', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] })

      const svc = await loadModule()
      const result = await svc.findAll(TENANT, { page: 1, limit: 25 })

      expect(result.total).toBe(2)
      expect(result.data).toHaveLength(2)
    })

    it('should apply status filter', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] })

      const svc = await loadModule()
      await svc.findAll(TENANT, { status: 'in_progress' })

      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining("t.status = $2"),
        expect.arrayContaining(['in_progress']),
      )
    })
  })

  describe('create', () => {
    it('should insert trip and return it', async () => {
      const input = {
        origin_city: 'Santiago',
        destination_city: 'Valparaíso',
        client_id: 1,
      }
      const fakeTrip = { id: 1, trip_number: 'TMS-20260401-1234', ...input, tenant_id: TENANT }
      mockPoolQuery.mockResolvedValueOnce({ rows: [fakeTrip] })

      const svc = await loadModule()
      const result = await svc.create(TENANT, input)

      expect(result.trip_number).toBeDefined()
      expect(result.origin_city).toBe('Santiago')
    })
  })

  describe('remove', () => {
    it('should delete and return void', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] })

      const svc = await loadModule()
      await expect(svc.remove(TENANT, 1)).resolves.toBeUndefined()
    })

    it('should throw NotFoundError when not found', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] })

      const svc = await loadModule()
      await expect(svc.remove(TENANT, 999)).rejects.toThrow('Trip with id 999 not found')
    })
  })

  describe('getStats', () => {
    it('should return aggregated stats', async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{
          total: 10,
          planned: 3,
          in_progress: 2,
          completed: 4,
          cancelled: 1,
          delayed: 0,
          avg_distance: 150.5,
          avg_duration: 4.2,
        }],
      })

      const svc = await loadModule()
      const stats = await svc.getStats(TENANT)

      expect(stats.total).toBe(10)
      expect(stats.inProgress).toBe(2)
      expect(stats.completed).toBe(4)
      expect(stats.avgDistance).toBe(150.5)
    })
  })
})
