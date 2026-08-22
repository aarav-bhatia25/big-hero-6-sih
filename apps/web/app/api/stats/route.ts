import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getDashboardStats();
    if (!stats) {
      // Supabase unreachable/unconfigured — report zeros rather than inventing numbers.
      return NextResponse.json({
        success: false,
        stats: { activeTourists: 0, liveIncidents: 0, highRiskZones: 0, respondersAvailable: 0, respondersTotal: 0 },
      });
    }
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
