import { ObjectId } from 'mongodb';
import { getAnthropic, ANTHROPIC_MODEL } from './anthropic';
import { memoriesCollection, dreamsCollection } from './mongo';
import { SYSTEM_PROMPT, buildUserPrompt, DREAM_TOOL } from './prompts';
import type { Memory, Dream, DreamType } from './types';

const SEED_SAMPLE_SIZE = 25;
const SEARCH_LIMIT = 20;
const SEARCH_CANDIDATES = 200;
const SKIP_TOP_RANKS = 4;
const MIN_SCORE = 0.35;
const MAX_SCORE = 0.65;
const WIDE_MIN_SCORE = 0.3;
const WIDE_MAX_SCORE = 0.7;
const NEIGHBORS_PER_CLUSTER = 3;
const MIN_NEIGHBORS = 2;
const DREAM_BUDGET = 12;
const DEDUP_WINDOW_DAYS = 7;

type NeighborHit = {
  _id: ObjectId;
  content: string;
  score: number;
};

type ClusterSeed = Pick<Memory, '_id' | 'content' | 'embedding'>;

export async function runDreamCycle(userId: string): Promise<Dream[]> {
  const memories = await memoriesCollection();
  const dreams = await dreamsCollection();

  const seeds = (await memories
    .aggregate<ClusterSeed>([
      { $match: { userId } },
      { $sample: { size: SEED_SAMPLE_SIZE } },
      { $project: { _id: 1, content: 1, embedding: 1 } },
    ])
    .toArray()) as ClusterSeed[];

  if (seeds.length === 0) return [];

  const dedupCutoff = new Date(Date.now() - DEDUP_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const inserted: Dream[] = [];

  for (const seed of shuffle(seeds)) {
    if (inserted.length >= DREAM_BUDGET) break;

    const neighbors = await findDistantNeighbors(userId, seed);
    if (neighbors.length < MIN_NEIGHBORS) continue;

    const citationIds = neighbors.map((n) => n._id);

    const duplicate = await dreams.findOne({
      userId,
      seedMemoryId: seed._id,
      createdAt: { $gte: dedupCutoff },
      citationIds: { $all: citationIds, $size: citationIds.length },
    });
    if (duplicate) continue;

    const generated = await generateDream({ seed, neighbors });
    if (!generated) continue;

    const doc: Dream = {
      _id: new ObjectId(),
      userId,
      type: generated.type,
      title: generated.title,
      body: generated.body,
      seedMemoryId: seed._id,
      citationIds,
      model: ANTHROPIC_MODEL,
      createdAt: new Date(),
    };
    await dreams.insertOne(doc);
    inserted.push(doc);
  }

  return inserted;
}

async function findDistantNeighbors(
  userId: string,
  seed: ClusterSeed,
): Promise<NeighborHit[]> {
  const memories = await memoriesCollection();

  const pipeline = [
    {
      $vectorSearch: {
        index: 'memories_vector',
        path: 'embedding',
        queryVector: seed.embedding,
        numCandidates: SEARCH_CANDIDATES,
        limit: SEARCH_LIMIT,
        filter: { userId },
      },
    },
    {
      $project: {
        _id: 1,
        content: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ];

  const raw = (await memories.aggregate<NeighborHit>(pipeline).toArray()) as NeighborHit[];

  const withoutSelf = raw.filter((r) => !r._id.equals(seed._id));
  const midRanked = withoutSelf.slice(SKIP_TOP_RANKS);

  const inBand = midRanked.filter((r) => r.score >= MIN_SCORE && r.score <= MAX_SCORE);
  const pool =
    inBand.length >= MIN_NEIGHBORS
      ? inBand
      : midRanked.filter((r) => r.score >= WIDE_MIN_SCORE && r.score <= WIDE_MAX_SCORE);

  return shuffle(pool).slice(0, NEIGHBORS_PER_CLUSTER);
}

type GeneratedDream = { type: DreamType; title: string; body: string };

async function generateDream(cluster: {
  seed: { content: string };
  neighbors: { content: string }[];
}): Promise<GeneratedDream | null> {
  const res = await getAnthropic().messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 600,
    temperature: 0.9,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(cluster) }],
    tools: [DREAM_TOOL as never],
    tool_choice: { type: 'tool', name: 'emit_dream' },
  });

  for (const block of res.content) {
    if (block.type === 'tool_use' && block.name === 'emit_dream') {
      const input = block.input as Partial<GeneratedDream>;
      if (!input.type || !input.title || !input.body) return null;
      if (!['hypothesis', 'question', 'connection'].includes(input.type)) return null;
      return {
        type: input.type,
        title: input.title.trim(),
        body: input.body.trim(),
      };
    }
  }
  return null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
