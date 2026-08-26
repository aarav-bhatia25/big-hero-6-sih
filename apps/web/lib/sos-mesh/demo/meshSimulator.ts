/**
 * Offline SOS Mesh — Evaluator Demo & Multi-Node Simulator
 * 
 * Provides an interactive, step-by-step multi-hop simulation for evaluators to test
 * the full `Tourist A (Offline SOS) → Tourist B (Relay) → Gateway → Police Dashboard` flow.
 */

import { SOSPacket, createSOSPacket, incrementPacketHop } from '../sosPacket';
import { globalBLERelayEngine } from '../ble/bleRelay';

export interface SimulatedNode {
  id: string;
  name: string;
  role: 'ORIGIN' | 'RELAY' | 'GATEWAY';
  online: boolean;
  batteryLevel: number;
  packetsReceived: string[];
}

export interface SimulationStep {
  stepIndex: number;
  fromNodeId: string;
  toNodeId: string;
  packet: SOSPacket;
  status: 'PENDING' | 'TRANSFERRED' | 'GATEWAY_DELIVERED' | 'FAILED';
  timestamp: number;
  log: string;
}

export class MeshSimulator {
  private nodes: Map<string, SimulatedNode> = new Map();
  private simulationLog: SimulationStep[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.resetNodes();
    if (typeof window !== 'undefined') {
      (window as any).__PRAHARI_MESH_SIMULATOR__ = this;
    }
  }

  public resetNodes() {
    this.nodes.clear();
    this.simulationLog = [];

    this.addNode({ id: 'NODE-A', name: 'Tourist A (Victim)', role: 'ORIGIN', online: false, batteryLevel: 85, packetsReceived: [] });
    this.addNode({ id: 'NODE-B', name: 'Tourist B (Relay)', role: 'RELAY', online: false, batteryLevel: 92, packetsReceived: [] });
    this.addNode({ id: 'NODE-C', name: 'Tourist C (Gateway)', role: 'GATEWAY', online: true, batteryLevel: 78, packetsReceived: [] });
    this.notify();
  }

  public addNode(node: SimulatedNode) {
    this.nodes.set(node.id, node);
  }

  public getNodes(): SimulatedNode[] {
    return Array.from(this.nodes.values());
  }

  public getLog(): SimulationStep[] {
    return this.simulationLog;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => {
      try { l(); } catch {}
    });
  }

  /**
   * Runs complete automated multi-hop simulation sequence:
   * 1. Tourist A (Offline) creates SOS.
   * 2. SOS transferred over BLE to Tourist B (Offline).
   * 3. Tourist B transfers packet to Tourist C (Online Gateway).
   * 4. Tourist C posts packet to Police Backend API.
   */
  public async runFullDemoSequence(params: {
    touristId: string;
    latitude: number;
    longitude: number;
  }): Promise<{ success: boolean; incidentId: string; log: SimulationStep[] }> {
    this.resetNodes();

    // 1. Create origin packet on Tourist A
    const originPacket = createSOSPacket({
      touristId: params.touristId,
      latitude: params.latitude,
      longitude: params.longitude,
      originDeviceId: 'NODE-A',
      type: 'PANIC',
      severity: 'CRITICAL',
    });

    const step1: SimulationStep = {
      stepIndex: 1,
      fromNodeId: 'NODE-A',
      toNodeId: 'NODE-A',
      packet: originPacket,
      status: 'PENDING',
      timestamp: Date.now(),
      log: '🚨 Emergency SOS triggered on Tourist A (NO INTERNET). Local packet generated.',
    };
    this.simulationLog.push(step1);
    this.notify();

    await new Promise((r) => setTimeout(r, 600));

    // 2. Hop 1: Node A -> Node B (BLE Relay)
    const hop1Packet = incrementPacketHop(originPacket, 'NODE-B', 'BLE_RELAY');
    const nodeB = this.nodes.get('NODE-B');
    if (nodeB) nodeB.packetsReceived.push(hop1Packet.packetId);

    const step2: SimulationStep = {
      stepIndex: 2,
      fromNodeId: 'NODE-A',
      toNodeId: 'NODE-B',
      packet: hop1Packet,
      status: 'TRANSFERRED',
      timestamp: Date.now(),
      log: '🔵 BLE Relay: Packet transferred from Tourist A ➔ Tourist B (Hops: 1). Securely stored in B\'s queue.',
    };
    this.simulationLog.push(step2);
    this.notify();

    await new Promise((r) => setTimeout(r, 700));

    // 3. Hop 2: Node B -> Node C (Online Gateway)
    const hop2Packet = incrementPacketHop(hop1Packet, 'NODE-C', 'BLE_RELAY');
    const nodeC = this.nodes.get('NODE-C');
    if (nodeC) nodeC.packetsReceived.push(hop2Packet.packetId);

    const step3: SimulationStep = {
      stepIndex: 3,
      fromNodeId: 'NODE-B',
      toNodeId: 'NODE-C',
      packet: hop2Packet,
      status: 'TRANSFERRED',
      timestamp: Date.now(),
      log: '🔵 BLE Relay: Packet transferred from Tourist B ➔ Tourist C (Hops: 2). Tourist C has active internet!',
    };
    this.simulationLog.push(step3);
    this.notify();

    await new Promise((r) => setTimeout(r, 800));

    // 4. Node C uploads packet to police API endpoint
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: hop2Packet.type,
          touristId: hop2Packet.touristId,
          location: { lat: hop2Packet.latitude, lng: hop2Packet.longitude },
          severity: hop2Packet.severity,
          status: 'ACTIVE',
          transportType: 'BLE_RELAY',
          hopCount: hop2Packet.hopCount,
          originDeviceId: hop2Packet.originDeviceId,
          originalTimestamp: new Date(hop2Packet.timestamp).toISOString(),
          relayPath: hop2Packet.relayPath,
          packetId: hop2Packet.packetId,
          incidentId: hop2Packet.incidentId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const step4: SimulationStep = {
          stepIndex: 4,
          fromNodeId: 'NODE-C',
          toNodeId: 'POLICE-BACKEND',
          packet: hop2Packet,
          status: 'GATEWAY_DELIVERED',
          timestamp: Date.now(),
          log: `✓ Gateway Upload Complete! Police Command Dashboard notified. Incident ID: ${data.incident?.incidentId || hop2Packet.incidentId}.`,
        };
        this.simulationLog.push(step4);
        this.notify();

        return { success: true, incidentId: data.incident?.incidentId || hop2Packet.incidentId, log: this.simulationLog };
      } else {
        throw new Error(data?.error || 'Police API returned error.');
      }
    } catch (err: any) {
      const failedStep: SimulationStep = {
        stepIndex: 4,
        fromNodeId: 'NODE-C',
        toNodeId: 'POLICE-BACKEND',
        packet: hop2Packet,
        status: 'FAILED',
        timestamp: Date.now(),
        log: `⚠ Gateway upload error: ${err.message}. Packet remains safely queued on Tourist C.`,
      };
      this.simulationLog.push(failedStep);
      this.notify();
      return { success: false, incidentId: hop2Packet.incidentId, log: this.simulationLog };
    }
  }

  public receivePacket(packet: SOSPacket) {
    void globalBLERelayEngine.handleIncomingPacket(packet);
  }
}

export const globalMeshSimulator = new MeshSimulator();
