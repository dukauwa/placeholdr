import { IngestForm } from '@/components/IngestForm';
import { FadeIn } from '@/components/FadeIn';

export default function HomePage() {
  return (
    <section className="mx-auto max-w-prose px-5 sm:px-6">
      <FadeIn>
        <h1 className="font-serif italic text-[2.25rem] sm:text-5xl leading-[1.1] text-ink-text mb-5 sm:mb-6">
          leave something for the night to read.
        </h1>
      </FadeIn>
      <FadeIn delay={120}>
        <p className="font-serif text-base sm:text-lg leading-relaxed text-ink-muted mb-10 sm:mb-12">
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
