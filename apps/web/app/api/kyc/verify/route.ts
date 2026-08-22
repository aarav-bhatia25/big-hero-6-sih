import { NextRequest, NextResponse } from "next/server";
import { kycProvider } from "@/lib/kyc/sandboxProvider";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, otp } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "sessionId is required." }, { status: 400 });
    }

    const result = await kycProvider.verify({ sessionId, otp });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
