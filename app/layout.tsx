import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500'],
  display: 'swap',
});

const serif = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'dreamlog',
  description: 'An agent that dreams from your notes.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0b0d',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-screen bg-ink-bg text-ink-text antialiased">
        <header className="mx-auto max-w-reading px-5 pt-8 pb-12 sm:px-6 sm:pt-10 sm:pb-16">
          <nav className="flex items-baseline justify-between text-sm">
            <Link
              href="/"
              className="font-serif italic text-lg tracking-tight text-ink-text hover:text-ink-accent transition-colors"
            >
              dreamlog
            </Link>
            <div className="flex gap-4 sm:gap-6 font-sans text-ink-muted">
              <Link href="/" className="hover:text-ink-text transition-colors">
                ingest
              </Link>
              <Link href="/dreams" className="hover:text-ink-text transition-colors">
                dreams
              </Link>
            </div>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="mx-auto max-w-reading px-5 py-12 sm:px-6 sm:py-16 text-xs font-sans text-ink-muted">
          <span className="font-serif italic">dreamt nightly.</span>
        </footer>
      </body>
    </html>
  );
}
