import type { GpsProvider } from '../../../shared/gps-provider.interface.js';
import type { GpsData } from '../../../types/index.js';

interface WialonConfig {
  baseUrl: string;
  token: string;
}

function normalizeWialonToGpsData(raw: Record<string, unknown>): GpsData {
  return {
    device_id: String(raw.imei ?? raw.id ?? ''),
    lat: Number(raw.lat ?? raw.latitude ?? 0),
    lng: Number(raw.lng ?? raw.longitude ?? 0),
    altitude: raw.altitude ? Number(raw.altitude) : undefined,
    speed: raw.speed ? Number(raw.speed) : undefined,
    heading: raw.course ?? raw.heading ? Number(raw.course ?? raw.heading) : undefined,
    accuracy: raw.accuracy ? Number(raw.accuracy) : undefined,
    timestamp: raw.timestamp ? String(raw.timestamp) : new Date().toISOString(),
    ignition: raw.ignition ? Boolean(raw.ignition) : undefined,
    odometer: raw.odometer ? Number(raw.odometer) : undefined,
    fuel_level: raw.fuel_level ? Number(raw.fuel_level) : undefined,
    battery_voltage: raw.battery_voltage ? Number(raw.battery_voltage) : undefined,
    engine_status: raw.engine_status ? String(raw.engine_status) : undefined,
    extra: raw,
  };
}

export class WialonGpsProvider implements GpsProvider {
  readonly name = 'wialon';
  private config: WialonConfig;
  private connected = false;
  private sessionId?: string;

  constructor(config: WialonConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // TODO: Implement Wialon API login
    // POST /token/login with config.token
    // Store returned session ID (eid / SID)
    // this.sessionId = response.eid;
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    // TODO: Implement Wialon API logout
    // POST /token/logout with sessionId
    this.sessionId = undefined;
    this.connected = false;
  }

  async getRealtimeData(deviceId: string): Promise<GpsData | null> {
    if (!this.connected) throw new Error('WialonGpsProvider is not connected');

    // TODO: Implement real Wialon API call
    // POST /ajax/exec with params { action: 'unit/get_last_data', params: { ... } }
    // const response = await fetch(`${this.config.baseUrl}/ajax/exec`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //       params: { ... },
    //       sid: this.sessionId,
    //   }),
    // });
    // const data = await response.json();

    return null;
  }

  async getHistory(deviceId: string, from: Date, to: Date): Promise<GpsData[]> {
    if (!this.connected) throw new Error('WialonGpsProvider is not connected');

    // TODO: Implement Wialon history retrieval
    // POST /ajax/exec with params { action: 'unit/get_messages', params: { ... } }
    // const response = await fetch(`${this.config.baseUrl}/ajax/exec`, { ... });
    // const data = await response.json();
    // return data.messages.map(normalizeWialonToGpsData);

    return [];
  }

  async processWebhook(payload: Record<string, unknown>): Promise<GpsData | null> {
    return normalizeWialonToGpsData(payload);
  }
}
