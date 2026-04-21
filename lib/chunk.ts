import { getEncoding } from 'js-tiktoken';

const enc = getEncoding('cl100k_base');

export type Chunk = { content: string; tokenCount: number };

export function countTokens(text: string): number {
  return enc.encode(text).length;
}

function splitSentences(raw: string): string[] {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
}

function hardSplitByTokens(text: string, target: number): string[] {
  const ids = enc.encode(text);
  const out: string[] = [];
  for (let i = 0; i < ids.length; i += target) {
    out.push(enc.decode(ids.slice(i, i + target)));
  }
  return out;
}

function tailTokens(text: string, n: number): string {
  const ids = enc.encode(text);
  if (ids.length <= n) return text;
  return enc.decode(ids.slice(ids.length - n));
}

export function chunkText(raw: string, targetTokens = 300, overlap = 40): Chunk[] {
  const sentences = splitSentences(raw);
  const sized: { content: string; tokens: number }[] = [];

  for (const s of sentences) {
    const t = countTokens(s);
    if (t > targetTokens) {
      for (const piece of hardSplitByTokens(s, targetTokens)) {
        sized.push({ content: piece, tokens: countTokens(piece) });
      }
    } else {
      sized.push({ content: s, tokens: t });
    }
  }

  const chunks: Chunk[] = [];
  let buf: string[] = [];
  let bufTokens = 0;

  const flush = () => {
    if (buf.length === 0) return;
    const content = buf.join(' ').trim();
    if (!content) return;
    let finalContent = content;
    if (chunks.length > 0 && overlap > 0) {
      const prevTail = tailTokens(chunks[chunks.length - 1].content, overlap);
      finalContent = `${prevTail} ${content}`.trim();
    }
    chunks.push({ content: finalContent, tokenCount: countTokens(finalContent) });
    buf = [];
    bufTokens = 0;
  };

  for (const s of sized) {
    if (bufTokens + s.tokens > targetTokens && buf.length > 0) flush();
    buf.push(s.content);
    bufTokens += s.tokens;
  }
  flush();

  return chunks;
}
