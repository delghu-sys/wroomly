import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// Whitelist of filter keys we accept. Mirrors what /listings/page.tsx
// reads. Lets us reject random garbage keys a client might POST.
const ALLOWED_KEYS = [
  'q',
  'type',
  'neighborhood',
  'property_type',
  'residence_name',
  'min_price',
  'max_price',
  'bedrooms',
  'available_from',
  'furnished',
  'pets',
] as const

const createSchema = z.object({
  name: z.string().max(80).optional().nullable(),
  filters: z.record(z.string(), z.string()).default({}),
  email_alerts: z.boolean().default(true),
})

/**
 * POST /api/saved-searches — save the current filter combo.
 * GET  /api/saved-searches — list the auth user's saved searches.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: z.infer<typeof createSchema>
  try {
    body = createSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Sanitize filters — drop unknown keys, drop blank values.
  const cleanFilters: Record<string, string> = {}
  for (const [k, v] of Object.entries(body.filters)) {
    if (!(ALLOWED_KEYS as readonly string[]).includes(k)) continue
    const trimmed = v.trim()
    if (trimmed) cleanFilters[k] = trimmed.slice(0, 120)
  }

  // Cap saved searches per user so a malicious client can't flood
  // the table. 20 is plenty for a real student.
  const { count } = await supabase
    .from('saved_searches')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if ((count ?? 0) >= 20) {
    return NextResponse.json(
      { error: 'You already have 20 saved searches. Delete one to add another.' },
      { status: 409 },
    )
  }

  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      user_id: user.id,
      name: body.name?.trim() || null,
      filters: cleanFilters,
      email_alerts: body.email_alerts,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[saved-searches] insert failed', error)
    return NextResponse.json({ error: 'Could not save search' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, search: data })
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ searches: data ?? [] })
}
