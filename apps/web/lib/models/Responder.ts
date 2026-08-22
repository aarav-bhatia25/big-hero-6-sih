import mongoose, { Schema, Document } from 'mongoose';

export interface ResponderLocation {
  lat: number;
  lng: number;
}

export interface Responder extends Document {
  responderId: string;
  unitId?: string;
  name?: string;
  phone?: string;
  department: 'Police' | 'Medical' | 'Search & Rescue' | 'Tourism Patrol';
  location: ResponderLocation;
  status: 'available' | 'dispatched' | 'off_duty' | 'AVAILABLE' | 'DISPATCHED' | 'OFF_DUTY';
  capabilities: string[];
  type?: 'POLICE' | 'MEDICAL' | 'RESCUE';
}

const ResponderSchema = new Schema(
  {
    responderId: { type: String, required: true, unique: true },
    unitId: String,
    name: String,
    phone: String,
    department: {
      type: String,
      enum: ['Police', 'Medical', 'Search & Rescue', 'Tourism Patrol'],
      default: 'Police',
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ['available', 'dispatched', 'off_duty', 'AVAILABLE', 'DISPATCHED', 'OFF_DUTY'],
      default: 'available',
    },
    capabilities: [{ type: String }],
    type: { type: String, enum: ['POLICE', 'MEDICAL', 'RESCUE'], default: 'POLICE' },
  },
  { timestamps: true }
);

export default mongoose.models.Responder || mongoose.model<Responder>('Responder', ResponderSchema);
