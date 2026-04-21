import { FadeIn } from './FadeIn';
import { CitationList } from './CitationList';
import type { DreamWithCitations } from '@/lib/types';

function formatTime(d: Date): string {
  return d
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    .toLowerCase()
    .replace(/\s/g, '');
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DreamCard({
  dream,
  index,
}: {
  dream: DreamWithCitations;
  index: number;
}) {
  const created = new Date(dream.createdAt);

  return (
    <FadeIn delay={index * 80}>
      <article className="py-16 first:pt-0 border-b border-ink-rule last:border-b-0">
        <div className="font-sans text-xs uppercase tracking-[0.2em] text-ink-muted mb-6">
          <span>dreamt at {formatTime(created)}</span>
          <span className="mx-2 text-ink-rule">·</span>
          <span>{dream.type}</span>
          <span className="mx-2 text-ink-rule">·</span>
          <span>{formatDate(created)}</span>
        </div>
        <h2 className="font-serif italic text-3xl text-ink-text mb-6 leading-tight">
          {dream.title}
        </h2>
        <div className="dream-body font-serif text-lg leading-[1.75] text-ink-text/95">
          {dream.body.split(/\n\n+/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
        <CitationList
          citations={dream.citations.map((c) => ({
            id: c._id.toString(),
            content: c.content,
          }))}
        />
      </article>
    </FadeIn>
  );
}
