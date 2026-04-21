'use client';

import { useState } from 'react';

type Citation = { id: string; content: string };

export function CitationList({ citations }: { citations: Citation[] }) {
  const [open, setOpen] = useState(false);

  if (citations.length === 0) return null;

  return (
    <div className="mt-8 border-t border-ink-rule pt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="font-sans text-xs uppercase tracking-widest text-ink-muted hover:text-ink-accent transition-colors"
      >
        {open ? 'hide citations' : `citations (${citations.length})`}
      </button>
      {open && (
        <ul className="mt-4 flex flex-col gap-3">
          {citations.map((c, i) => (
            <li
              key={c.id}
              className="font-serif text-sm text-ink-muted leading-relaxed border-l border-ink-rule pl-4"
            >
              <span className="mr-2 font-sans text-xs text-ink-muted/70">[{i + 1}]</span>
              {c.content}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
