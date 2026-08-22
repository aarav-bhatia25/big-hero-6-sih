"use client";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

export function LiveMap() { const ref = useRef<HTMLDivElement>(null); useEffect(() => { if (!ref.current) return; const map = new maplibregl.Map({ container: ref.current, style: "https://tiles.openfreemap.org/styles/liberty", center: [75.7873, 26.9124], zoom: 12 }); map.addControl(new maplibregl.NavigationControl(), "top-right"); const markers = [{ coords: [75.825, 26.985] as [number, number], color: "#f97316" }, { coords: [75.816, 26.924] as [number, number], color: "#ef4444" }, { coords: [75.77, 26.92] as [number, number], color: "#eab308" }]; markers.forEach(({ coords, color }) => new maplibregl.Marker({ color }).setLngLat(coords).setPopup(new maplibregl.Popup().setText("Live safety signal")).addTo(map)); return () => map.remove(); }, []); return <div ref={ref} className="h-[380px] w-full overflow-hidden rounded-2xl" aria-label="Live safety map of Jaipur" />; }
