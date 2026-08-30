#!/usr/bin/env node
/**
 * proseLint — catches "AI-sounding" prose before it ships.
 *
 * Not a grammar checker. It measures the three things that actually make
 * copy read as machine-written, based on an audit of our own content:
 *
 *   1. em-dash density   — our guides ran 30-35% of sentences; edited human
 *                          prose sits nearer 2-5%.
 *   2. no short sentences — buildings.ts was 4.5% short vs ~20-30% for human
 *                          editorial. This is what makes a page feel like a
 *                          wall of text.
 *   3. long-sentence runs — 3+ consecutive 20+ word sentences with no break.
 *
 * Usage:
 *   node scripts/proseLint.mjs                 # lint the default content files
 *   node scripts/proseLint.mjs path/to/file.ts # lint specific files
 */

import { readFileSync } from 'node:fs'

const DEFAULT_FILES = [
  'src/lib/seo/guides.ts',
  'src/lib/seo/buildings.ts',
  'src/lib/seo/neighborhoods.ts',
  'src/lib/seo/faq.ts',
]

// Two genres, two bars. Narrative copy (intros, guide sections) is read
// top-to-bottom and needs rhythm. FAQ answers are self-contained ~40-60 word
// snippets quoted verbatim as FAQPage JSON-LD — they are legitimately denser,
// and forcing 8-word sentences into them would damage the snippet. Both still
// get the em-dash cap, because a dash-aside reads as machine-written anywhere.
const NARRATIVE = {
  label: 'narrative',
  maxEmdashPct: 10,
  minShortPct: 15,
  maxLongPct: 45,
  maxLongRun: 3,
}
const SNIPPET = {
  label: 'FAQ snippet',
  maxEmdashPct: 10,
  minShortPct: 0, // not a reading experience; density is correct here
  maxLongPct: 60,
  maxLongRun: 3,
}

/** Pull prose out of a TS/TSX source file: quoted strings long enough to be
 *  sentences, skipping code-ish content (imports, classNames, comments).
 *  Template-literal placeholders like ${name} are replaced with a stand-in
 *  word rather than excluded — most building/neighborhood copy is templated. */
function extractProse(rawSrc) {
  // Strip comments first — an apostrophe in a comment ("don't") otherwise
  // opens a bogus string and swallows the real copy after it.
  const src = rawSrc
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')

  const out = []
  const re = /(['"`])((?:[^\\]|\\.)*?)\1/gs
  let m
  while ((m = re.exec(src)) !== null) {
    let s = m[2]
    if (s.length < 60) continue
    if (/^[\s\w-]*$/.test(s)) continue // class-name-ish
    if (/=>|https?:|className|Rules for editing/.test(s)) continue
    s = s.replace(/\$\{[^}]*\}/g, 'Placeholder') // keep templated prose
    if (/[<>{}]/.test(s)) continue // real markup/code, not copy
    if (!/[.!?]/.test(s)) continue // no sentence punctuation

    // Classify by the field it was assigned to: `answer:` is a FAQ snippet.
    const preceding = src.slice(Math.max(0, m.index - 60), m.index)
    const genre = /answer:\s*\n?\s*$/.test(preceding) ? SNIPPET : NARRATIVE
    out.push({ text: s.replace(/\\'/g, "'").replace(/\\n/g, ' '), genre })
  }
  return out
}

/** Sentences grouped by the paragraph they came from. Runs of long sentences
 *  are only meaningful inside one paragraph — a reader never experiences two
 *  separate pages' copy as a single stream, so runs must not span blocks. */
function sentencesByBlock(prose) {
  return prose
    .map(p => ({
      genre: p.genre,
      sents: p.text
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.split(/\s+/).length >= 3),
    }))
    .filter(block => block.sents.length > 0)
}

/** Score one genre's blocks against its own thresholds. */
function scoreGenre(blocks, rules) {
  const sents = blocks.flatMap(b => b.sents)
  if (sents.length < 5) return null

  const lens = sents.map(s => s.split(/\s+/).length)
  const emdash = sents.filter(s => s.includes('—')).length
  const short = lens.filter(n => n <= 8).length
  const long = lens.filter(n => n > 20).length

  // Longest run of consecutive long sentences, measured within a paragraph.
  let worstRun = 0
  for (const block of blocks) {
    let run = 0
    for (const s of block.sents) {
      if (s.split(/\s+/).length > 20) {
        run++
        worstRun = Math.max(worstRun, run)
      } else run = 0
    }
  }

  const pct = n => (n / sents.length) * 100
  const problems = []
  if (pct(emdash) > rules.maxEmdashPct)
    problems.push(
      `em-dashes in ${pct(emdash).toFixed(0)}% of sentences (max ${rules.maxEmdashPct}%) — replace with a period, comma, or parentheses`,
    )
  if (pct(short) < rules.minShortPct)
    problems.push(
      `only ${pct(short).toFixed(0)}% short sentences (min ${rules.minShortPct}%) — break some long ones in two`,
    )
  if (pct(long) > rules.maxLongPct)
    problems.push(
      `${pct(long).toFixed(0)}% of sentences exceed 20 words (max ${rules.maxLongPct}%)`,
    )
  if (worstRun > rules.maxLongRun)
    problems.push(
      `${worstRun} long sentences in a row (max ${rules.maxLongRun}) — no breathing room`,
    )

  return {
    label: rules.label,
    count: sents.length,
    emdashPct: pct(emdash),
    shortPct: pct(short),
    longPct: pct(long),
    worstRun,
    problems,
  }
}

function analyze(file) {
  let src
  try {
    src = readFileSync(file, 'utf8')
  } catch {
    return { file, skipped: 'unreadable' }
  }
  const blocks = sentencesByBlock(extractProse(src))
  if (blocks.flatMap(b => b.sents).length < 5)
    return { file, skipped: 'not enough prose' }

  const parts = [
    scoreGenre(
      blocks.filter(b => b.genre === NARRATIVE),
      NARRATIVE,
    ),
    scoreGenre(
      blocks.filter(b => b.genre === SNIPPET),
      SNIPPET,
    ),
  ].filter(Boolean)

  return { file, parts }
}

const files = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_FILES
let failed = false

for (const f of files) {
  const r = analyze(f)
  if (r.skipped) {
    console.log(`\n  ${f}\n    skipped (${r.skipped})`)
    continue
  }
  const ok = r.parts.every(p => p.problems.length === 0)
  if (!ok) failed = true
  console.log(`\n${ok ? '  PASS' : '  FAIL'}  ${f}`)
  for (const p of r.parts) {
    console.log(
      `    ${p.label.padEnd(11)} ${String(p.count).padStart(3)} sentences | em-dash ${p.emdashPct.toFixed(0).padStart(2)}% | short ${p.shortPct.toFixed(0).padStart(2)}% | long ${p.longPct.toFixed(0).padStart(2)}% | run ${p.worstRun}`,
    )
    for (const problem of p.problems) console.log(`      - ${problem}`)
  }
}

console.log(
  failed
    ? '\nProse reads machine-written in at least one file. See notes above.\n'
    : '\nAll files read as human-edited prose.\n',
)
process.exit(failed ? 1 : 0)
