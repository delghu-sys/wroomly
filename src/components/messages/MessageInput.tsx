'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react'
import { Send } from 'lucide-react'

interface MessageInputProps {
  onSend: (text: string) => Promise<void> | void
  /** Show quick-prompt suggestions above input until first messages exchanged */
  quickPrompts?: string[]
  disabled?: boolean
}

const MAX_ROWS = 4
const LINE_HEIGHT = 22

export function MessageInput({ onSend, quickPrompts, disabled }: MessageInputProps) {
  const prefersReducedMotion = useReducedMotion()
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Magnetic send button
  const sendRef = useRef<HTMLButtonElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 150, damping: 15 })
  const sy = useSpring(my, { stiffness: 150, damping: 15 })

  const ready = value.trim().length > 0 && !sending && !disabled

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    const max = LINE_HEIGHT * MAX_ROWS + 24 // padding
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`
  }, [value])

  async function submit() {
    if (!ready) return
    const text = value.trim()
    setSending(true)
    setValue('')
    try {
      await onSend(text)
    } catch {
      setValue(text)
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!ready || prefersReducedMotion) return
    const r = sendRef.current?.getBoundingClientRect()
    if (!r) return
    mx.set((e.clientX - r.left - r.width / 2) * 0.30)
    my.set((e.clientY - r.top - r.height / 2) * 0.30)
  }

  function onMouseLeave() {
    mx.set(0)
    my.set(0)
  }

  return (
    <div
      className="
        relative shrink-0 px-4 sm:px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]
        bg-white/85 backdrop-blur-xl border-t border-line
      "
      style={{ boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.65)' }}
    >
      {/* Quick prompts */}
      {quickPrompts && quickPrompts.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          {quickPrompts.map(prompt => (
            <button
              key={prompt}
              type="button"
              onClick={() => setValue(v => (v ? v + ' ' + prompt : prompt))}
              className="
                inline-flex items-center px-2.5 py-1 rounded-full
                bg-white border border-line
                text-[11px] font-medium text-ink-soft
                hover:border-[oklch(0.84_0.17_85/0.50)] hover:text-ink
                transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                active:scale-95
              "
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={e => {
          e.preventDefault()
          submit()
        }}
        className="flex items-end gap-2"
      >
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message…"
            rows={1}
            disabled={disabled || sending}
            className="
              w-full resize-none rounded-3xl
              bg-white border border-line
              px-4 py-3 text-[14.5px] leading-[22px] text-ink
              placeholder:text-ink-muted/65
              focus:outline-none focus:ring-4 focus:ring-[oklch(0.84_0.17_85/0.18)] focus:border-[oklch(0.45_0.13_85)]
              transition-all duration-300
              shadow-[0_1px_2px_oklch(0_0_0/0.04)]
            "
            style={{ minHeight: 46 }}
          />
        </div>

        <motion.button
          ref={sendRef}
          type="submit"
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          disabled={!ready}
          whileTap={ready && !prefersReducedMotion ? { scale: 0.92, y: 1 } : undefined}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{ x: sx, y: sy }}
          className={`
            relative shrink-0 inline-flex items-center justify-center
            h-12 w-12 rounded-full
            transition-all duration-300
            ${
              ready
                ? 'bg-[oklch(0.84_0.17_85)] text-[oklch(0.22_0.075_256)] shadow-[0_4px_18px_oklch(0.84_0.17_85/0.40)] hover:shadow-[0_10px_28px_oklch(0.84_0.17_85/0.50)]'
                : 'bg-ink-muted/10 text-ink-muted cursor-not-allowed'
            }
          `}
          aria-label="Send message"
        >
          <Send className={`w-4 h-4 ${ready ? '-rotate-12' : ''}`} strokeWidth={2.25} />
        </motion.button>
      </form>
    </div>
  )
}
