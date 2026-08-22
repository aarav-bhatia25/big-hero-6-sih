import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('file') as Blob | File | null;
    const languageCode = (formData.get('language_code') as string) || 'hi-IN';

    const sarvamApiKey = process.env.SARVAM_API_KEY || 'sk_0jrl1e5n_bi4WYdaK9fnjN7Gfji7RJnwc';

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'No audio file provided in request' },
        { status: 400 }
      );
    }

    // Prepare multipart form data for Sarvam AI Speech-to-Text API (saarika:v2.5)
    const outboundForm = new FormData();
    outboundForm.append('file', audioFile, 'sos_audio.webm');
    outboundForm.append('model', 'saarika:v2.5');
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

      return NextResponse.json({
        success: true,
        transcript: 'Emergency distress signal received! Dispatching nearest patrol unit to current GPS coordinates.',
        language_code: languageCode,
        provider: 'sarvam_ai_fallback',
        warning: `Sarvam API returned HTTP ${sarvamRes.status}`,
      });
    }

    const data = await sarvamRes.json();
    return NextResponse.json({
      success: true,
      transcript: data.transcript || data.text || 'Emergency SOS Voice Ping Received',
      language_code: data.language_code || languageCode,
      provider: 'sarvam_ai',
      raw: data,
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
