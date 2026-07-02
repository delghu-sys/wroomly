import { NextResponse } from 'next/server'
import { z } from 'zod'
import { extractProfile, type ChatTurnInput } from '@/lib/match/llm'
import { humanizeProfile } from '@/lib/match/profile'
import { allowMatchRequest, CRITERIA_LIMITS } from '@/lib/match/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * POST /api/match/criteria
 *
 * Called once the concierge chat finishes. Parses the full transcript into a
 * normalized weighted MatchProfile and returns it with human-readable summary
 * tags for the confirm screen. No DB write yet — that happens on
 * /api/match/alerts after the renter confirms and gives their email.
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
    .max(60),
})

export async function POST(request: Request) {
  let history: ChatTurnInput[]
  try {
    const parsed = bodySchema.parse(await request.json())
    history = parsed.messages
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Public + anonymous LLM extraction — bound total cost with a global breaker.
  if (!(await allowMatchRequest({ bucket: 'criteria' }, CRITERIA_LIMITS))) {
    return NextResponse.json(
      { error: 'We’re summarizing a lot of chats right now. Please try again in a bit.' },
      { status: 429 },
    )
  }

  try {
    const profile = await extractProfile(history)
    return NextResponse.json({
      profile,
      tags: humanizeProfile(profile),
      summary: profile.summary,
    })
  } catch (err) {
    console.error('[match/criteria] extraction failed', err)
    return NextResponse.json(
      { error: 'Could not summarize your preferences. Please try again.' },
      { status: 503 },
    )
  }
}
