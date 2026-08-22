import mongoose, { Schema, Document } from 'mongoose';

export interface GeoJSONGeometry {
  type: 'Polygon' | 'Point' | 'MultiPolygon';
  coordinates: any[];
}

export interface GeofenceMetadata {
  description?: string;
  advisoryMsg?: string;
  speedLimit?: number;
  radius?: number;
}

export interface Geofence extends Document {
  name: string;
  type: 'safe_zone' | 'restricted' | 'high_risk' | 'hazard' | 'HIGH_RISK';
  geometry: GeoJSONGeometry;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'CRITICAL' | 'HIGH';
  active: boolean;
  metadata: GeofenceMetadata;
  coordinates?: Array<[number, number]>;
}

const GeofenceSchema = new Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['safe_zone', 'restricted', 'high_risk', 'hazard', 'HIGH_RISK', 'RESTRICTED', 'SAFE'],
      default: 'high_risk',
    },
    geometry: {
      type: { type: String, enum: ['Polygon', 'Point', 'MultiPolygon'], default: 'Polygon' },
      coordinates: { type: Schema.Types.Mixed, required: true },
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      default: 'high',
    },
    active: { type: Boolean, default: true },
    metadata: {
      description: String,
      advisoryMsg: String,
      speedLimit: Number,
      radius: Number,
    },
    coordinates: [[Number]],
  },
  { timestamps: true }
);

export default mongoose.models.Geofence || mongoose.model<Geofence>('Geofence', GeofenceSchema);
