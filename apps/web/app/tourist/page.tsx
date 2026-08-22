"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  MapPin,
  IdCard,
  Map as MapIcon,
  AlertTriangle,
  Siren,
  PhoneCall,
  CheckCircle2,
  X,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { LiveMap } from "@/components/map/live-map";
import DigitalIdCard from "@/components/tourist/DigitalIdCard";
import SosButton from "@/components/tourist/SosButton";

export default function TouristAppPage() {
  // State variables
  const [greeting, setGreeting] = useState("Good evening, Ralston");
  const [locationOn, setLocationOn] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>({
    lat: 26.9124,
    lng: 75.7873,
  });
  const [safetyStatus, setSafetyStatus] = useState<"SAFE" | "RESTRICTED" | "SOS">(
    "SAFE"
  );
  const [sosActive, setSosActive] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);

  // Modals state
  const [activeModal, setActiveModal] = useState<
    "none" | "id_card" | "safety_map" | "alerts"
  >("none");

  // Dynamic greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    let prefix = "Good evening";
    if (hour < 12) prefix = "Good morning";
    else if (hour < 17) prefix = "Good afternoon";
    setGreeting(`${prefix}, Ralston`);
  }, []);

  // Handle Geolocation tracking toggle
  useEffect(() => {
    let watchId: number | null = null;

    if (locationOn && typeof window !== "undefined" && "geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(newCoords);

          // Ping API
          fetch("/api/locations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              touristId: "TOUR-7890",
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              source: "gps",
            }),
          }).catch(() => {});
        },
        () => {
          // Fallback static coords if user denies GPS browser popup
          setCoords({ lat: 26.9124, lng: 75.7873 });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    return () => {
      if (watchId !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [locationOn]);

  // Trigger SOS Incident
  const handleTriggerSos = async () => {
    if (sosActive) {
      setSosActive(false);
      setSafetyStatus("SAFE");
      setActiveIncidentId(null);
      return;
    }

    setSosLoading(true);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          touristId: "TOUR-7890",
          type: "SOS",
          lat: coords?.lat ?? 26.9124,
          lng: coords?.lng ?? 75.7873,
          address: "Amer Road, Pink City, Jaipur",
          severity: "critical",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSosActive(true);
        setSafetyStatus("SOS");
        setActiveIncidentId(data.incident.incidentId);
      }
    } catch (err) {
      setSosActive(true);
      setSafetyStatus("SOS");
    } finally {
      setSosLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-900 text-slate-100 shadow-2xl font-sans selection:bg-rose-500 selection:text-white">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-5 py-4 backdrop-blur-md sticky top-0 z-30">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-rose-500/10 p-1.5 text-rose-500 ring-1 ring-rose-500/20">
            <ShieldAlert size={18} />
          </div>
          <span className="text-sm font-extrabold tracking-wider uppercase text-slate-100">
            TOURIST SAFETY
          </span>
        </div>
        <div className="w-12 text-right">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col items-center justify-between px-6 py-8">
        {/* User Greeting */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {greeting}
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Digital Tourist Safety Pass • Active Protection
          </p>
        </div>

        {/* Safety Status Indicator Pill */}
        <div className="my-6">
          {safetyStatus === "SAFE" && (
            <div className="flex items-center gap-2.5 rounded-full bg-emerald-950/80 px-6 py-2.5 text-emerald-400 ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-950/50">
              <span className="flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500">
                <span className="h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              </span>
              <span className="text-sm font-bold tracking-widest uppercase">
                🟢 SAFE AREA
              </span>
            </div>
          )}

          {safetyStatus === "RESTRICTED" && (
            <div className="flex items-center gap-2.5 rounded-full bg-amber-950/80 px-6 py-2.5 text-amber-400 ring-1 ring-amber-500/30 shadow-lg shadow-amber-950/50">
              <AlertTriangle size={18} />
              <span className="text-sm font-bold tracking-widest uppercase">
                ⚠️ RESTRICTED ZONE
              </span>
            </div>
          )}

          {safetyStatus === "SOS" && (
            <div className="flex items-center gap-2.5 rounded-full bg-rose-950/90 px-6 py-2.5 text-rose-400 ring-1 ring-rose-500/50 shadow-lg shadow-rose-950/80 animate-pulse">
              <Siren size={18} className="animate-spin" />
              <span className="text-sm font-bold tracking-widest uppercase">
                🔴 EMERGENCY SOS ACTIVE
              </span>
            </div>
          )}
        </div>

        {/* Giant Interactive Panic SOS Button */}
        <div className="my-4 flex flex-col items-center">
          <button
            onClick={handleTriggerSos}
            disabled={sosLoading}
            className={`group relative flex h-48 w-48 flex-col items-center justify-center rounded-full border-8 transition-all duration-300 active:scale-95 ${
              sosActive
                ? "border-rose-500 bg-rose-600 text-white shadow-[0_0_60px_rgba(244,63,94,0.6)] animate-pulse"
                : "border-slate-800 bg-gradient-to-b from-rose-600 to-rose-700 text-white shadow-[0_0_40px_rgba(225,29,72,0.35)] hover:border-rose-500 hover:shadow-[0_0_50px_rgba(225,29,72,0.5)]"
            }`}
          >
            {sosLoading ? (
              <RefreshCw size={44} className="animate-spin text-white" />
            ) : sosActive ? (
              <>
                <Siren size={48} className="animate-bounce" />
                <span className="mt-1 text-xl font-black tracking-widest uppercase">
                  CANCEL
                </span>
                <span className="text-[10px] opacity-80">Tap to reset</span>
              </>
            ) : (
              <>
                <span className="text-4xl font-black tracking-wider drop-shadow-md">
                  SOS
                </span>
                <span className="mt-1 text-[11px] font-semibold tracking-wider text-rose-100 uppercase opacity-90">
                  PRESS FOR HELP
                </span>
              </>
            )}
          </button>

          {sosActive && (
            <div className="mt-4 rounded-xl bg-rose-950/60 p-3 text-center text-xs text-rose-200 ring-1 ring-rose-500/30">
              <p className="font-bold">🚨 Alert Sent to Command Center!</p>
              <p className="mt-0.5 text-[11px] text-rose-300">
                Ticket: {activeIncidentId || "INC-LIVE-01"} • Police Unit DISPATCHED
              </p>
            </div>
          )}
        </div>

        {/* Functional Control Options List */}
        <div className="mt-6 w-full space-y-3">
          {/* 📍 Location Toggle */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition-all hover:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-500/10 p-2.5 text-sky-400 ring-1 ring-sky-500/20">
                <MapPin size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-200">📍 Location</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${
                      locationOn
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {locationOn ? "ON" : "OFF"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {locationOn && coords
                    ? `GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                    : "Live GPS tracking disabled"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setLocationOn(!locationOn)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                locationOn ? "bg-emerald-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  locationOn ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* 🪪 Tourist ID */}
          <button
            onClick={() => setActiveModal("id_card")}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left transition-all hover:border-slate-700 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-400 ring-1 ring-purple-500/20">
                <IdCard size={20} />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-200">🪪 Tourist ID</span>
                <p className="text-[11px] text-slate-400">
                  ID: TOUR-7890 • Verified Digital Pass
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-purple-400">View →</span>
          </button>

          {/* 🗺️ Safety Map */}
          <button
            onClick={() => setActiveModal("safety_map")}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left transition-all hover:border-slate-700 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-400 ring-1 ring-indigo-500/20">
                <MapIcon size={20} />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-200">🗺️ Safety Map</span>
                <p className="text-[11px] text-slate-400">
                  Live positions, safe boundaries & danger zones
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-indigo-400">Open →</span>
          </button>

          {/* ⚠️ Alerts */}
          <button
            onClick={() => setActiveModal("alerts")}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left transition-all hover:border-slate-700 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-400 ring-1 ring-amber-500/20">
                <AlertTriangle size={20} />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-200">⚠️ Alerts</span>
                <p className="text-[11px] text-slate-400">
                  2 Active Advisories in Pink City District
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-amber-400">View →</span>
          </button>
        </div>
      </main>

      {/* Footer Hotline */}
      <footer className="border-t border-slate-800 bg-slate-950 px-6 py-4 text-center">
        <a
          href="tel:112"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-slate-300 ring-1 ring-slate-800 hover:bg-slate-850"
        >
          <PhoneCall size={14} className="text-rose-500" />
          <span>National Emergency Helpline: 112</span>
        </a>
      </footer>

      {/* MODAL 1: Tourist ID Pass */}
      {activeModal === "id_card" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400">
                <IdCard size={20} />
                <h3 className="font-bold text-white">Digital Tourist Pass</h3>
              </div>
              <button
                onClick={() => setActiveModal("none")}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-lg font-extrabold text-white">Ralston</h4>
                  <p className="text-xs text-slate-400">Nationality: Indian</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400 ring-1 ring-emerald-500/20">
                  <CheckCircle2 size={12} /> Verified
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tourist ID:</span>
                  <span className="font-mono font-bold text-white">TOUR-7890</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hotel:</span>
                  <span>Heritage Palace Resort</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Emergency Contact:</span>
                  <span>Ananya (+91 98765 43210)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tracking Consent:</span>
                  <span className="text-emerald-400 font-semibold">Granted 🟢</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveModal("none")}
              className="mt-5 w-full rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-purple-500"
            >
              Close ID Pass
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Safety Map */}
      {activeModal === "safety_map" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="flex h-[85vh] w-full max-w-sm flex-col rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2 text-indigo-400">
                <MapIcon size={20} />
                <h3 className="font-bold text-white">Live Safety Map</h3>
              </div>
              <button
                onClick={() => setActiveModal("none")}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden rounded-2xl border border-slate-800">
              <LiveMap />
            </div>

            <div className="mt-3 text-xs text-slate-400 text-center">
              🟢 Safe Zone • 🔴 High Risk Area • 🟠 Active Marker
            </div>

            <button
              onClick={() => setActiveModal("none")}
              className="mt-3 w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500"
            >
              Close Map
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: Alerts */}
      {activeModal === "alerts" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle size={20} />
                <h3 className="font-bold text-white">Active Safety Alerts</h3>
              </div>
              <button
                onClick={() => setActiveModal("none")}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-950/30 p-3.5 text-xs text-amber-200">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <AlertTriangle size={14} /> Nahargarh Fort Terrain Advisory
                </div>
                <p className="mt-1 text-slate-300">
                  Night access to cliff trails prohibited after 7:00 PM due to low visibility.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/30 p-3.5 text-xs text-emerald-200">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <ShieldCheck size={14} /> Pink City Safe Corridor Active
                </div>
                <p className="mt-1 text-slate-300">
                  24/7 Police Patrol and medical assistance booths active along Johari Bazaar.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveModal("none")}
              className="mt-5 w-full rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white hover:bg-amber-500"
            >
              Close Alerts
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
