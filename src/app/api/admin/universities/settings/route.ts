import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/universities/admin'
import { loadSettings, saveSettings } from '@/lib/universities/runner'
import { senderProblems, settingsFieldMessage } from '@/lib/universities/gate'
import { unknownPlaceholders } from '@/lib/universities/template'

const schema = z.object({
  from_name: z.string().trim().min(1).max(80),
  from_email: z.string().trim().email().max(120),
  reply_to: z.string().trim().email().max(120),
  daily_cap: z.number().int().min(1).max(200),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(6000),
})

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await loadSettings(createServiceClient()))
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: settingsFieldMessage(String(parsed.error.issues[0]?.path[0] ?? '')) }, { status: 400 })
  }
  const s = parsed.data
  const problems = senderProblems(s)
  if (problems.length) return NextResponse.json({ error: problems[0] }, { status: 400 })
  const bad = unknownPlaceholders(`${s.subject}\n${s.body}`)
  if (bad.length) return NextResponse.json({ error: `Unknown placeholder: {{${bad[0]}}}` }, { status: 400 })
  try {
    await saveSettings(createServiceClient(), s)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/universities/settings]', err)
    return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 500 })
  }
}
