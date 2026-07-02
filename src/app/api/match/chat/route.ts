import { NextResponse } from 'next/server'
import { z } from 'zod'
import { streamChatTurn, type ChatTurnInput } from '@/lib/match/llm'
import { allowMatchRequest, CHAT_LIMITS } from '@/lib/match/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/match/chat
 *
 * One turn of the concierge interview, TRUE-streamed: prose tokens are
 * forwarded to the client the moment the model emits them (no buffer-then-
 * dribble), followed by a final control frame with quick-reply chips + the
 * `finished` flag parsed from the model's control line.
 *
 * Public + anonymous on purpose (no account needed). It only talks to the
 * LLM — no DB writes happen here, so there's nothing to authorize.
 *
 * Frames (newline-delimited JSON):
 *   {"t":"chunk","v":"Hey "}
 *   {"t":"end","chips":[...],"multi":false,"finished":false}
 */
const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(2000),
      }),
    )
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

  // Public + anonymous LLM call — refuse before hitting Anthropic once the
  // global circuit-breaker trips, so this can't be scripted into a big bill.
  if (!(await allowMatchRequest({ bucket: 'chat' }, CHAT_LIMITS))) {
    return NextResponse.json(
      { error: 'The concierge is busy right now. Please try again in a bit.' },
      { status: 429 },
    )
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
      try {
        const control = await streamChatTurn(history, chunk =>
          send({ t: 'chunk', v: chunk }),
        )
        send({ t: 'end', ...control })
      } catch (err) {
        console.error('[match/chat] turn failed', err)
        // The client treats a missing 'end' frame after an error frame as a
        // retryable failure.
        send({ t: 'error', v: 'The concierge is unavailable right now. Please try again.' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
    },
  })
}
