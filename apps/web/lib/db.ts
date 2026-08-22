import { MongoClient, Db, Collection } from "mongodb";
import { Tourist } from "./models/Tourist";
import { LocationPing } from "./models/Location";
import { Geofence } from "./models/Geofence";
import { Incident } from "./models/Incident";
import { Responder } from "./models/Responder";

const MONGODB_URI = process.env.MONGODB_URI || process.env.DB_URI || "mongodb://127.0.0.1:27017/prahari";
const DB_NAME = "prahari";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    cachedClient = client;
    cachedDb = db;
    return { client, db };
  } catch (error) {
    console.warn("MongoDB connection failed or skipped in fallback mode:", error);
    // Return dummy client/db wrapper for offline mock fallback
    return { client, db: (null as unknown as Db) };
  }
}

export async function getCollection<T extends Document>(collectionName: string): Promise<Collection<T> | null> {
  try {
    const { db } = await connectToDatabase();
    if (!db) return null;
    return db.collection<T>(collectionName);
  } catch {
    return null;
  }
}

export async function getTouristsCollection() {
  return getCollection<any>("tourists");
}

export async function getLocationsCollection() {
  return getCollection<any>("locations");
}

export async function getGeofencesCollection() {
  return getCollection<any>("geofences");
}

export async function getIncidentsCollection() {
  return getCollection<any>("incidents");
}

export async function getRespondersCollection() {
  return getCollection<any>("responders");
}
