import QRCode from 'qrcode';

export interface DigitalIdPayload {
  touristId: string;
  name: string;
  nationality: string;
  verified: boolean;
  did: string;
  issueDate: string;
}

export const MOCK_DEMO_TOURIST: DigitalIdPayload = {
  touristId: "DTI-IND-000123",
  name: "Demo Tourist",
  nationality: "India",
  verified: true,
  did: "did:tourist:DTI-IND-000123",
  issueDate: "2026-08-22",
};

export async function generateDigitalIdQr(didString: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(didString, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
    return qrDataUrl;
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw err;
  }
}
