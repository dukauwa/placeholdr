#!/usr/bin/env node
/**
 * Dreamlog reading view — renders today's dreams (or the last N) with the
 * editorial/serif feel preserved in monospace: muted metadata, italic opener,
 * generous whitespace, indented citations. Strips ANSI when not a TTY.
 *
 * Usage:
 *   dreamlog-read today
 *   dreamlog-read log [N=20]
 */

import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const DREAMLOG_HOME =
  process.env.DREAMLOG_HOME || join(homedir(), '.dreamlog');
const DB_PATH = join(DREAMLOG_HOME, 'dreamlog.db');

const WIDTH = 70;
const INDENT = '  ';
const CITATION_INDENT = '    ';
const USE_ANSI = process.stdout.isTTY;

const ansi = {
  reset: USE_ANSI ? '\x1b[0m' : '',
  bold: USE_ANSI ? '\x1b[1m' : '',
  italic: USE_ANSI ? '\x1b[3m' : '',
  dim: USE_ANSI ? '\x1b[2m' : '',
  gray: USE_ANSI ? '\x1b[38;5;244m' : '',
  muted: USE_ANSI ? '\x1b[38;5;250m' : '',
  accent: USE_ANSI ? '\x1b[38;5;179m' : '', // dim gold
};

function wrap(text, width, indent = '') {
  const out = [];
  for (const paragraph of text.split(/\n\n+/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = indent;
    for (const w of words) {
      const proposed = line === indent ? indent + w : `${line} ${w}`;
      if (proposed.length > width && line !== indent) {
        out.push(line);
        line = indent + w;
      } else {
        line = proposed;
      }
    }
    if (line.trim()) out.push(line);
    out.push('');
  }
  return out.join('\n').replace(/\n+$/, '\n');
}

function formatTime(isoLike) {
  // stored as "YYYY-MM-DD HH:MM:SS" (UTC); convert to local
  const asIso = isoLike.replace(' ', 'T') + 'Z';
  const d = new Date(asIso);
  return d
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    .toLowerCase()
    .replace(/\s/g, '');
}

function formatDate(isoLike) {
  const asIso = isoLike.replace(' ', 'T') + 'Z';
  const d = new Date(asIso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncate(s, n) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + '…';
}

function renderDream(dream, citationRows) {
  const lines = [];

  // caption line
  const caption = `${ansi.gray}${ansi.dim}— ${dream.type} · dreamt at ${formatTime(
    dream.created_at,
  )} · ${formatDate(dream.created_at)}${ansi.reset}`;
  lines.push(INDENT + caption);
  lines.push('');

  // title
  lines.push(
    INDENT +
      `${ansi.bold}${ansi.muted}${dream.title.toLowerCase()}${ansi.reset}`,
  );
  lines.push('');

  // body — italicize the first line only as a drop-cap
  const paragraphs = dream.body.split(/\n\n+/);
  const wrapped = wrap(paragraphs.join('\n\n'), WIDTH - INDENT.length, '')
    .trimEnd()
    .split('\n');
  for (let i = 0; i < wrapped.length; i++) {
    const raw = wrapped[i];
    if (i === 0 && raw.trim()) {
      lines.push(INDENT + `${ansi.italic}${raw}${ansi.reset}`);
    } else {
      lines.push(INDENT + raw);
    }
  }
  lines.push('');

  // citations
  if (citationRows.length > 0) {
    lines.push(
      CITATION_INDENT +
        `${ansi.gray}${ansi.dim}citations${ansi.reset}`,
    );
    for (const c of citationRows) {
      const preview = truncate(c.content.replace(/\s+/g, ' '), 80);
      lines.push(
        CITATION_INDENT +
          `${ansi.gray}· ${preview}${ansi.reset}`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

function renderSeparator() {
  const dots = '· · ·';
  const pad = ' '.repeat(Math.max(0, Math.floor((WIDTH - dots.length) / 2)));
  return `${pad}${ansi.gray}${dots}${ansi.reset}\n`;
}

function renderHeader(mode, count) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const heading =
    mode === 'today'
      ? 'what we dreamt for you.'
      : `recent dreams (${count}).`;
  const sub =
    mode === 'today' ? `the morning letter · ${today}` : 'from the log';
  return [
    '',
    INDENT + `${ansi.gray}${ansi.dim}${sub}${ansi.reset}`,
    '',
    INDENT + `${ansi.italic}${ansi.muted}${heading}${ansi.reset}`,
    '',
    '',
  ].join('\n');
}

function emptyMessage(mode) {
  const lines =
    mode === 'today'
      ? [
          '',
          INDENT +
            `${ansi.italic}${ansi.gray}no dream yet today.${ansi.reset}`,
          '',
          INDENT +
            `${ansi.gray}try ${ansi.accent}/dreamlog:dream${ansi.gray} to wake the agent,${ansi.reset}`,
          INDENT +
            `${ansi.gray}or ${ansi.accent}/dreamlog:demo${ansi.gray} to see how it feels.${ansi.reset}`,
          '',
        ]
      : [
          '',
          INDENT + `${ansi.italic}${ansi.gray}the log is empty.${ansi.reset}`,
          '',
        ];
  return lines.join('\n');
}

// -----------------------------------------------------------------------------
// main
// -----------------------------------------------------------------------------

function main() {
  const [mode = 'today', arg] = process.argv.slice(2);

  if (!existsSync(DB_PATH)) {
    process.stdout.write(emptyMessage(mode));
    return;
  }

  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  db.pragma('journal_mode');

  let dreams;
  if (mode === 'today') {
    dreams = db
      .prepare(
        `SELECT * FROM dreams
         WHERE date(created_at, 'localtime') = date('now', 'localtime')
         ORDER BY created_at DESC`,
      )
      .all();
  } else if (mode === 'log') {
    const limit = Number(arg) || 20;
    dreams = db
      .prepare(`SELECT * FROM dreams ORDER BY created_at DESC LIMIT ?`)
      .all(limit);
  } else {
    process.stderr.write(`unknown mode: ${mode}\n`);
    process.exit(2);
  }

  if (dreams.length === 0) {
    process.stdout.write(emptyMessage(mode));
    return;
  }

  const refIds = new Set();
  for (const d of dreams) {
    refIds.add(d.seed_memory_id);
    for (const cid of JSON.parse(d.citation_ids_json)) refIds.add(cid);
  }
  const refArr = [...refIds];
  const memRows = refArr.length
    ? db
        .prepare(
          `SELECT id, content FROM memories WHERE id IN (${refArr
            .map(() => '?')
            .join(',')})`,
        )
        .all(...refArr)
    : [];
  const memMap = new Map(memRows.map((r) => [r.id, r]));

  let out = renderHeader(mode, dreams.length);
  for (let i = 0; i < dreams.length; i++) {
    const d = dreams[i];
    const cids = JSON.parse(d.citation_ids_json);
    const citations = cids.map((id) => memMap.get(id)).filter(Boolean);
    out += renderDream(d, citations);
    if (i < dreams.length - 1) out += renderSeparator();
  }
  process.stdout.write(out);
}

main();
