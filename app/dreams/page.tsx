import { ObjectId } from 'mongodb';
import Link from 'next/link';
import { dreamsCollection, memoriesCollection } from '@/lib/mongo';
import type { Dream, DreamWithCitations, Memory } from '@/lib/types';
import { DreamCard } from '@/components/DreamCard';
import { FadeIn } from '@/components/FadeIn';
import { DEMO_MODE, DEMO_DREAMS } from '@/lib/demo';

export const dynamic = 'force-dynamic';

async function loadDreams(userId: string): Promise<DreamWithCitations[]> {
  if (DEMO_MODE) return DEMO_DREAMS;

  const dreams = await dreamsCollection();
  const memories = await memoriesCollection();

  const recent = await dreams
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  if (recent.length === 0) return [];

  const refIds = new Set<string>();
  for (const d of recent) {
    refIds.add(d.seedMemoryId.toString());
    for (const c of d.citationIds) refIds.add(c.toString());
  }
  const refObjectIds = Array.from(refIds).map((s) => new ObjectId(s));

  const memDocs = await memories
    .find({ _id: { $in: refObjectIds } })
    .project({ _id: 1, content: 1, sourceType: 1, createdAt: 1 })
    .toArray();

  const memMap = new Map<string, Pick<Memory, '_id' | 'content' | 'sourceType' | 'createdAt'>>();
  for (const m of memDocs) {
    memMap.set(m._id.toString(), m as Pick<Memory, '_id' | 'content' | 'sourceType' | 'createdAt'>);
  }

  return recent.map((d: Dream): DreamWithCitations => ({
    ...d,
    seed: memMap.get(d.seedMemoryId.toString()) ?? null,
    citations: d.citationIds
      .map((id) => memMap.get(id.toString()))
      .filter((x): x is Pick<Memory, '_id' | 'content' | 'sourceType' | 'createdAt'> => !!x),
  }));
}

export default async function DreamsPage() {
  const userId = process.env.DEFAULT_USER_ID || 'demo-user';
  const dreams = await loadDreams(userId);

  if (dreams.length === 0) {
    return (
      <section className="mx-auto max-w-reading px-5 sm:px-6">
        <FadeIn>
          <p className="font-serif italic text-lg sm:text-xl text-ink-muted leading-relaxed">
            no dreams yet. leave something in the log, or run{' '}
            <code className="font-sans text-sm not-italic text-ink-accent">pnpm dream:local</code>{' '}
            to wake the agent.
          </p>
          <p className="mt-6 font-sans text-sm text-ink-muted">
            <Link href="/" className="hover:text-ink-accent transition-colors">
              &larr; back to the log
            </Link>
          </p>
        </FadeIn>
      </section>
    );
  }

  const latest = dreams[0];
  const latestDate = new Date(latest.createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <section className="mx-auto max-w-reading px-5 sm:px-6">
      <FadeIn>
        <p className="font-sans text-[11px] sm:text-xs uppercase tracking-[0.18em] sm:tracking-[0.2em] text-ink-muted mb-3 sm:mb-4">
          the morning letter &middot; {latestDate}
        </p>
      </FadeIn>
      <FadeIn delay={100}>
        <h1 className="font-serif italic text-[2rem] sm:text-4xl leading-tight text-ink-text mb-10 sm:mb-16">
          what we dreamt for you.
        </h1>
      </FadeIn>
      <div>
        {dreams.map((dream, i) => (
          <DreamCard key={dream._id.toString()} dream={dream} index={i} />
        ))}
      </div>
    </section>
  );
}
