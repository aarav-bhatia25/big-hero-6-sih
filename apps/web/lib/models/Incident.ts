import mongoose, { Schema, Document } from 'mongoose';

export interface IncidentLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface Incident extends Document {
  incidentId: string;
  touristId: string;
  touristName?: string;
  type: 'SOS' | 'geofence_breach' | 'medical' | 'theft' | 'signal_loss' | 'PANIC' | 'HAZARD' | 'LOST';
  status: 'new' | 'assigned' | 'in_progress' | 'resolved' | 'ACTIVE' | 'DISPATCHED';
  location: IncidentLocation;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'CRITICAL' | 'HIGH';
  riskScore?: number;
  createdAt: Date;
  assignedResponder?: string | null;
  assignedResponderUnitId?: string;
  assignedResponderName?: string;
  etaMinutes?: number;
  resolvedAt?: Date | null;
  timeline?: Array<{ action: string; timestamp: Date; by: string }>;
}

const IncidentSchema = new Schema(
  {
    incidentId: { type: String, required: true, unique: true },
    touristId: { type: String, required: true },
    touristName: String,
    type: {
      type: String,
      enum: ['SOS', 'geofence_breach', 'medical', 'theft', 'signal_loss', 'PANIC', 'HAZARD', 'LOST'],
      default: 'SOS',
    },
    status: {
      type: String,
      enum: ['new', 'assigned', 'in_progress', 'resolved', 'ACTIVE', 'DISPATCHED'],
      default: 'new',
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: String,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      default: 'critical',
    },
    riskScore: { type: Number, default: 91 },
    assignedResponder: String,
    assignedResponderUnitId: String,
    assignedResponderName: String,
    etaMinutes: Number,
    resolvedAt: Date,
    timeline: [
      {
        action: String,
        timestamp: { type: Date, default: Date.now },
        by: String,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Incident || mongoose.model<Incident>('Incident', IncidentSchema);
