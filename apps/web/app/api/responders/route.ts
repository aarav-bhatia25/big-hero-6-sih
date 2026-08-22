import { NextRequest, NextResponse } from "next/server";
import { listResponders } from "@/lib/db";
import { requireAuth } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['authority', 'admin', 'responder']);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const responders = await listResponders();
    return NextResponse.json({ success: true, responders });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

