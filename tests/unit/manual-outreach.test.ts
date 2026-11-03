import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  readManual, startThread, addMessage, setState, classifyReply, nextStep,
  claimMessage, followUpMessage, questionReply, politeClose, CLAIM_PLACEHOLDER,
} from '../../src/lib/agents/manual-outreach.ts'

const T0 = '2026-11-03T20:00:00Z'
const day = (n: number) => new Date(Date.parse(T0) + n * 86_400_000)
const thread = () => startThread({ channel: 'subleaps', channelLabel: 'SubLeaps', conversationUrl: 'https://subleaps.com/inbox/x', text: 'Hi', at: T0 })

test('a thread round-trips through the lead, and a bad shape reads as no thread', () => {
  const t = thread()
  // Through JSON, as it travels via the database.
  const stored = JSON.parse(JSON.stringify({ manual: t }))
  assert.equal(JSON.stringify(readManual(stored)), JSON.stringify(t))
  assert.equal(readManual({}), null)
  assert.equal(readManual({ manual: { channel: 5 } }), null)
  assert.equal(readManual({ manual: { channel: 'x', messages: 'no' } }), null)
  assert.equal(readManual({ manual: { ...t, state: 'bogus' } })!.state, 'waiting', 'unknown state falls back to waiting')
})

test('replies move a waiting thread to replied; sending moves it back; finished threads stay finished', () => {
  let t = addMessage(thread(), { dir: 'in', at: T0, text: 'sure!' })
  assert.equal(t.state, 'replied')
  t = addMessage(t, { dir: 'out', at: T0, text: 'Here', kind: 'claim' })
  assert.equal(t.state, 'waiting')
  assert.equal(addMessage(setState(thread(), 'listed'), { dir: 'in', at: T0, text: 'thanks' }).state, 'listed')
  assert.equal(addMessage(setState(thread(), 'declined'), { dir: 'in', at: T0, text: 'hello again' }).state, 'declined')
  assert.equal(thread().messages.length, 1, 'the original is not mutated')
})

test('reading a reply: no beats yes, a question is a question', () => {
  assert.equal(classifyReply('Yes sure, send me the link'), 'positive')
  assert.equal(classifyReply('not interested, thanks'), 'negative')
  assert.equal(classifyReply('Already rented it, sorry'), 'negative')
  assert.equal(classifyReply('sure but is it really free?'), 'question')
  assert.equal(classifyReply('What is Wroomly exactly'), 'question')
  assert.equal(classifyReply('Please stop messaging me'), 'negative')
})

test('no reply: wait, then the one follow-up after three days, then close, never a second follow-up', () => {
  const t = thread()
  const early = nextStep(t, day(1))
  assert.equal(early.kind, 'wait')
  assert.equal(early.due, false)
  assert.match(early.reason, /Follow-up in 2 days/)
  const due = nextStep(t, day(3))
  assert.equal(due.kind, 'follow-up')
  assert.equal(due.due, true)
  assert.match(due.text ?? '', /\{\{claim_link\}\}/)

  const sent = addMessage(t, { dir: 'out', at: day(3).toISOString(), text: 'again', kind: 'follow-up' })
  assert.equal(nextStep(sent, day(5)).kind, 'wait', 'after a follow-up we only wait')
  const closing = nextStep(sent, day(8))
  assert.equal(closing.kind, 'close')
  assert.equal(closing.due, true)
  assert.equal(closing.text, undefined, 'nothing more is suggested to send')
})

test('a reply is prepared, never sent: positive gets the draft link, a question gets an answer, a no gets a polite close', () => {
  const reply = (text: string) => nextStep(addMessage(thread(), { dir: 'in', at: day(1).toISOString(), text }), day(2))
  const yes = reply('yes please')
  assert.equal(yes.kind, 'reply')
  assert.equal(yes.tone, 'positive')
  assert.equal(yes.text, claimMessage())
  assert.equal(reply('how does it work?').text, questionReply())
  assert.equal(reply('no thanks').text, politeClose())
})

test('finished threads suggest nothing', () => {
  for (const s of ['listed', 'declined', 'closed'] as const) {
    const n = nextStep(setState(thread(), s), day(30))
    assert.equal(n.kind, 'done')
    assert.equal(n.due, false)
  }
})

test('prepared messages carry the link placeholder where a link belongs, and no em dashes', () => {
  assert.match(claimMessage(), new RegExp(CLAIM_PLACEHOLDER.replace(/[{}]/g, '\\$&')))
  assert.match(followUpMessage(), /\{\{claim_link\}\}/)
  for (const m of [claimMessage(), followUpMessage(), questionReply(), politeClose()]) assert.doesNotMatch(m, /[—–]/)
})
