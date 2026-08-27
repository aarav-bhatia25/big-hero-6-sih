/**
 * Offline SOS Mesh — Transport Layer Abstractions
 */

import { SOSPacket } from '../sosPacket';

export type TransportChannel = 'INTERNET' | 'BLE_RELAY' | 'LOCAL_QUEUE';

export interface TransportResult {
  success: boolean;
  channel: TransportChannel;
  message?: string;
  incidentId?: string;
  incidentRecord?: any;
  error?: string;
  transmittedAt?: number;
}

export interface SOSTransport {
  name: TransportChannel;
  isAvailable(): Promise<boolean>;
  send(packet: SOSPacket): Promise<TransportResult>;
}
