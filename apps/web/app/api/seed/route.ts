import { NextResponse } from "next/server";
import {
  getTouristsCollection,
  getLocationsCollection,
  getGeofencesCollection,
  getIncidentsCollection,
  getRespondersCollection,
} from "@/lib/db";

export async function POST() {
  try {
    const touristsCol = await getTouristsCollection();
    const locationsCol = await getLocationsCollection();
    const geofencesCol = await getGeofencesCollection();
    const incidentsCol = await getIncidentsCollection();
    const respondersCol = await getRespondersCollection();

    // 1. Seed Tourist "Ralston"
    if (touristsCol) {
      await touristsCol.updateOne(
        { touristId: "TOUR-7890" },
        {
          $set: {
            touristId: "TOUR-7890",
            name: "Ralston",
            nationality: "Indian",
            identityStatus: "verified",
            emergencyContacts: [
              { name: "Ananya Sharma", phone: "+91 98765 43210", relationship: "Sister" },
              { name: "Rajesh Kumar", phone: "+91 98123 45678", relationship: "Friend" },
            ],
            accommodation: {
              hotelName: "Heritage Palace Resort",
              address: "Amer Road, Pink City",
              city: "Jaipur",
            },
            preferences: {
              language: "English",
              notificationMode: "push",
              medicalNotes: "No known allergies",
            },
            trackingConsent: true,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    // 2. Seed Initial Location
    if (locationsCol) {
      await locationsCol.insertOne({
        touristId: "TOUR-7890",
        coordinates: { lat: 26.9124, lng: 75.7873 },
        timestamp: new Date(),
        accuracy: 5.2,
        source: "gps",
      });
    }

    // 3. Seed Geofences
    if (geofencesCol) {
      await geofencesCol.deleteMany({});
      await geofencesCol.insertMany([
        {
          name: "Pink City Central Safe Zone",
          type: "safe_zone",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [75.78, 26.91],
                [75.83, 26.91],
                [75.83, 26.95],
                [75.78, 26.95],
                [75.78, 26.91],
              ],
            ],
          },
          severity: "low",
          active: true,
          metadata: { description: "High security tourist hub with 24/7 patrol" },
        },
        {
          name: "Nahargarh Cliff Restricted Area",
          type: "restricted",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [75.81, 26.935],
                [75.825, 26.935],
                [75.825, 26.948],
                [75.81, 26.948],
                [75.81, 26.935],
              ],
            ],
          },
          severity: "high",
          active: true,
          metadata: { description: "Steep terrain; unauthorized access after 7 PM prohibited" },
        },
      ]);
    }

    // 4. Seed Responders
    if (respondersCol) {
      await respondersCol.deleteMany({});
      await respondersCol.insertMany([
        {
          responderId: "RESP-POLICE-01",
          department: "Police",
          location: { lat: 26.915, lng: 75.789 },
          status: "available",
          capabilities: ["First Aid", "Vehicle Patrol", "Multilingual"],
        },
        {
          responderId: "RESP-MED-02",
          department: "Medical",
          location: { lat: 26.92, lng: 75.795 },
          status: "available",
          capabilities: ["Ambulance", "Advanced Trauma Support"],
        },
      ]);
    }

    // 5. Seed Initial Incident
    if (incidentsCol) {
      await incidentsCol.updateOne(
        { incidentId: "INC-SEED-01" },
        {
          $set: {
            incidentId: "INC-SEED-01",
            touristId: "TOUR-7890",
            type: "geofence_breach",
            status: "new",
            location: { lat: 26.936, lng: 75.815, address: "Nahargarh Fort View Point" },
            severity: "medium",
            createdAt: new Date(),
            assignedResponder: null,
            resolvedAt: null,
          },
        },
        { upsert: true }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Database successfully seeded with initial Tourist, Location, Geofence, Incident, and Responder data.",
      touristId: "TOUR-7890",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
