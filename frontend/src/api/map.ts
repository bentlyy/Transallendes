import api from './axios'

export interface MapPosition {
  id: string
  truckId: string
  plate: string
  lat: number
  lng: number
  speed: number
  heading: number
  status: string
  ignition: boolean
  driverName?: string
  lastUpdate: string
}

export interface MapCluster {
  lat: number
  lng: number
  count: number
  statuses: Record<string, number>
}

export async function getMapPositions(params?: { clientId?: string; status?: string; search?: string }): Promise<MapPosition[]> {
  const res = await api.get('/map/positions', { params })
  return res.data
}

export async function getMapClusters(zoom: number): Promise<MapCluster[]> {
  const res = await api.get('/map/clusters', { params: { zoom } })
  return res.data
}

export async function getTruckInfo(truckId: string): Promise<{
  position: MapPosition
  driver: { name: string; phone: string } | null
  currentTrip: { id: string; code: string; origin: string; destination: string } | null
}> {
  const res = await api.get(`/map/trucks/${truckId}`)
  return res.data
}
