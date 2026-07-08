import { GpsData } from '../types/index.js';

export interface GpsProvider {
  readonly name: string;

  connect(): Promise<void>;
  disconnect(): Promise<void>;

  getRealtimeData(deviceId: string): Promise<GpsData | null>;
  getHistory(deviceId: string, from: Date, to: Date): Promise<GpsData[]>;

  processWebhook(payload: Record<string, unknown>): Promise<GpsData | null>;
}
