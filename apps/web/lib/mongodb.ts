import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Add MONGODB_URI to your environment before using the database.");
const globalForMongo = globalThis as unknown as { mongoClient?: MongoClient };
export const mongoClient = globalForMongo.mongoClient ?? new MongoClient(uri);
if (process.env.NODE_ENV !== "production") globalForMongo.mongoClient = mongoClient;
