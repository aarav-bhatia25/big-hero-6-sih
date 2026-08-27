import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { isCommunicationLanguageCode } from '@/lib/languages';
import { synthesizeSarvamSpeech } from '@/lib/services/multilingualCommunication';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['tourist']);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await request.json();
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const languageCode = body.languageCode;
    if (!text || text.length > 2_000 || !isCommunicationLanguageCode(languageCode)) {
      return NextResponse.json({ success: false, error: 'Provide up to 2,000 characters and a supported Indian or English language.' }, { status: 400 });
    }
    const speech = await synthesizeSarvamSpeech({ text, languageCode });
    return NextResponse.json({ success: true, ...speech });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Speech playback could not be created.' }, { status: 502 });
  }
}
