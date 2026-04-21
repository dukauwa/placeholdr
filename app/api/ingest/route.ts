import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { chunkText } from '@/lib/chunk';
import { embedTexts } from '@/lib/embed';
import { memoriesCollection } from '@/lib/mongo';
import { DEMO_MODE } from '@/lib/demo';
import type { Memory } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const bodySchema = z.object({
  content: z.string().min(1).max(200_000),
});

export async function POST(req: Request) {
  const userId = process.env.DEFAULT_USER_ID;
  if (!userId) {
    return NextResponse.json({ error: 'DEFAULT_USER_ID not set' }, { status: 500 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const chunks = chunkText(parsed.content);
  if (chunks.length === 0) {
    return NextResponse.json({ error: 'No content to ingest' }, { status: 400 });
  }

  if (DEMO_MODE) {
    return NextResponse.json({
      inserted: chunks.length,
      tokenCount: chunks.reduce((s, c) => s + c.tokenCount, 0),
      demo: true,
    });
  }

  const embeddings = await embedTexts(chunks.map((c) => c.content));
  const now = new Date();

  const docs: Memory[] = chunks.map((c, i) => ({
    _id: new ObjectId(),
    userId,
    sourceType: 'paste',
    content: c.content,
    embedding: embeddings[i],
    tokenCount: c.tokenCount,
    createdAt: now,
  }));

  const memories = await memoriesCollection();
  await memories.insertMany(docs);

  return NextResponse.json({
    inserted: docs.length,
    tokenCount: docs.reduce((s, d) => s + d.tokenCount, 0),
  });
}
