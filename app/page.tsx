import { IngestForm } from '@/components/IngestForm';
import { FadeIn } from '@/components/FadeIn';

export default function HomePage() {
  return (
    <section className="mx-auto max-w-prose px-6">
      <FadeIn>
        <h1 className="font-serif italic text-5xl leading-tight text-ink-text mb-6">
          leave something for the night to read.
        </h1>
      </FadeIn>
      <FadeIn delay={120}>
        <p className="font-serif text-lg leading-relaxed text-ink-muted mb-12">
          dreamlog reads your notes while you sleep and returns, come morning, with one small
          thread it found between them &mdash; a hypothesis, a question, a strange bridge.
          paste anything below: a journal entry, a handful of tweets, a page of thinking.
        </p>
      </FadeIn>
      <FadeIn delay={240}>
        <IngestForm />
      </FadeIn>
    </section>
  );
}
