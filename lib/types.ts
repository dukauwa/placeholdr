import type { ObjectId } from 'mongodb';

export type SourceType = 'paste' | 'seed';

export type Memory = {
  _id: ObjectId;
  userId: string;
  sourceType: SourceType;
  content: string;
  embedding: number[];
  tokenCount: number;
  createdAt: Date;
};

export type DreamType = 'hypothesis' | 'question' | 'connection';

export type Dream = {
  _id: ObjectId;
  userId: string;
  type: DreamType;
  title: string;
  body: string;
  seedMemoryId: ObjectId;
  citationIds: ObjectId[];
  model: string;
  createdAt: Date;
};

export type DreamWithCitations = Dream & {
  citations: Pick<Memory, '_id' | 'content' | 'sourceType' | 'createdAt'>[];
  seed: Pick<Memory, '_id' | 'content' | 'sourceType' | 'createdAt'> | null;
};
