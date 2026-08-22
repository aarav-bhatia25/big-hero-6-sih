import { Header } from "@/components/dashboard/header";
import { IncidentList } from "@/components/dashboard/incident-list";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RiskZones } from "@/components/dashboard/risk-zones";
import { Sidebar } from "@/components/dashboard/sidebar";
import { LiveMap } from "@/components/map/live-map";
import { Button } from "@/components/ui/button";
import { metrics } from "@/lib/mock-data";
import { Plus } from "lucide-react";
export default function CommandCenter() { return <div className="flex min-h-screen"><Sidebar/><main className="min-w-0 flex-1"><Header title="Good morning, Ananya" subtitle="Jaipur command center · Friday, 22 August"/><div className="mx-auto max-w-[1600px] p-5 lg:p-8"><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-bold">Safety overview</h2><p className="text-sm text-slate-500">Real-time safety intelligence across your district</p></div><Button><Plus size={16}/> Create incident</Button></div><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <MetricCard key={metric.label} metric={metric}/>)}</section><section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_.85fr]"><div className="overflow-hidden rounded-2xl border bg-white p-3 shadow-panel"><div className="mb-3 px-2"><h2 className="font-bold">Live safety map</h2><p className="text-sm text-slate-500">Tourist locations, active geofences, and alerts</p></div><LiveMap/></div><RiskZones/></section><section className="mt-6 max-w-4xl"><IncidentList/></section></div></main></div>; }
