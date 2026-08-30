import fs from 'node:fs'
import path from 'node:path'
import { marked, type Tokens } from 'marked'

/**
 * Shared renderer for the three legal pages (/privacy, /terms, /safety).
 *
 * The pages render the markdown in content/legal/ VERBATIM — the policy text
 * is the legal instrument, so this file does formatting only and never touches
 * wording. If a sentence in a policy needs changing, change the markdown (and
 * mind the 14-day-notice promise in the Terms), not this renderer.
 *
 * Server component: reads the file at render time, parses with marked, and
 * emits HTML we style below. The content is repo-controlled (never user
 * input), which is what makes dangerouslySetInnerHTML acceptable here.
 */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&[a-z]+;|<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export interface LegalHeading {
  id: string
  text: string
  level: number
}

function parseLegal(markdown: string): {
  title: string
  effectiveLine: string | null
  html: string
  headings: LegalHeading[]
} {
  const tokens = marked.lexer(markdown)
  const headings: LegalHeading[] = []
  let title = ''
  let effectiveLine: string | null = null

  // Pull the H1 (page chrome renders it) and the effective-date line so
  // "Last updated" is visible at the top per the implementation package.
  const body = Object.assign([] as unknown as typeof tokens, { links: tokens.links })
  for (const t of tokens) {
    if (t.type === 'heading' && t.depth === 1 && !title) {
      title = t.text
      continue
    }
    if (
      !effectiveLine &&
      t.type === 'paragraph' &&
      t.text.startsWith('Effective date:')
    ) {
      effectiveLine = t.text
      continue
    }
    body.push(t)
  }

  const renderer = new marked.Renderer()
  const seen = new Map<string, number>()
  renderer.heading = function ({ tokens: inline, depth }: Tokens.Heading) {
    const inner = this.parser.parseInline(inline)
    const plain = inner.replace(/<[^>]+>/g, '')
    let id = slugify(plain)
    const n = seen.get(id) ?? 0
    seen.set(id, n + 1)
    if (n > 0) id = `${id}-${n}`
    headings.push({ id, text: plain, level: depth })
    // Stable alias so product surfaces can deep-link /safety#fair-housing
    // without depending on the heading's full generated slug.
    const alias = /fair housing/i.test(plain)
      ? '<span id="fair-housing" aria-hidden="true"></span>'
      : ''
    return `<h${depth} id="${id}">${alias}<a href="#${id}" class="legal-anchor" aria-label="Link to this section">${inner}</a></h${depth}>\n`
  }

  const html = marked.parser(body, { renderer })
  return { title, effectiveLine, html, headings }
}

export function loadLegalDoc(filename: string) {
  const md = fs.readFileSync(
    path.join(process.cwd(), 'content', 'legal', filename),
    'utf-8',
  )
  return parseLegal(md)
}

export function LegalPage({
  doc,
}: {
  doc: ReturnType<typeof loadLegalDoc>
}) {
  const toc = doc.headings.filter(h => h.level === 2)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <header className="max-w-[70ch] legal-header">
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink leading-[1.05]">
          {doc.title}
        </h1>
        {doc.effectiveLine && (
          <p className="mt-3 text-[13px] text-ink-muted">{doc.effectiveLine}</p>
        )}
      </header>

      <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-12">
        {/* Mobile: collapsible ToC above the content */}
        <details className="lg:hidden mb-8 rounded-2xl border border-line bg-surface px-4 py-3 legal-toc-mobile">
          <summary className="text-sm font-semibold text-ink cursor-pointer select-none">
            On this page
          </summary>
          <ol className="mt-3 space-y-1.5">
            {toc.map(h => (
              <li key={h.id}>
                <a href={`#${h.id}`} className="text-[13px] text-ink-soft hover:text-ink">
                  {h.text}
                </a>
              </li>
            ))}
          </ol>
        </details>

        <article
          className="legal-prose max-w-[70ch] min-w-0"
          dangerouslySetInnerHTML={{ __html: doc.html }}
        />

        {/* Desktop: sticky ToC */}
        <nav aria-label="Table of contents" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="text-[10.5px] uppercase tracking-[0.18em] text-ink-muted font-semibold mb-3">
              On this page
            </p>
            <ol className="space-y-2 border-l border-line pl-4">
              {toc.map(h => (
                <li key={h.id}>
                  <a
                    href={`#${h.id}`}
                    className="block text-[13px] leading-snug text-ink-soft hover:text-ink transition-colors"
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>
      </div>
    </div>
  )
}
