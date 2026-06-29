import { NextResponse } from 'next/server'
import { z } from 'zod'
import { nextChatTurn, type ChatTurnInput } from '@/lib/match/llm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * POST /api/match/chat
 *
 * Drives one adaptive turn of the Wroomly Match interview. Body is the running
 * transcript; we ask the LLM for the next message + chips, then stream the
 * message text to the client as NDJSON so it renders progressively (matching the
 * design's typing feel), followed by a final control frame with chips + the
 * `finished` flag.
 *
 * Public + anonymous on purpose (no account needed). It only talks to the LLM —
 * no DB writes happen here, so there's nothing to authorize.
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

  let turn
  try {
    turn = await nextChatTurn(history)
  } catch (err) {
    console.error('[match/chat] turn failed', err)
    return NextResponse.json(
      { error: 'The assistant is unavailable right now. Please try again.' },
      { status: 503 },
    )
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))

      // Stream the message word-by-word for a natural typing reveal.
      const words = turn.message.split(/(\s+)/) // keep the whitespace tokens
      for (const w of words) {
        if (!w) continue
        send({ t: 'chunk', v: w })
        // Small jitter so it reads like typing, capped so it never drags.
        await new Promise(r => setTimeout(r, 18))
      }

      send({
        t: 'end',
        chips: turn.chips,
        multi: turn.multi,
        finished: turn.finished,
      })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
    },
  })
}
