import { NextRequest, NextResponse } from "next/server";
import { kycProvider } from "@/lib/kyc/sandboxProvider";
import { isSupabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const method = body.method === "passport" ? "passport" : "aadhaar";

    const result = await kycProvider.initiate({
      method,
      fullName: body.fullName,
      aadhaarNumber: body.aadhaarNumber,
      mrzLine1: body.mrzLine1,
      mrzLine2: body.mrzLine2,
    });

    // The raw document number is never echoed back, logged, or persisted.
    return NextResponse.json(
      { ...result, provider: kycProvider.id, sandbox: kycProvider.isSandbox },
      { status: result.ok ? 200 : 400 }
    );
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
