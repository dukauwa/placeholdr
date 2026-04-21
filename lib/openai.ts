import OpenAI from 'openai';

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set.');
  _client = new OpenAI({ apiKey });
  return _client;
}

export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
export const EMBEDDING_DIM = 1536;
