import { MongoClient, Db } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB ?? "pfds";

if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable.");
}

const client = new MongoClient(uri);

export const mongoClientPromise =
  global._mongoClientPromise ?? client.connect();

if (process.env.NODE_ENV !== "production") {
  global._mongoClientPromise = mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const connectedClient = await mongoClientPromise;
  return connectedClient.db(dbName);
}
