export const COMMUNICATION_LANGUAGES = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'Hindi (हिंदी)' },
  { code: 'bn-IN', label: 'Bengali (বাংলা)' },
  { code: 'gu-IN', label: 'Gujarati (ગુજરાતી)' },
  { code: 'kn-IN', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml-IN', label: 'Malayalam (മലയാളം)' },
  { code: 'mr-IN', label: 'Marathi (मराठी)' },
  { code: 'od-IN', label: 'Odia (ଓଡ଼ିଆ)' },
  { code: 'pa-IN', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'ta-IN', label: 'Tamil (தமிழ்)' },
  { code: 'te-IN', label: 'Telugu (తెలుగు)' },
  { code: 'ur-IN', label: 'Urdu (اردو)' },
] as const;

export type CommunicationLanguageCode = typeof COMMUNICATION_LANGUAGES[number]['code'];

// Sarvam's speech and translation APIs cover the Indian-language and English
// set below.  A small international set is also offered in the traveller UI;
// those languages use the device speech fallback and the server's separate
// translation fallback where Sarvam has no language model for the pair.
export const INTERNATIONAL_TRAVELLER_LANGUAGES = [
  { code: 'ar-SA', label: 'Arabic (العربية)' },
  { code: 'fr-FR', label: 'French (Français)' },
  { code: 'de-DE', label: 'German (Deutsch)' },
  { code: 'ja-JP', label: 'Japanese (日本語)' },
  { code: 'es-ES', label: 'Spanish (Español)' },
] as const;

export const TRAVELLER_ASSISTANCE_LANGUAGES = [
  ...COMMUNICATION_LANGUAGES,
  ...INTERNATIONAL_TRAVELLER_LANGUAGES,
] as const;

export type TravellerAssistanceLanguageCode = typeof TRAVELLER_ASSISTANCE_LANGUAGES[number]['code'];

export function isCommunicationLanguageCode(value: unknown): value is CommunicationLanguageCode {
  return COMMUNICATION_LANGUAGES.some((language) => language.code === value);
}

export function isTravellerAssistanceLanguageCode(value: unknown): value is TravellerAssistanceLanguageCode {
  return TRAVELLER_ASSISTANCE_LANGUAGES.some((language) => language.code === value);
}

export function languageLabel(code: string | null | undefined) {
  return COMMUNICATION_LANGUAGES.find((language) => language.code === code)?.label ?? code ?? 'Unknown language';
}

export function travellerLanguageLabel(code: string | null | undefined) {
  return TRAVELLER_ASSISTANCE_LANGUAGES.find((language) => language.code === code)?.label ?? code ?? 'Unknown language';
}

export function languageCodeFromPreference(value: unknown): CommunicationLanguageCode {
  if (isCommunicationLanguageCode(value)) return value;
  const text = String(value ?? '').toLowerCase();
  if (text.includes('hindi')) return 'hi-IN';
  if (text.includes('bengali')) return 'bn-IN';
  if (text.includes('gujarati')) return 'gu-IN';
  if (text.includes('kannada')) return 'kn-IN';
  if (text.includes('malayalam')) return 'ml-IN';
  if (text.includes('marathi')) return 'mr-IN';
  if (text.includes('odia') || text.includes('oriya')) return 'od-IN';
  if (text.includes('punjabi')) return 'pa-IN';
  if (text.includes('tamil')) return 'ta-IN';
  if (text.includes('telugu')) return 'te-IN';
  if (text.includes('urdu')) return 'ur-IN';
  return 'en-IN';
}
