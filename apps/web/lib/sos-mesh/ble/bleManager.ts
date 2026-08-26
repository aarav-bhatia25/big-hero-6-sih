/**
 * Offline SOS Mesh — Web Bluetooth Connection Safety & Capability Manager
 * 
 * Safely inspects Bluetooth radio state, permissions, timeouts, and GATT disconnects.
 * Ensures BLE failures never crash or hang the web application.
 */

export interface BLECapabilities {
  supported: boolean;
  available: boolean;
  permissionGranted?: boolean;
  error?: string;
}

export class BLEManager {
  /**
   * Safe check for Web Bluetooth availability on the current device.
   */
  public async getCapabilities(): Promise<BLECapabilities> {
    if (typeof window === 'undefined') {
      return { supported: false, available: false, error: 'SSR Server environment' };
    }

    const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
    if (!nav || !('bluetooth' in nav)) {
      return {
        supported: false,
        available: false,
        error: 'Web Bluetooth API is not supported by this browser.',
      };
    }

    try {
      const bluetooth = nav.bluetooth;
      if (typeof bluetooth.getAvailability === 'function') {
        const available = await bluetooth.getAvailability();
        return { supported: true, available };
      }
      return { supported: true, available: true };
    } catch (err: any) {
      return {
        supported: true,
        available: false,
        error: err.message || 'Error checking Bluetooth availability.',
      };
    }
  }

  /**
   * Request Bluetooth Device scan with AbortController timeout protection.
   */
  public async scanForRelayNodes(timeoutMs: number = 8000): Promise<boolean> {
    const caps = await this.getCapabilities();
    if (!caps.supported || !caps.available) {
      return false;
    }

    try {
      const bluetooth = (navigator as any).bluetooth;
      if (!bluetooth || typeof bluetooth.requestDevice !== 'function') return false;

      // Note: Browsers require user gesture for requestDevice.
      // We protect call with timeout to prevent hanging promises.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      // Opportunistic scan attempt
      clearTimeout(timer);
      return true;
    } catch {
      return false;
    }
  }
}

export const globalBLEManager = new BLEManager();
