import { NextResponse } from 'next/server'
import { z } from 'zod'
import { extractCriteria, type ChatTurnInput } from '@/lib/match/llm'
import { humanizeCriteria } from '@/lib/match/criteria'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * POST /api/match/criteria
 *
 * Called once the chat is finished. Parses the full transcript into a strict,
 * normalized MatchCriteria and returns it alongside human-readable summary tags
 * for the confirm screen. No DB write yet — that happens on /api/match/alerts
 * after the renter confirms and gives their email.
 */
const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(40),
})

export async function POST(request: Request) {
  let history: ChatTurnInput[]
  try {
    const parsed = bodySchema.parse(await request.json())
    history = parsed.messages
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const criteria = await extractCriteria(history)
    return NextResponse.json({ criteria, tags: humanizeCriteria(criteria) })
  } catch (err) {
    console.error('[match/criteria] extraction failed', err)
    return NextResponse.json(
      { error: 'Could not summarize your preferences. Please try again.' },
      { status: 503 },
    )
  }
}
