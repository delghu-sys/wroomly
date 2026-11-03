/**
 * Tracking for leads we contact BY HAND on another site's own messenger
 * (SubLeaps, RotatingRoom, Reddit). Email outreach has its own pipeline; this
 * is the same idea for a channel with no email address: record what was sent,
 * record what came back, and say what to do next.
 *
 * Pure, so every rule is unit-tested. The thread lives on the lead, in
 * `extracted.manual`, so it needs no migration.
 *
 * The rules, on purpose:
 *  - ONE follow-up, a few days after the first message with no reply. Then it
 *    is closed. People on a rental site did not ask to be chased.
 *  - A reply is never answered automatically. The next message is prepared and
 *    shown, a person sends it.
 *  - A "no" closes the thread; nothing more is suggested.
 */

export type ManualState = 'waiting' | 'replied' | 'listed' | 'declined' | 'closed'
export type MessageKind = 'first' | 'follow-up' | 'claim' | 'reply'

export interface ManualMessage {
  dir: 'out' | 'in'
  at: string
  text: string
  kind?: MessageKind
}

export interface ManualThread {
  channel: string
  channelLabel: string
  conversationUrl?: string
  state: ManualState
  messages: ManualMessage[]
  /** Set when a claim link was last issued for this lead's draft. */
  claimLinkIssuedAt?: string
}

/** Days with no reply before the single follow-up is suggested. */
export const FOLLOWUP_AFTER_DAYS = 3
/** Days after the follow-up with no reply before the thread is closed. */
export const CLOSE_AFTER_DAYS = 4

export const CLAIM_PLACEHOLDER = '{{claim_link}}'

/** A claim link is a secret that opens someone's draft. The conversation log
 *  keeps the words but never the link. */
export function redactClaimLinks(text: string): string {
  return text.replace(/https?:\/\/\S*\/claim-listing\/\S+/g, '[claim link]')
}

const DAY = 86_400_000
const STATES: ManualState[] = ['waiting', 'replied', 'listed', 'declined', 'closed']

/** The thread on a lead's `extracted` bag, or null. Tolerant of a bad shape. */
export function readManual(extracted: Record<string, unknown> | null | undefined): ManualThread | null {
  const m = extracted?.manual as Partial<ManualThread> | undefined
  if (!m || typeof m !== 'object' || typeof m.channel !== 'string' || !Array.isArray(m.messages)) return null
  return {
    channel: m.channel,
    channelLabel: typeof m.channelLabel === 'string' ? m.channelLabel : m.channel,
    conversationUrl: typeof m.conversationUrl === 'string' ? m.conversationUrl : undefined,
    state: STATES.includes(m.state as ManualState) ? (m.state as ManualState) : 'waiting',
    messages: m.messages
      .filter((x): x is ManualMessage => !!x && (x.dir === 'out' || x.dir === 'in') && typeof x.at === 'string' && typeof x.text === 'string')
      .map(x => ({ dir: x.dir, at: x.at, text: x.text, kind: x.kind })),
    claimLinkIssuedAt: typeof m.claimLinkIssuedAt === 'string' ? m.claimLinkIssuedAt : undefined,
  }
}

export function startThread(opts: { channel: string; channelLabel: string; conversationUrl?: string; text: string; at: string }): ManualThread {
  return {
    channel: opts.channel,
    channelLabel: opts.channelLabel,
    conversationUrl: opts.conversationUrl,
    state: 'waiting',
    messages: [{ dir: 'out', at: opts.at, text: opts.text, kind: 'first' }],
  }
}

/** A new message. An incoming one moves a waiting thread to "replied"; a
 *  finished thread (listed, declined) stays finished. Never mutates. */
export function addMessage(t: ManualThread, m: ManualMessage): ManualThread {
  let state = t.state
  if (m.dir === 'in' && (state === 'waiting' || state === 'closed')) state = 'replied'
  if (m.dir === 'out' && state === 'replied') state = 'waiting'
  return { ...t, state, messages: [...t.messages, m] }
}

export function setState(t: ManualThread, state: ManualState): ManualThread {
  return { ...t, state }
}

export type ReplyTone = 'positive' | 'negative' | 'question'

