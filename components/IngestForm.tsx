'use client';

import { useState, useTransition } from 'react';

type Status =
  | { kind: 'idle' }
  | { kind: 'saved'; inserted: number; tokenCount: number }
  | { kind: 'error'; message: string };

export function IngestForm() {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [pending, startTransition] = useTransition();

  const approxTokens = Math.ceil(content.length / 4);

  async function submit() {
    if (!content.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Ingest failed');
        }
        const data = (await res.json()) as { inserted: number; tokenCount: number };
        setStatus({ kind: 'saved', inserted: data.inserted, tokenCount: data.tokenCount });
        setContent('');
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Ingest failed';
        setStatus({ kind: 'error', message });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          if (status.kind !== 'idle') setStatus({ kind: 'idle' });
        }}
        rows={10}
        placeholder="paste a journal entry, a handful of notes, an overheard line, half a thought..."
        className="w-full resize-y rounded-sm border border-ink-rule bg-transparent p-4 sm:p-5 font-serif text-base sm:text-lg leading-relaxed text-ink-text placeholder:text-ink-muted/60 focus:border-ink-accent focus:outline-none"
      />
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-sans text-ink-muted">
        <span>{content ? `${approxTokens} tokens approx.` : 'nothing yet.'}</span>
        <button
          onClick={submit}
          disabled={pending || !content.trim()}
          className="font-sans uppercase tracking-widest text-ink-text border border-ink-rule px-4 py-2 hover:border-ink-accent hover:text-ink-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? 'committing' : 'commit to the log'}
        </button>
      </div>
      {status.kind === 'saved' && (
        <p className="font-serif italic text-ink-accent text-sm animate-riseIn">
          saved. {status.inserted} {status.inserted === 1 ? 'fragment' : 'fragments'} rest in
          the memory now.
        </p>
      )}
      {status.kind === 'error' && (
        <p className="font-sans text-sm text-red-400 animate-riseIn">{status.message}</p>
      )}
    </div>
  );
}
