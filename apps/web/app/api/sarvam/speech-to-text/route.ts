import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { isCommunicationLanguageCode } from '@/lib/languages';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['tourist']);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const formData = await request.formData();
    const audioFile = formData.get('file') as Blob | File | null;
    const languageCode = (formData.get('language_code') as string) || 'hi-IN';

    const sarvamApiKey = process.env.SARVAM_API_KEY;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'No audio file provided in request' },
        { status: 400 }
      );
    }
    if (!isCommunicationLanguageCode(languageCode)) {
      return NextResponse.json({ success: false, error: 'Choose a supported Indian or English voice language.' }, { status: 400 });
    }
    if (audioFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Voice recording must be 10 MB or smaller.' }, { status: 413 });
    }
    if (!sarvamApiKey) {
      return NextResponse.json(
        { success: false, error: 'Voice transcription is not configured. Set SARVAM_API_KEY on the server to enable it.' },
        { status: 503 }
      );
    }

    // Saaras v3 is Sarvam's current speech-recognition model. It preserves the
    // speaker's language; officer-facing translation is a separate explicit
    // step so staff can always inspect the original message.
    const outboundForm = new FormData();
    outboundForm.append('file', audioFile, 'sos_audio.webm');
    outboundForm.append('model', process.env.SARVAM_STT_MODEL || 'saaras:v3');
    outboundForm.append('mode', 'transcribe');
    outboundForm.append('language_code', languageCode);

    const sarvamRes = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: {
        'api-subscription-key': sarvamApiKey,
      },
      body: outboundForm,
    });

    if (!sarvamRes.ok) {
      const errorText = await sarvamRes.text();
      console.error('[sarvam-stt-error]', sarvamRes.status, errorText);

      return NextResponse.json({ success: false, error: 'Voice transcription provider is temporarily unavailable.' }, { status: 502 });
    }

    const data = await sarvamRes.json();
    return NextResponse.json({
      success: true,
      transcript: data.transcript || data.text || 'Emergency SOS Voice Ping Received',
      language_code: data.language_code || languageCode,
      provider: 'sarvam_ai',
    });
  } catch (err: any) {
    console.error('[sarvam-stt-exception]', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Error processing Sarvam AI Speech-to-Text',
      },
      { status: 500 }
    );
  }
}
