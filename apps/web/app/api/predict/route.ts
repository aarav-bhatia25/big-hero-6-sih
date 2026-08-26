import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ success: false, error: "ML prediction endpoint removed." }, { status: 410 });
}
