import { getOpenAI, EMBEDDING_MODEL } from './openai';

const BATCH_SIZE = 96;

export async function embedTexts(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];

  const openai = getOpenAI();
  const out: number[][] = [];
  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    const batch = inputs.slice(i, i + BATCH_SIZE);
    const res = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    for (const row of res.data) out.push(row.embedding);
  }
  return out;
}

export async function embedOne(input: string): Promise<number[]> {
  const [v] = await embedTexts([input]);
  return v;
}
