import mongoose, { Schema, Document } from 'mongoose';

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface Accommodation {
  hotelName: string;
  address: string;
  city: string;
}

export interface Preferences {
  language: string;
  notificationMode: 'push' | 'sms' | 'voice';
  medicalNotes?: string;
}

export interface Tourist extends Document {
  touristId: string;
  name: string;
  nationality: string;
  identityStatus: 'verified' | 'pending' | 'flagged' | 'revoked';
  emergencyContacts: EmergencyContact[];
  accommodation: Accommodation;
  preferences: Preferences;
  trackingConsent: boolean;
  createdAt: Date;
  status?: 'SAFE' | 'WARN' | 'SOS';
  riskScore?: number;
  currentLocation?: {
    lat: number;
    lng: number;
    updatedAt: Date;
  };
}

const TouristSchema = new Schema(
  {
    touristId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nationality: { type: String, default: 'India' },
    identityStatus: {
      type: String,
      enum: ['verified', 'pending', 'flagged', 'revoked'],
      default: 'verified',
    },
    emergencyContacts: [
      {
        name: String,
        phone: String,
        relationship: String,
      },
    ],
    accommodation: {
      hotelName: String,
      address: String,
      city: String,
    },
    preferences: {
      language: { type: String, default: 'en' },
      notificationMode: { type: String, enum: ['push', 'sms', 'voice'], default: 'push' },
      medicalNotes: String,
    },
    trackingConsent: { type: Boolean, default: true },
    status: { type: String, enum: ['SAFE', 'WARN', 'SOS'], default: 'SAFE' },
    riskScore: { type: Number, default: 15 },
    currentLocation: {
      lat: Number,
      lng: Number,
      updatedAt: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Tourist || mongoose.model<Tourist>('Tourist', TouristSchema);