const NEGATIVE = /\b(not interested|no thanks|no thank you|stop|leave me|don'?t (message|contact|want)|do not (message|contact)|already (rented|filled|found|subleased|taken)|spam|unsubscribe|remove me)\b/i
const POSITIVE = /\b(yes|yeah|yep|sure|interested|sounds good|send (it|me|the)|please|okay|ok|go ahead|why not|that works|link)\b/i

/** A first read of what a reply means, so the right next message is prepared.
 *  Plain rules on purpose. When it cannot tell, it says "question". */
export function classifyReply(text: string): ReplyTone {
  if (NEGATIVE.test(text)) return 'negative'
  if (POSITIVE.test(text) && !/\?/.test(text.replace(/\b(sure|ok|okay)\?/gi, ''))) return 'positive'
  return 'question'
}

export function claimMessage(): string {
  return `Great, thank you. I made a draft of your listing from your SubLeaps post, so you only have to check it. Here is the link: ${CLAIM_PLACEHOLDER}\n\nIt is free, you can change anything, and you can take it down any time.`
}

export function followUpMessage(): string {
  return `Hi again, quick follow-up in case my message got buried. I made a draft of your listing on Wroomly so you would only have to check it: ${CLAIM_PLACEHOLDER}\n\nIt is free and you can edit or delete it any time. If you would rather not, no problem at all.`
}

export function questionReply(): string {
  return `Happy to answer. In short: Wroomly is free, I set up the draft from your SubLeaps post so you only check it, and the listing stays yours to edit or remove whenever you want. Want me to send you the draft link?`
}

export function politeClose(): string {
  return `No problem, thanks for letting me know. Good luck with the sublease!`
}

export interface NextStep {
  kind: 'wait' | 'follow-up' | 'reply' | 'close' | 'done'
  /** True when something should be done now. */
  due: boolean
  /** One line saying why, for the dashboard. */
  reason: string
  /** The prepared message, with {{claim_link}} where the link goes. */
  text?: string
  tone?: ReplyTone
}

const last = <T,>(xs: T[]): T | undefined => xs[xs.length - 1]

export function nextStep(t: ManualThread, now: Date): NextStep {
  if (t.state === 'listed') return { kind: 'done', due: false, reason: 'Listed on Wroomly.' }
  if (t.state === 'declined') return { kind: 'done', due: false, reason: 'Not interested.' }
  if (t.state === 'closed') return { kind: 'done', due: false, reason: 'Closed.' }

  const lastMsg = last(t.messages)
  if (!lastMsg) return { kind: 'wait', due: false, reason: 'Nothing sent yet.' }

  if (t.state === 'replied' && lastMsg.dir === 'in') {
    const tone = classifyReply(lastMsg.text)
    if (tone === 'negative') return { kind: 'reply', due: true, tone, reason: 'They said no. Send a polite close, then mark not interested.', text: politeClose() }
    if (tone === 'positive') return { kind: 'reply', due: true, tone, reason: 'They sound interested. Send the draft link.', text: claimMessage() }
    return { kind: 'reply', due: true, tone, reason: 'They asked something. Answer, then offer the draft link.', text: questionReply() }
  }

  const outs = t.messages.filter(m => m.dir === 'out')
  const followUp = outs.find(m => m.kind === 'follow-up')
  const since = (iso: string) => (now.getTime() - new Date(iso).getTime()) / DAY

  if (!followUp) {
    const first = outs[0]
    const days = first ? since(first.at) : 0
    if (days >= FOLLOWUP_AFTER_DAYS) return { kind: 'follow-up', due: true, reason: `No reply after ${Math.floor(days)} days. Send the one follow-up.`, text: followUpMessage() }
    const left = Math.max(1, Math.ceil(FOLLOWUP_AFTER_DAYS - days))
    return { kind: 'wait', due: false, reason: `Waiting for a reply. Follow-up in ${left} day${left === 1 ? '' : 's'}.` }
  }
  const days = since(followUp.at)
  if (days >= CLOSE_AFTER_DAYS) return { kind: 'close', due: true, reason: `No reply ${Math.floor(days)} days after the follow-up. Close it.` }
  return { kind: 'wait', due: false, reason: 'Follow-up sent. Waiting.' }
}
