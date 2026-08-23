import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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
    if (!sarvamApiKey) {
      return NextResponse.json(
        { success: false, error: 'Voice transcription is not configured. Set SARVAM_API_KEY on the server to enable it.' },
        { status: 503 }
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

      return NextResponse.json({ success: false, error: 'Voice transcription provider is temporarily unavailable.' }, { status: 502 });
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
