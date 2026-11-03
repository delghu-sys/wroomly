/**
 * When overnight sends go out. Pure and dependency-free, so the dashboard
 * (browser) and the server compute exactly the same times, and every rule is
 * unit-tested.
 *
 * The aim: land in a European exchange office's inbox around the start of
 * their working day. Five to six hours ahead of Ann Arbor, 2:30 AM Michigan
 * time is 8:30 to 9:30 in most of Europe.
 */

export const SEND_TZ = 'America/Detroit'
export const SEND_HOUR = 2
export const SEND_MINUTE = 30
/** Minutes between messages in one batch, so they do not arrive as a blast. */
export const SEND_INTERVAL_MIN = 3
/** A start time closer than this is pushed to the next night: Resend needs a
 *  time that is still in the future when the request arrives. */
export const MIN_LEAD_MS = 10 * 60_000

type Parts = { y: number; mo: number; d: number; h: number; mi: number; s: number }

function partsIn(tz: string, instant: number): Parts {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  })
  const v: Record<string, number> = {}
  for (const p of f.formatToParts(new Date(instant))) if (p.type !== 'literal') v[p.type] = Number(p.value)
  return { y: v.year, mo: v.month, d: v.day, h: v.hour, mi: v.minute, s: v.second }
}

/** Milliseconds the zone is ahead of UTC at that instant (negative in the US). */
function offsetMs(tz: string, instant: number): number {
  const p = partsIn(tz, instant)
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(instant / 1000) * 1000
}

/** The UTC instant at which the wall clock in `tz` reads y-mo-d h:mi. */
function zonedToUtc(tz: string, y: number, mo: number, d: number, h: number, mi: number): number {
  const wall = Date.UTC(y, mo - 1, d, h, mi)
  let utc = wall - offsetMs(tz, wall)
  utc = wall - offsetMs(tz, utc) // second pass settles a daylight-saving change
  return utc
}

/** The next 2:30 AM (or `hour:minute`) in `tz` that is at least `leadMs` away. */
export function nextSendStart(
  now: Date,
  { tz = SEND_TZ, hour = SEND_HOUR, minute = SEND_MINUTE, leadMs = MIN_LEAD_MS }: { tz?: string; hour?: number; minute?: number; leadMs?: number } = {},
): Date {
  const t = partsIn(tz, now.getTime())
  for (let add = 0; add < 3; add++) {
    // Date.UTC normalises d + add across month ends.
    const day = new Date(Date.UTC(t.y, t.mo - 1, t.d + add))
    const at = zonedToUtc(tz, day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), hour, minute)
    if (at - now.getTime() >= leadMs) return new Date(at)
  }
  throw new Error('Could not work out the next send time.')
}

/**
 * Where a batch starts. Normally the next 2:30 AM; but if earlier messages are
 * already scheduled, the new ones queue AFTER the last of them, so two clicks
 * never put messages at the same minute.
 */
export function planStart(now: Date, latestScheduled: Date | null, intervalMin = SEND_INTERVAL_MIN): Date {
  const base = nextSendStart(now)
  if (!latestScheduled) return base
  const after = latestScheduled.getTime() + intervalMin * 60_000
  return new Date(Math.max(base.getTime(), after))
}

/** The i-th send time of a batch (0-based). */
export function slotAt(start: Date, i: number, intervalMin = SEND_INTERVAL_MIN): Date {
  return new Date(start.getTime() + i * intervalMin * 60_000)
}

/** "Wed, Nov 4 at 2:30 AM EST", in the send time zone. */
export function formatSlot(d: Date, tz = SEND_TZ): string {
  const day = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }).format(d)
  const time = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(d)
  return `${day} at ${time}`
}
