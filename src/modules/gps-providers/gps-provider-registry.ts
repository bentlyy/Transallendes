import type { GpsProvider } from '../../shared/gps-provider.interface.js';
import type { GpsData } from '../../types/index.js';

export class GpsProviderRegistry {
  private providers = new Map<string, GpsProvider>();

  register(provider: GpsProvider): void {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): GpsProvider | undefined {
    return this.providers.get(name);
  }

  getAllProviders(): GpsProvider[] {
    return Array.from(this.providers.values());
  }

  async getRealtimeDataFromAll(deviceId: string): Promise<Map<string, GpsData | null>> {
    const results = new Map<string, GpsData | null>();

    for (const [name, provider] of this.providers) {
      try {
        const data = await provider.getRealtimeData(deviceId);
        results.set(name, data);
      } catch {
        results.set(name, null);
      }
    }

    return results;
  }

  async connectAll(): Promise<void> {
    for (const provider of this.providers.values()) {
      await provider.connect();
    }
  }

  async disconnectAll(): Promise<void> {
    for (const provider of this.providers.values()) {
      await provider.disconnect();
    }
  }
}

export const gpsProviderRegistry = new GpsProviderRegistry();
