# dreamlog

An agent that reads your personal notes while you sleep and returns, come morning, with one small thread it found between them — a hypothesis, a question, or a strange connection.

Stack: Next.js 15 (App Router) · TypeScript · Tailwind · MongoDB Atlas Vector Search · Anthropic Claude Sonnet 4.6 · OpenAI `text-embedding-3-small`.

## How it works

1. **Ingest.** You paste text on `/`. It gets chunked to ~300 tokens, embedded with OpenAI, and stored in `memories`.
2. **Dream.** `POST /api/dream` (designed as a nightly cron) samples 25 memories, and for each one runs a vector search and picks 2–3 neighbors from a *mid-similarity band* — related enough to matter, distant enough to surprise. Each cluster is handed to Claude, which returns a hypothesis, question, or connection via tool-use.
3. **Read.** `/dreams` is the morning letter — editorial, serif, with collapsible citations back to the source fragments.

## Setup

### 1. Install

```bash
pnpm install   # or npm install / yarn
```

### 2. MongoDB Atlas

- Create a free Atlas cluster and a database called `dreamlog` (or match `MONGODB_DB`).
- Get a connection string for a user with read/write on that DB.
- **Create the vector search index.** In Atlas → *Search* → *Create Search Index* → *JSON Editor* → *Vector Search* on the `memories` collection. Name it **`memories_vector`** and use:

  ```json
  {
    "fields": [
      { "type": "vector", "path": "embedding", "numDimensions": 1536, "similarity": "cosine" },
      { "type": "filter", "path": "userId" }
    ]
  }
  ```

  The index needs a few minutes to build before dreams will generate.

### 3. Environment

Copy `.env.example` to `.env.local` and fill in:

| Var | What |
| --- | --- |
| `MONGODB_URI` | Atlas connection string |
| `MONGODB_DB` | Database name (default `dreamlog`) |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `ANTHROPIC_MODEL` | Defaults to `claude-sonnet-4-6` |
| `OPENAI_API_KEY` | OpenAI API key (for embeddings) |
| `EMBEDDING_MODEL` | Defaults to `text-embedding-3-small` |
| `DREAM_TRIGGER_SECRET` | Long random string; guards `/api/dream` |
| `DEFAULT_USER_ID` | e.g. `demo-user` — v1 is single-user |
| `DEMO_MODE` | Set to `1` to run the UI without Atlas/OpenAI/Anthropic (uses in-memory sample dreams) |

### 4. Seed

```bash
pnpm seed
```

This loads 41 varied memories (journal fragments, overheards, half-finished ideas, travel notes, etc.) so the dreaming loop has interesting material to cross.

### 5. Run

```bash
pnpm dev
```

Open `http://localhost:3000`, paste something, then in another shell:

```bash
pnpm dream:local
```

Then visit `http://localhost:3000/dreams`.

## Demo mode

To click through the UI without setting up Atlas/OpenAI/Anthropic, run:

```bash
DEMO_MODE=1 DEFAULT_USER_ID=demo-user pnpm dev
```

`/dreams` will render three pre-baked sample dreams with citations, and the ingest form will simulate a successful save. Useful for testing the UI, reviewing the design, or checking mobile responsiveness.

## Deployment

Deploy to Vercel. Add all env vars. `vercel.json` already registers a cron:

```json
{ "crons": [{ "path": "/api/dream", "schedule": "0 7 * * *" }] }
```

Vercel Cron sends a GET with an `x-vercel-cron` header, which `/api/dream` accepts in place of the bearer token. For manual triggers against the deployment, POST with `Authorization: Bearer $DREAM_TRIGGER_SECRET`.

## Tuning the dreaming

If the dreams feel too obvious (restatements of the source notes), tighten the band in `lib/dream.ts`:

- Raise `SKIP_TOP_RANKS` (currently 4).
- Narrow `MIN_SCORE` / `MAX_SCORE` toward 0.40–0.55.

If the dreams feel random / disconnected, widen the band:

- Lower `SKIP_TOP_RANKS`.
- Widen toward 0.30–0.70.

`DREAM_BUDGET` caps Claude calls per cycle (default 12).

## File map

```
app/
  layout.tsx              header/footer, fonts, dark shell
  page.tsx                home = ingest
  dreams/page.tsx         the morning letter
  api/ingest/route.ts     chunk + embed + insert
  api/dream/route.ts      bearer-auth trigger for the dream cycle
lib/
  dream.ts                core sampling + clustering + generation
  prompts.ts              system prompt + tool schema
  chunk.ts                tiktoken-based chunker
  embed.ts                batched OpenAI embeddings
  mongo.ts                cached client + collection helpers
  anthropic.ts · openai.ts · types.ts
components/
  IngestForm.tsx  DreamCard.tsx  CitationList.tsx  FadeIn.tsx
scripts/
  seed.ts                 41 varied seed memories
```

## Notes & limitations

- Single-user demo: no auth, `DEFAULT_USER_ID` is used everywhere.
- Paste-only ingestion for v1 (no file upload, no PDF).
- Dedup window is 7 days on `(seedMemoryId, citationIds)`.
- The model is chosen via `ANTHROPIC_MODEL` — swap to `claude-opus-4-7` for higher-quality prose at ~3–5× cost.
