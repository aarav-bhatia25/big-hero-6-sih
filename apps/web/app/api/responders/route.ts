import { NextResponse } from "next/server";
import { listResponders } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const responders = await listResponders();
    return NextResponse.json({ success: true, responders });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
