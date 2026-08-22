import mongoose, { Schema, Document } from 'mongoose';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationPing extends Document {
  touristId: string;
  coordinates: Coordinates;
  timestamp: Date;
  accuracy: number;
  source: 'gps' | 'cellular' | 'manual';
  lat?: number;
  lng?: number;
  speed?: number;
  batteryLevel?: number;
}

const LocationSchema = new Schema(
  {
    touristId: { type: String, required: true, index: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    lat: Number,
    lng: Number,
    accuracy: { type: Number, default: 5 },
    source: { type: String, enum: ['gps', 'cellular', 'manual'], default: 'gps' },
    speed: Number,
    batteryLevel: Number,
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.Location || mongoose.model<LocationPing>('Location', LocationSchema);
