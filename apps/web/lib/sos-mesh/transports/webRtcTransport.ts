/**
 * Offline SOS Mesh — WebRTC Direct Peer DataChannel Transport
 * 
 * Enables physical side-by-side devices (browsers on phones, laptops, tablets)
 * to establish direct peer-to-peer data links over local Wi-Fi, Bluetooth tethering,
 * or direct WebRTC connections without requiring internet relay servers.
 */

import { SOSTransport, TransportResult } from './types';
import { SOSPacket, getOrCreateDeviceId, fromNostrSOSEvent, verifyNostrSOSEvent } from '../sosPacket';
import { packNostrEvent, unpackNostrEvent } from '../nostrEncoder';
import { globalBLERelayEngine } from '../ble/bleRelay';
import { markPacketAsSeen, hasSeenPacket, saveQueuedPacket } from '../indexedDbQueue';

export interface PeerMeshInfo {
  peerId: string;
  connectedAt: number;
  status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';
}

export class WebRtcTransport implements SOSTransport {
  public readonly name = 'BLE_RELAY'; // Acts under peer mesh channel umbrella
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private peerListeners: Set<(peers: PeerMeshInfo[]) => void> = new Set();

  public async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    return typeof RTCPeerConnection !== 'undefined';
  }

  public subscribePeers(listener: (peers: PeerMeshInfo[]) => void): () => void {
    this.peerListeners.add(listener);
    listener(this.getConnectedPeers());
    return () => this.peerListeners.delete(listener);
  }

  public getConnectedPeers(): PeerMeshInfo[] {
    const list: PeerMeshInfo[] = [];
    this.dataChannels.forEach((dc, peerId) => {
      list.push({
        peerId,
        connectedAt: Date.now(),
        status: dc.readyState === 'open' ? 'CONNECTED' : 'CONNECTING',
      });
    });
    return list;
  }

  private notifyPeers() {
    const current = this.getConnectedPeers();
    this.peerListeners.forEach((l) => {
      try { l(current); } catch {}
    });
  }

  /**
   * Generates a WebRTC Offer signaling string (SDP) for pairing with another device.
   */
  public async createOffer(): Promise<{ offerSdp: string; peerId: string }> {
    if (typeof window === 'undefined') throw new Error('SSR Environment');

    const peerId = `PEER-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    const dc = pc.createDataChannel('prahari_mesh', { ordered: true });
    this.setupDataChannel(peerId, dc);

    this.peerConnections.set(peerId, pc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait briefly for ICE candidates gathering
    await new Promise((r) => setTimeout(r, 500));

    const offerSdp = btoa(JSON.stringify(pc.localDescription));
    return { offerSdp, peerId };
  }

  /**
   * Accepts a WebRTC Offer from Phone A, creates an Answer SDP for Phone B.
   */
  public async acceptOffer(offerSdpBase64: string): Promise<{ answerSdp: string; peerId: string }> {
    if (typeof window === 'undefined') throw new Error('SSR Environment');

    const offerDesc = JSON.parse(atob(offerSdpBase64));
    const peerId = `PEER-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.ondatachannel = (evt) => {
      this.setupDataChannel(peerId, evt.channel);
    };

    this.peerConnections.set(peerId, pc);

    await pc.setRemoteDescription(new RTCSessionDescription(offerDesc));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await new Promise((r) => setTimeout(r, 500));

    const answerSdp = btoa(JSON.stringify(pc.localDescription));
    return { answerSdp, peerId };
  }

  /**
   * Phone A completes connection handshake by setting Phone B's Answer SDP.
   */
  public async completeHandshake(peerId: string, answerSdpBase64: string): Promise<boolean> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) return false;

    try {
      const answerDesc = JSON.parse(atob(answerSdpBase64));
      await pc.setRemoteDescription(new RTCSessionDescription(answerDesc));
      return true;
    } catch (err) {
      console.warn('[WebRtcTransport] Failed to complete handshake:', err);
      return false;
    }
  }

  private setupDataChannel(peerId: string, dc: RTCDataChannel) {
    dc.binaryType = 'arraybuffer';
    this.dataChannels.set(peerId, dc);

    dc.onopen = () => {
      console.log(`[WebRtcTransport] Direct WebRTC DataChannel OPENED with ${peerId}`);
      this.notifyPeers();
    };

    dc.onclose = () => {
      console.log(`[WebRtcTransport] WebRTC DataChannel closed with ${peerId}`);
      this.dataChannels.delete(peerId);
      this.peerConnections.delete(peerId);
      this.notifyPeers();
    };

    dc.onmessage = async (event) => {
      try {
        let incomingPacket: SOSPacket | null = null;

        if (event.data instanceof ArrayBuffer) {
          const unpacked = unpackNostrEvent(new Uint8Array(event.data));
          if (unpacked) {
            incomingPacket = fromNostrSOSEvent(unpacked);
          }
        } else if (typeof event.data === 'string') {
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.packet) incomingPacket = parsed.packet;
        }

        if (!incomingPacket) return;

        const currentDeviceId = getOrCreateDeviceId();
        if (incomingPacket.originDeviceId === currentDeviceId) return;

        const alreadySeen = await hasSeenPacket(incomingPacket.packetId);
        if (alreadySeen) return;

        if (incomingPacket.nostrEvent) {
          const isValidSig = verifyNostrSOSEvent(incomingPacket.nostrEvent);
          if (!isValidSig) {
            console.warn('[WebRtcTransport] Dropping packet with invalid Nostr signature:', incomingPacket.packetId);
            return;
          }
        }

        console.log('[WebRtcTransport] Received valid Nostr SOS packet over WebRTC P2P channel:', incomingPacket.packetId);
        await markPacketAsSeen(incomingPacket.packetId);
        await saveQueuedPacket(incomingPacket, 'QUEUED');

        // Relay to global engine and server if online
        await globalBLERelayEngine.handleIncomingPacket(incomingPacket);
      } catch (err) {
        console.error('[WebRtcTransport] Error handling incoming data channel message:', err);
      }
    };
  }

  /**
   * Broadcasts SOS packet directly to all connected physical devices.
   */
  public async send(packet: SOSPacket): Promise<TransportResult> {
    const activeChannels = Array.from(this.dataChannels.values()).filter((dc) => dc.readyState === 'open');

    if (activeChannels.length === 0) {
      return {
        success: false,
        channel: 'BLE_RELAY',
        error: 'No active direct WebRTC peer connections.',
      };
    }

    try {
      let wireBuffer: Uint8Array | null = null;
      if (packet.nostrEvent) {
        wireBuffer = packNostrEvent(packet.nostrEvent);
      }

      const jsonString = JSON.stringify({ type: 'EMERGENCY_SOS_RELAY', packet });

      let sentCount = 0;
      for (const dc of activeChannels) {
        try {
          if (wireBuffer) {
            dc.send(wireBuffer as any);
          } else {
            dc.send(jsonString);
          }
          sentCount++;
        } catch (e) {
          console.warn('[WebRtcTransport] Direct send error:', e);
        }
      }

      return {
        success: sentCount > 0,
        channel: 'BLE_RELAY',
        message: `Nostr SOS packet broadcast to ${sentCount} direct WebRTC peer devices.`,
        incidentId: packet.incidentId,
        transmittedAt: Date.now(),
      };
    } catch (err: any) {
      return {
        success: false,
        channel: 'BLE_RELAY',
        error: err.message || 'Failed to send packet over WebRTC DataChannel.',
      };
    }
  }
}

export const globalWebRtcTransport = new WebRtcTransport();
