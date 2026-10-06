import type { GpsProvider } from '../../../shared/gps-provider.interface.js'
import type { GpsData } from '../../../types/index.js'

// Santiago, Chile approximate center
const SANTIAGO_LAT = -33.4489
const SANTIAGO_LNG = -70.6693

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function generateFakeGpsData(deviceId: string): GpsData {
  const lat = SANTIAGO_LAT + randomInRange(-0.05, 0.05)
  const lng = SANTIAGO_LNG + randomInRange(-0.05, 0.05)
  const speed = Math.random() * 80
  const ignition = speed > 1

  return {
    device_id: deviceId,
    lat,
    lng,
    speed: Math.round(speed * 10) / 10,
    heading: Math.round(randomInRange(0, 360)),
    altitude: Math.round(randomInRange(400, 700)),
    accuracy: Math.round(randomInRange(3, 15)),
    timestamp: new Date().toISOString(),
    ignition,
    odometer: Math.round(randomInRange(50000, 150000)),
    fuel_level: Math.round(randomInRange(10, 100)),
    battery_voltage: Math.round(randomInRange(11.5, 13.0) * 10) / 10,
    engine_status: ignition ? 'running' : 'off',
    extra: {
      provider: 'mock',
      simulation: true,
    },
  }
}

export class MockGpsProvider implements GpsProvider {
  readonly name = 'mock'
  private connected = false

  async connect(): Promise<void> {
    this.connected = true
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  async getRealtimeData(deviceId: string): Promise<GpsData | null> {
    if (!this.connected) throw new Error('MockGpsProvider is not connected')
    return generateFakeGpsData(deviceId)
  }

  async getHistory(deviceId: string, from: Date, to: Date): Promise<GpsData[]> {
    if (!this.connected) throw new Error('MockGpsProvider is not connected')
    const points: GpsData[] = []
    const intervalMs = 60000
    let current = new Date(from.getTime())

    while (current <= to) {
      points.push({
        ...generateFakeGpsData(deviceId),
        timestamp: current.toISOString(),
      })
      current = new Date(current.getTime() + intervalMs)
    }

    return points
  }

  async processWebhook(payload: Record<string, unknown>): Promise<GpsData | null> {
    return payload as unknown as GpsData
  }
}
