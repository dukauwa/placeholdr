import { MongoClient, type Db, type Collection } from 'mongodb';
import type { Memory, Dream } from './types';

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function clientPromise(): Promise<MongoClient> {
  if (global._mongoClientPromise) return global._mongoClientPromise;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set.');
  const p = new MongoClient(uri).connect();
  global._mongoClientPromise = p;
  return p;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  return client.db(process.env.MONGODB_DB || 'dreamlog');
}

export async function memoriesCollection(): Promise<Collection<Memory>> {
  const db = await getDb();
  return db.collection<Memory>('memories');
}

export async function dreamsCollection(): Promise<Collection<Dream>> {
  const db = await getDb();
  return db.collection<Dream>('dreams');
}

export async function ensureIndexes(): Promise<void> {
  const memories = await memoriesCollection();
  const dreams = await dreamsCollection();
  await memories.createIndex({ userId: 1, createdAt: -1 });
  await dreams.createIndex({ userId: 1, createdAt: -1 });
}
