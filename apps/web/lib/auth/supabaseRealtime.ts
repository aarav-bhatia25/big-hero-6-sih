import type { AuthSession } from "./session";

const encoder = new TextEncoder();

function base64Url(value: string | Uint8Array): string {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * Mints a brief custom JWT for a Supabase Realtime private channel. The shared
 * signing secret must be configured as a Supabase legacy JWT secret or an
 * imported HS256 signing key; it is never sent to the browser.
 */
export async function createSupabaseRealtimeToken(session: AuthSession): Promise<string | null> {
  const secret = process.env.SUPABASE_REALTIME_JWT_SECRET;
  if (!secret) return null;

  const now = Math.floor(Date.now() / 1_000);
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      aud: "authenticated",
      role: "authenticated",
      sub: "prahari-staff-session",
      prahari_role: session.role,
      iat: now,
      exp: now + 15 * 60,
    })
  );
  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput)));

  return `${signingInput}.${base64Url(signature)}`;
}
