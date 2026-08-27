import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { isTravellerAssistanceLanguageCode } from '@/lib/languages';
import { translateTravellerText } from '@/lib/services/multilingualCommunication';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['tourist']);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await request.json();
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const sourceLanguage = body.sourceLanguage;
    const targetLanguage = body.targetLanguage;
    if (!text || text.length > 2_000 || !isTravellerAssistanceLanguageCode(sourceLanguage) || !isTravellerAssistanceLanguageCode(targetLanguage)) {
      return NextResponse.json({ success: false, error: 'Choose supported languages and enter up to 2,000 characters.' }, { status: 400 });
    }
    const result = await translateTravellerText({ text, sourceLanguage, targetLanguage });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Translation could not be completed.' }, { status: 502 });
  }
}
