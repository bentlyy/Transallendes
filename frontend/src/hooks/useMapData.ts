import { useState, useEffect, useRef } from 'react'
import { getMapPositions, getMapClusters, type MapPosition, type MapCluster } from '@/api/map'
import { MAP } from '@/utils/constants'

interface UseMapDataOptions {
  clientId?: string
  status?: string
  search?: string
  zoom?: number
  enabled?: boolean
}

export function useMapData(options: UseMapDataOptions = {}) {
  const [positions, setPositions] = useState<MapPosition[]>([])
  const [clusters, setClusters] = useState<MapCluster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => {
    async function fetchData() {
      try {
        const [posData, clusterData] = await Promise.all([
          getMapPositions({
            clientId: options.clientId,
            status: options.status,
            search: options.search,
          }),
          options.zoom ? getMapClusters(options.zoom) : Promise.resolve([]),
        ])
        setPositions(posData)
        setClusters(clusterData)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al obtener los datos del mapa')
      } finally {
        setLoading(false)
      }
    }

    if (options.enabled !== false) {
      fetchData()
      intervalRef.current = setInterval(fetchData, MAP.REFRESH_INTERVAL)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [options.clientId, options.status, options.search, options.zoom, options.enabled])

  return { positions, clusters, loading, error }
}
