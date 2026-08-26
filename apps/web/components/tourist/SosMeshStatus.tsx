'use client';

import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Radio,
  HardDrive,
  RefreshCw,
  Layers,
  Play,
  CheckCircle2,
  AlertTriangle,
  Send,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';

import { globalSOSStateMachine, SOSStateChangeEvent } from '@/lib/sos-mesh/sosStateMachine';
import { globalTransportManager } from '@/lib/sos-mesh/transports/transportManager';
import { globalBLERelayEngine } from '@/lib/sos-mesh/ble/bleRelay';
import { globalMeshSimulator, SimulationStep } from '@/lib/sos-mesh/demo/meshSimulator';
import { getAllQueuedPackets, QueuedPacketRecord } from '@/lib/sos-mesh/indexedDbQueue';

interface SosMeshStatusProps {
  touristId?: string;
  touristPos?: { lat: number; lng: number };
  onIncidentDelivered?: (incident: any) => void;
}

export default function SosMeshStatus({ touristId, touristPos, onIncidentDelivered }: SosMeshStatusProps) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [lastEvent, setLastEvent] = useState<SOSStateChangeEvent | undefined>(
    globalSOSStateMachine.getLastEvent()
  );
  const [relayEnabled, setRelayEnabled] = useState<boolean>(true);
  const [queuedPackets, setQueuedPackets] = useState<QueuedPacketRecord[]>([]);
  const [isFlushing, setIsFlushing] = useState<boolean>(false);
  const [demoRunning, setDemoRunning] = useState<boolean>(false);
  const [demoSteps, setDemoSteps] = useState<SimulationStep[]>([]);
  const [showDemoLog, setShowDemoLog] = useState<boolean>(false);

  const fetchQueue = async () => {
    try {
      const records = await getAllQueuedPackets();
      setQueuedPackets(records);
    } catch {
      setQueuedPackets([]);
    }
  };

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const handleOnline = () => {
      setIsOnline(true);
      void fetchQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribeSM = globalSOSStateMachine.subscribe((event) => {
      setLastEvent(event);
      void fetchQueue();
    });

    const unsubscribeSim = globalMeshSimulator.subscribe(() => {
      setDemoSteps(globalMeshSimulator.getLog());
    });

    void fetchQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeSM();
      unsubscribeSim();
    };
  }, []);

  const toggleRelayMode = () => {
    const next = !relayEnabled;
    setRelayEnabled(next);
    globalBLERelayEngine.setRelayActive(next);
  };

  const handleManualFlush = async () => {
    setIsFlushing(true);
    try {
      await globalTransportManager.flushQueuedPackets();
      await fetchQueue();
    } finally {
      setIsFlushing(false);
    }
  };

  const runDemoSimulation = async () => {
    setDemoRunning(true);
    setShowDemoLog(true);
    try {
      const result = await globalMeshSimulator.runFullDemoSequence({
        touristId: touristId || 'TOUR-7890',
        latitude: touristPos?.lat || 19.0728,
        longitude: touristPos?.lng || 72.8997,
      });

      if (result.success && result.incidentId) {
        onIncidentDelivered?.({
          incidentId: result.incidentId,
          type: 'PANIC',
          location: { lat: touristPos?.lat || 19.0728, lng: touristPos?.lng || 72.8997 },
          transportType: 'BLE_RELAY',
          hopCount: 2,
        });
      }
    } finally {
      setDemoRunning(false);
      void fetchQueue();
    }
  };

  const currentState = lastEvent?.currentState || 'IDLE';

  return (
    <section className="minimal-card p-6 text-ink">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
            <Radio className="size-5 text-sky-400 animate-pulse" /> Offline SOS Mesh & Relay
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            Store-and-forward emergency transport channel with peer relay & offline queuing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
              isOnline
                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                : 'border-amber-400/40 bg-amber-500/10 text-amber-300'
            }`}
          >
            {isOnline ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
            {isOnline ? 'INTERNET ONLINE' : 'OFFLINE MODE'}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Status Card 1: Channel Status */}
        <div className="rounded-xl border border-line bg-surface-2 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-ink-soft">Transport Priority</div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-sm font-semibold text-sky-300">
              {isOnline ? '1. Internet Gateway' : '2. BLE Peer Relay'}
            </span>
            <span className="text-xs text-ink-soft">
              {isOnline ? 'Direct REST API' : 'Store & Forward'}
            </span>
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            {isOnline
              ? 'SOS dispatches directly to Police Command endpoint.'
              : 'SOS is persisted locally and broadcasted to nearby tourist relay nodes.'}
          </p>
        </div>

        {/* Status Card 2: Queue Store */}
        <div className="rounded-xl border border-line bg-surface-2 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-soft">IndexedDB Queue</span>
            <HardDrive className="size-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold text-ink">{queuedPackets.length}</span>
            <span className="text-xs text-ink-soft">queued packet{queuedPackets.length === 1 ? '' : 's'}</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-ink-soft">Survives page refresh</span>
            {queuedPackets.length > 0 && isOnline && (
              <button
                onClick={handleManualFlush}
                disabled={isFlushing}
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:underline disabled:opacity-50"
              >
                <RefreshCw className={`size-3 ${isFlushing ? 'animate-spin' : ''}`} />
                {isFlushing ? 'Syncing...' : 'Sync queue now'}
              </button>
            )}
          </div>
        </div>

        {/* Status Card 3: Relay Mode */}
        <div className="rounded-xl border border-line bg-surface-2 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-soft">Emergency Relay Beacon</span>
            <ShieldCheck className="size-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-sm font-semibold ${relayEnabled ? 'text-emerald-300' : 'text-slate-400'}`}>
              {relayEnabled ? 'RELAY ACTIVE' : 'RELAY PAUSED'}
            </span>
            <button
              onClick={toggleRelayMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                relayEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
              aria-label="Toggle Emergency Relay Mode"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  relayEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            Safely relays emergency packets from nearby victims without revealing your private KYC data.
          </p>
        </div>
      </div>

      {/* State Machine Transition Banner */}
      {lastEvent && currentState !== 'IDLE' && (
        <div className="mt-4 rounded-xl border border-sky-400/30 bg-sky-400/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-400/20 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-sky-300" />
              <span className="text-xs font-medium uppercase tracking-wider text-sky-300">
                SOS State Machine: {currentState}
              </span>
            </div>
            {lastEvent.hopCount !== undefined && (
              <span className="rounded-full bg-sky-400/20 px-2.5 py-0.5 font-mono text-xs font-semibold text-sky-200">
                Hop count: {lastEvent.hopCount}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-sky-100">{lastEvent.message || `Current state: ${currentState}`}</p>
        </div>
      )}

      {/* Interactive Evaluator Demo Controller */}
      <div className="mt-6 rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Play className="size-4 text-amber-400" /> Multi-Hop Mesh Relay Simulator (Evaluator Mode)
            </h4>
            <p className="mt-0.5 text-xs text-ink-soft">
              Simulates: Tourist A (Offline SOS) ➔ Tourist B (Offline Relay) ➔ Tourist C (Online Gateway) ➔ Police Dashboard.
            </p>
          </div>
          <button
            onClick={runDemoSimulation}
            disabled={demoRunning}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-400/60 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50 transition"
          >
            {demoRunning ? <RefreshCw className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            {demoRunning ? 'Simulating hops...' : 'Run A ➔ B ➔ Police Demo'}
          </button>
        </div>

        {/* Live Simulation Steps Log */}
        {showDemoLog && demoSteps.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-line pt-3 text-xs">
            {demoSteps.map((step) => (
              <div
                key={step.stepIndex}
                className="flex items-start gap-2.5 rounded-lg border border-line bg-surface-2 p-2.5 font-mono"
              >
                <span className="rounded bg-sky-500/20 px-1.5 py-0.5 font-bold text-sky-300">
                  Step {step.stepIndex}
                </span>
                <span className="flex-1 text-ink">{step.log}</span>
                {step.status === 'GATEWAY_DELIVERED' && (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                )}
                {step.status === 'TRANSFERRED' && (
                  <Smartphone className="size-4 shrink-0 text-amber-400" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
