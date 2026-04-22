#!/usr/bin/env node
/**
 * Dreamlog MCP server — stdio transport.
 * Stores memories + dreams in a local SQLite DB at $DREAMLOG_HOME/dreamlog.db.
 * No network calls. No external services.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';
import { getEncoding } from 'js-tiktoken';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';

// -----------------------------------------------------------------------------
// Paths
// -----------------------------------------------------------------------------

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DREAMLOG_HOME =
  process.env.DREAMLOG_HOME || join(homedir(), '.dreamlog');
const DB_PATH = join(DREAMLOG_HOME, 'dreamlog.db');

if (!existsSync(DREAMLOG_HOME)) mkdirSync(DREAMLOG_HOME, { recursive: true });

// -----------------------------------------------------------------------------
// SQLite setup
// -----------------------------------------------------------------------------

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'paste',
  tags TEXT,
  token_count INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts
  USING fts5(content, content='memories', content_rowid='id', tokenize='porter unicode61');

CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
  INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
END;

CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.id, old.content);
END;

CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.id, old.content);
  INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
END;

CREATE TABLE IF NOT EXISTS dreams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT CHECK(type IN ('hypothesis','question','connection')) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  seed_memory_id INTEGER NOT NULL,
  citation_ids_json TEXT NOT NULL,
  model TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(seed_memory_id) REFERENCES memories(id)
);

CREATE INDEX IF NOT EXISTS idx_dreams_created ON dreams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dreams_seed ON dreams(seed_memory_id);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

// -----------------------------------------------------------------------------
// Chunking (ported from web app lib/chunk.ts)
// -----------------------------------------------------------------------------

const enc = getEncoding('cl100k_base');
const TARGET_TOKENS = 300;
const OVERLAP_TOKENS = 40;

function countTokens(text) {
  return enc.encode(text).length;
}

function splitSentences(raw) {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
}

function hardSplitByTokens(text, target) {
  const ids = enc.encode(text);
  const out = [];
  for (let i = 0; i < ids.length; i += target) {
    out.push(enc.decode(ids.slice(i, i + target)));
  }
  return out;
}

function tailTokens(text, n) {
  const ids = enc.encode(text);
  if (ids.length <= n) return text;
  return enc.decode(ids.slice(ids.length - n));
}

function chunkText(raw, target = TARGET_TOKENS, overlap = OVERLAP_TOKENS) {
  const sentences = splitSentences(raw);
  const sized = [];

  for (const s of sentences) {
    const t = countTokens(s);
    if (t > target) {
      for (const piece of hardSplitByTokens(s, target)) {
        sized.push({ content: piece, tokens: countTokens(piece) });
      }
    } else {
      sized.push({ content: s, tokens: t });
    }
  }

  const chunks = [];
  let buf = [];
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
    if (bufTokens + s.tokens > target && buf.length > 0) flush();
    buf.push(s.content);
    bufTokens += s.tokens;
  }
  flush();

  return chunks;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function text(obj) {
  return {
    content: [{ type: 'text', text: JSON.stringify(obj) }],
  };
}

// Build an FTS5 query from a seed: take the 8 longest alphabetic tokens,
// quote each, OR them together. Ignore short stopword-ish tokens.
function buildFtsQuery(seedText) {
  const tokens = (seedText.toLowerCase().match(/[a-z][a-z']{3,}/g) || []);
  const uniq = [...new Set(tokens)]
    .sort((a, b) => b.length - a.length)
    .slice(0, 8);
  if (uniq.length === 0) return null;
  return uniq.map((t) => `"${t.replace(/"/g, '""')}"`).join(' OR ');
}

function localMidnightIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // Format as "YYYY-MM-DD HH:MM:SS" in local time since we stored rows
  // with SQLite's datetime('now') which is UTC — so we compare in UTC.
  // For simplicity, compare to UTC midnight of the local day: not perfect
  // for timezone edge cases, but good enough for a personal journal.
  const tzOffsetMs = d.getTimezoneOffset() * 60_000;
  const utc = new Date(d.getTime() - tzOffsetMs);
  return utc.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
}

// -----------------------------------------------------------------------------
// Prepared statements
// -----------------------------------------------------------------------------

const insertMemory = db.prepare(
  `INSERT INTO memories (content, source, tags, token_count)
   VALUES (?, ?, ?, ?)`,
);

const sampleSeedsStmt = db.prepare(
  `SELECT id, content FROM memories ORDER BY RANDOM() LIMIT ?`,
);

const getMemoryStmt = db.prepare(
  `SELECT id, content FROM memories WHERE id = ?`,
);

const getMemoriesByIdsStmt = (n) =>
  db.prepare(
    `SELECT id, content, source, created_at FROM memories WHERE id IN (${
      Array(n).fill('?').join(',')
    })`,
  );

const insertDreamStmt = db.prepare(
  `INSERT INTO dreams (type, title, body, seed_memory_id, citation_ids_json, model)
   VALUES (?, ?, ?, ?, ?, ?)`,
);

const dedupDreamStmt = db.prepare(
  `SELECT id FROM dreams
   WHERE seed_memory_id = ?
     AND citation_ids_json = ?
     AND created_at >= datetime('now', '-7 days')
   LIMIT 1`,
);

const todayDreamsCountStmt = db.prepare(
  `SELECT COUNT(*) AS c FROM dreams
   WHERE date(created_at, 'localtime') = date('now', 'localtime')`,
);

const todayDreamsStmt = db.prepare(
  `SELECT * FROM dreams
   WHERE date(created_at, 'localtime') = date('now', 'localtime')
   ORDER BY created_at DESC`,
);

const recentDreamsStmt = db.prepare(
  `SELECT * FROM dreams ORDER BY created_at DESC LIMIT ?`,
);

const statsStmt = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM memories) AS memory_count,
    (SELECT COUNT(*) FROM dreams) AS dream_count,
    (SELECT MAX(created_at) FROM dreams) AS last_dream_at,
    (SELECT MIN(created_at) FROM memories) AS first_memory_at
`);

const clearDemoMemsStmt = db.prepare(`DELETE FROM memories WHERE source = 'demo'`);
const clearDemoDreamsStmt = db.prepare(`
  DELETE FROM dreams WHERE seed_memory_id IN (SELECT id FROM memories WHERE source = 'demo')
`);

const getMetaStmt = db.prepare(`SELECT value FROM meta WHERE key = ?`);
const setMetaStmt = db.prepare(
  `INSERT INTO meta (key, value) VALUES (?, ?)
   ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
);

// -----------------------------------------------------------------------------
// Tool implementations
// -----------------------------------------------------------------------------

function toolRemember({ content, source = 'paste', tags = [] }) {
  if (!content || typeof content !== 'string' || !content.trim()) {
    throw new Error('remember: content is required');
  }
  const chunks = chunkText(content);
  const tagsStr = tags.length ? tags.join(',') : null;
  const ids = [];
  const insertMany = db.transaction((rows) => {
    for (const c of rows) {
      const info = insertMemory.run(c.content, source, tagsStr, c.tokenCount);
      ids.push(Number(info.lastInsertRowid));
    }
  });
  insertMany(chunks);
  return text({ inserted: chunks.length, ids });
}

function toolRememberFile({ path, source = 'paste', tags = [] }) {
  if (!path) throw new Error('remember_file: path is required');
  const abs = resolve(path.startsWith('~') ? path.replace(/^~/, homedir()) : path);
  if (!existsSync(abs)) throw new Error(`file not found: ${abs}`);
  const content = readFileSync(abs, 'utf8');
  return toolRemember({
    content,
    source,
    tags: [...tags, `file:${abs.split('/').pop()}`],
  });
}

function toolSampleSeeds({ count = 25 } = {}) {
  const rows = sampleSeedsStmt.all(count);
  return text({ seeds: rows });
}

function toolFindNeighbors({
  seed_id,
  limit = 20,
  skip_top = 4,
  per_cluster = 3,
  min_neighbors = 2,
}) {
  const seed = getMemoryStmt.get(seed_id);
  if (!seed) return text({ seed_id, neighbors: [], reason: 'seed_not_found' });

  const q = buildFtsQuery(seed.content);
  if (!q) return text({ seed_id, neighbors: [], reason: 'no_query_tokens' });

  const rows = db
    .prepare(
      `SELECT m.id, m.content, bm25(memories_fts) AS rank
       FROM memories_fts
       JOIN memories m ON m.id = memories_fts.rowid
       WHERE memories_fts MATCH ? AND m.id != ?
       ORDER BY rank ASC
       LIMIT ?`,
    )
    .all(q, seed_id, limit);

  const midRanked = rows.slice(skip_top);
  if (midRanked.length < min_neighbors) {
    return text({ seed_id, neighbors: [], reason: 'too_few_in_band' });
  }
  const picked = shuffle(midRanked).slice(0, per_cluster);
  return text({
    seed_id,
    neighbors: picked.map((r) => ({ id: r.id, content: r.content })),
  });
}

function toolInsertDream({
  type,
  title,
  body,
  seed_id,
  citation_ids,
  model = 'claude',
}) {
  if (!['hypothesis', 'question', 'connection'].includes(type)) {
    throw new Error(`insert_dream: invalid type "${type}"`);
  }
  if (!title || !body || !seed_id || !Array.isArray(citation_ids)) {
    throw new Error('insert_dream: title, body, seed_id, citation_ids required');
  }
  const sortedCitations = [...citation_ids].map(Number).sort((a, b) => a - b);
  const citationsJson = JSON.stringify(sortedCitations);

  const existing = dedupDreamStmt.get(seed_id, citationsJson);
  if (existing) return text({ duplicate: true, existing_id: existing.id });

  const info = insertDreamStmt.run(
    type,
    title.trim(),
    body.trim(),
    seed_id,
    citationsJson,
    model,
  );
  return text({ inserted: true, id: Number(info.lastInsertRowid) });
}

function joinDreamWithCitations(dream) {
  const citationIds = JSON.parse(dream.citation_ids_json);
  const refIds = [dream.seed_memory_id, ...citationIds];
  const uniqIds = [...new Set(refIds)];
  const rows = uniqIds.length
    ? getMemoriesByIdsStmt(uniqIds.length).all(...uniqIds)
    : [];
  const map = new Map(rows.map((r) => [r.id, r]));
  return {
    id: dream.id,
    type: dream.type,
    title: dream.title,
    body: dream.body,
    created_at: dream.created_at,
    model: dream.model,
    seed: map.get(dream.seed_memory_id) || null,
    citations: citationIds.map((id) => map.get(id)).filter(Boolean),
  };
}

function toolListDreams({ limit = 50 } = {}) {
  const dreams = recentDreamsStmt.all(limit).map(joinDreamWithCitations);
  return text({ dreams });
}

function toolTodayDreams() {
  const dreams = todayDreamsStmt.all().map(joinDreamWithCitations);
  return text({ dreams });
}

function toolStats() {
  const s = statsStmt.get();
  return text({
    memory_count: s.memory_count,
    dream_count: s.dream_count,
    last_dream_at: s.last_dream_at,
    first_memory_at: s.first_memory_at,
    dream_budget: Number(getMetaStmt.get('dream_budget')?.value || 5),
  });
}

function toolLoadDemo() {
  const memsPath = join(PLUGIN_ROOT, 'data', 'demo-memories.json');
  const dreamsPath = join(PLUGIN_ROOT, 'data', 'demo-dreams.json');
  const demoMems = JSON.parse(readFileSync(memsPath, 'utf8'));
  const demoDreams = JSON.parse(readFileSync(dreamsPath, 'utf8'));

  const txn = db.transaction(() => {
    clearDemoDreamsStmt.run();
    clearDemoMemsStmt.run();

    const memIds = [];
    for (const mem of demoMems) {
      const info = insertMemory.run(mem, 'demo', null, countTokens(mem));
      memIds.push(Number(info.lastInsertRowid));
    }

    const dreamIds = [];
    for (const d of demoDreams) {
      const seedId = memIds[d.seed_idx];
      const citationIds = d.citation_idxs
        .map((i) => memIds[i])
        .filter((x) => typeof x === 'number')
        .sort((a, b) => a - b);
      const citationsJson = JSON.stringify(citationIds);
      const minutesAgo = d.minutes_ago || 60;
      const createdAt = new Date(Date.now() - minutesAgo * 60_000)
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d+Z$/, '');
      const info = db
        .prepare(
          `INSERT INTO dreams
           (type, title, body, seed_memory_id, citation_ids_json, model, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(d.type, d.title, d.body, seedId, citationsJson, 'demo', createdAt);
      dreamIds.push(Number(info.lastInsertRowid));
    }

    return { memIds, dreamIds };
  });

  const { memIds, dreamIds } = txn();
  return text({
    memories_inserted: memIds.length,
    dreams_inserted: dreamIds.length,
  });
}

function toolClearDemo() {
  const txn = db.transaction(() => {
    const dreamRes = clearDemoDreamsStmt.run();
    const memRes = clearDemoMemsStmt.run();
    return {
      dreams_deleted: dreamRes.changes,
      memories_deleted: memRes.changes,
    };
  });
  return text(txn());
}

function toolGetMeta({ key }) {
  const row = getMetaStmt.get(key);
  return text({ key, value: row?.value ?? null });
}

function toolSetMeta({ key, value }) {
  setMetaStmt.run(key, String(value));
  return text({ key, value });
}

// -----------------------------------------------------------------------------
// Tool registry
// -----------------------------------------------------------------------------

const TOOLS = [
  {
    name: 'remember',
    description:
      'Capture a personal fragment (note, overheard, half-thought). Chunks to ~300 tokens and inserts into the memory store.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The text to remember.' },
        source: {
          type: 'string',
          description: "Where it came from (e.g. 'paste', 'journal'). Default 'paste'.",
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags for later filtering.',
        },
      },
      required: ['content'],
    },
    handler: toolRemember,
  },
  {
    name: 'remember_file',
    description: 'Read a text file from disk and capture it as memories.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute or ~-prefixed file path.' },
        source: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['path'],
    },
    handler: toolRememberFile,
  },
  {
    name: 'sample_seeds',
    description: 'Sample random seed memories to begin a dreaming cycle.',
    inputSchema: {
      type: 'object',
      properties: {
        count: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
      },
    },
    handler: toolSampleSeeds,
  },
  {
    name: 'find_neighbors',
    description:
      'Find 2-3 memories semantically related-but-not-too-obvious to a seed, via FTS5 rank-skipping. Returns [] if band is too thin.',
    inputSchema: {
      type: 'object',
      properties: {
        seed_id: { type: 'integer' },
        limit: { type: 'integer', default: 20 },
        skip_top: { type: 'integer', default: 4 },
        per_cluster: { type: 'integer', default: 3 },
        min_neighbors: { type: 'integer', default: 2 },
      },
      required: ['seed_id'],
    },
    handler: toolFindNeighbors,
  },
  {
    name: 'insert_dream',
    description:
      'Persist a generated dream. Deduplicates against the same (seed, sorted citations) within the last 7 days.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['hypothesis', 'question', 'connection'] },
        title: { type: 'string' },
        body: { type: 'string' },
        seed_id: { type: 'integer' },
        citation_ids: { type: 'array', items: { type: 'integer' } },
        model: { type: 'string' },
      },
      required: ['type', 'title', 'body', 'seed_id', 'citation_ids'],
    },
    handler: toolInsertDream,
  },
  {
    name: 'list_dreams',
    description: 'List recent dreams with their seed and citation contents.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'integer', default: 50 } },
    },
    handler: toolListDreams,
  },
  {
    name: 'today_dreams',
    description: "List dreams created today (since local midnight).",
    inputSchema: { type: 'object', properties: {} },
    handler: toolTodayDreams,
  },
  {
    name: 'stats',
    description: 'Return counts and timestamps for the Dreamlog store.',
    inputSchema: { type: 'object', properties: {} },
    handler: toolStats,
  },
  {
    name: 'load_demo',
    description:
      'Load 41 sample memories and 3 pre-baked dreams so a first-run session feels alive.',
    inputSchema: { type: 'object', properties: {} },
    handler: toolLoadDemo,
  },
  {
    name: 'clear_demo',
    description: "Remove demo-sourced memories and dreams. Doesn't touch real user content.",
    inputSchema: { type: 'object', properties: {} },
    handler: toolClearDemo,
  },
  {
    name: 'get_meta',
    description: 'Read a key from the meta config (e.g. dream_budget).',
    inputSchema: {
      type: 'object',
      properties: { key: { type: 'string' } },
      required: ['key'],
    },
    handler: toolGetMeta,
  },
  {
    name: 'set_meta',
    description: 'Write a key to the meta config.',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        value: { type: ['string', 'number', 'boolean'] },
      },
      required: ['key', 'value'],
    },
    handler: toolSetMeta,
  },
];

const TOOL_MAP = new Map(TOOLS.map((t) => [t.name, t]));

// -----------------------------------------------------------------------------
// MCP server wiring
// -----------------------------------------------------------------------------

const server = new Server(
  { name: 'dreamlog', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = TOOL_MAP.get(req.params.name);
  if (!tool) {
    return {
      isError: true,
      content: [{ type: 'text', text: `unknown tool: ${req.params.name}` }],
    };
  }
  try {
    return tool.handler(req.params.arguments || {});
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text', text: `error: ${err.message}` }],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
