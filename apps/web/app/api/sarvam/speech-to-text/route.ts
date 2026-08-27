import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { isCommunicationLanguageCode } from '@/lib/languages';

export const dynamic = 'force-dynamic';

/**
 * Container types Sarvam accepts, mapped to the file extension that matches
 * each one. The provider compares the uploaded part's Content-Type against
 * this set as an exact string, so any codec parameter must be stripped first.
 */
const SARVAM_AUDIO_TYPES: Record<string, string> = {
  'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/mpeg3': 'mp3',
  'audio/x-mpeg-3': 'mp3', 'audio/x-mp3': 'mp3',
  'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/wave': 'wav',
  'audio/pcm_s16le': 'pcm', 'audio/l16': 'pcm', 'audio/raw': 'raw',
  'audio/aac': 'aac', 'audio/x-aac': 'aac',
  'audio/aiff': 'aiff', 'audio/x-aiff': 'aiff',
  'audio/ogg': 'ogg', 'audio/opus': 'opus',
  'audio/flac': 'flac', 'audio/x-flac': 'flac',
  'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a',
  'audio/amr': 'amr', 'audio/x-ms-wma': 'wma',
  'audio/webm': 'webm', 'video/webm': 'webm',
};

/**
 * MediaRecorder reports its output with the codec attached — Safari records
 * `audio/mp4; codecs=mp4a.40.2` and Chrome `audio/webm;codecs=opus`. Both base
 * types are supported by Sarvam, but the parameter makes the exact-match check
 * fail, so the recording is rejected as an invalid file type. Reduce the type
 * to its bare container and name the file to match; an unrecognised container
 * falls back to the generic binary type the provider also accepts.
 */
function normaliseAudioForSarvam(type: string): { contentType: string; filename: string } {
  const baseType = type.split(';')[0].trim().toLowerCase();
  const extension = SARVAM_AUDIO_TYPES[baseType];
  return extension
    ? { contentType: baseType, filename: `sos_audio.${extension}` }
    : { contentType: 'application/octet-stream', filename: 'sos_audio' };
}

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
    const { contentType, filename } = normaliseAudioForSarvam(audioFile.type);
    const outboundForm = new FormData();
    outboundForm.append('file', new Blob([audioFile], { type: contentType }), filename);
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
