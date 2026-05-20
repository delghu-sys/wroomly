'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Calendar, Loader2, BedDouble, Send, CheckCircle2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatCents } from '@/lib/utils/listing'
import { FeeNote } from '@/components/brand/FeeNote'

const schema = z.object({
  message: z.string().min(20, 'Please write at least 20 characters'),
  move_in_date: z.string().optional(),
  move_out_date: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface InquiryModalProps {
  open: boolean
  onClose: () => void
  listing: {
    id: string
    title: string
    type: string
    price_per_month: number | null
    available_from: string
    available_to: string
    supplier_id: string
    thumbnailUrl: string | null
  }
  authUserId: string
}

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 }
const popSpring = { type: 'spring' as const, stiffness: 220, damping: 20 }

export function InquiryModal({
  open,
  onClose,
  listing,
  authUserId,
}: InquiryModalProps) {
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<'form' | 'success'>('form')
  const dialogRef = useFocusTrap<HTMLDivElement>(open)

  // Pre-compute particle layout once per mount so re-renders don't reshuffle.
  const particles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2
        const dist = 90 + Math.random() * 60
        return {
          i,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          color:
            i % 2 === 0 ? 'oklch(0.84 0.17 85)' : 'oklch(0.10 0.02 260)',
        }
      }),
    []
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      move_in_date: listing.available_from?.slice(0, 10),
      move_out_date: listing.available_to?.slice(0, 10),
    },
  })

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  async function onSubmit(data: FormValues) {
    const supabase = createClient()

    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiries')
      .insert({
        listing_id: listing.id,
        consumer_id: authUserId,
        message: data.message,
        move_in_date: data.move_in_date || null,
        move_out_date: data.move_out_date || null,
      })
      .select('id')
      .single()

    if (inquiryError || !inquiry) {
      toast.error('Failed to send inquiry. Please try again.')
      return
    }

    const { data: convo, error: convoError } = await supabase
      .from('conversations')
      .insert({
        listing_id: listing.id,
        supplier_id: listing.supplier_id,
        consumer_id: authUserId,
        inquiry_id: inquiry.id,
      })
      .select('id')
      .single()

    if (convoError || !convo) {
      toast.error('Inquiry sent, but could not open chat.')
      onClose()
      router.refresh()
      return
    }

    await supabase.from('messages').insert({
      conversation_id: convo.id,
      sender_id: authUserId,
      content: data.message,
    })

    // Success phase — show in-modal confirmation, then close + navigate
    setPhase('success')
    setTimeout(() => {
      onClose()
      reset()
      setPhase('form')
      toast.success('Inquiry sent — you’ll hear back soon.', {
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      })
      router.push(`/messages/${convo.id}`)
    }, 1400)
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close inquiry"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-[oklch(0.10_0.02_260/0.55)] backdrop-blur-sm"
          />

          {/* Morphing modal — spring expand from center.
              Uses flex column so the form below grows to fill leftover
              space after the header (no magic-number height calcs). dvh
              instead of vh to handle iOS Safari's dynamic URL bar
              correctly. */}
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={spring}
            className="
              relative w-full sm:max-w-lg
              max-h-[92dvh] flex flex-col overflow-hidden
              rounded-t-3xl sm:rounded-3xl
              bg-white border border-line
              shadow-[0_30px_80px_oklch(0.10_0.02_260/0.30)]
            "
            role="dialog"
            aria-modal="true"
          >
            {/* Gold mesh accent */}
            <div
              className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-30"
              style={{ background: 'oklch(0.84 0.17 85 / 0.35)' }}
              aria-hidden
            />

            <AnimatePresence mode="wait">
              {phase === 'form' ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  // flex-1 + min-h-0 lets the form below grow to fill
                  // whatever's left after the header, instead of relying
                  // on a hardcoded subtract-the-header-height calc.
                  className="relative flex flex-col flex-1 min-h-0"
                >
                  {/* Header — natural height, never compresses */}
                  <div className="shrink-0 px-5 sm:px-6 pt-5 sm:pt-6 pb-4 flex items-start gap-4 border-b border-line">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-[oklch(0.95_0.01_85)] ring-1 ring-line">
                      {listing.thumbnailUrl ? (
                        <Image
                          src={listing.thumbnailUrl}
                          alt={listing.title}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BedDouble className="w-5 h-5 text-ink-muted/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-ink-muted font-semibold">
                        Send inquiry
                      </p>
                      <p className="font-display text-lg sm:text-xl tracking-tight text-ink leading-tight line-clamp-1 mt-1">
                        {listing.title}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:bg-ink-muted/10 transition-colors active:scale-95 shrink-0"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Form — fills the rest of the modal and scrolls
                      inside itself when content exceeds available space.
                      overscroll-contain prevents the page behind from
                      scrolling along when the user hits the form's
                      scroll edges (annoying on iOS). */}
                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 space-y-4"
                  >
                    {/* Message */}
                    <div className="space-y-2">
                      <Label className="text-[11px] uppercase tracking-[0.15em] text-ink-soft font-semibold">
                        Introduce yourself
                      </Label>
                      <Textarea
                        rows={5}
                        placeholder="A few sentences about you — your school, dates, why this place is a good fit."
                        {...register('message')}
                        className="rounded-2xl border-line focus-visible:ring-4 focus-visible:ring-[oklch(0.84_0.17_85/0.18)] focus-visible:border-[oklch(0.45_0.13_85)] text-[14px]"
                      />
                      {errors.message && (
                        <p className="text-xs text-[oklch(0.55_0.20_25)]">
                          {errors.message.message}
                        </p>
                      )}
                    </div>

                    {/* Dates */}
                    {listing.type === 'sublet' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-[11px] uppercase tracking-[0.15em] text-ink-soft font-semibold">
                            Move-in
                          </Label>
                          <Input
                            type="date"
                            min={listing.available_from}
                            max={listing.available_to}
                            {...register('move_in_date')}
                            className="h-11 rounded-xl border-line focus-visible:ring-4 focus-visible:ring-[oklch(0.84_0.17_85/0.18)] focus-visible:border-[oklch(0.45_0.13_85)]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[11px] uppercase tracking-[0.15em] text-ink-soft font-semibold">
                            Move-out
                          </Label>
                          <Input
                            type="date"
                            min={listing.available_from}
                            max={listing.available_to}
                            {...register('move_out_date')}
                            className="h-11 rounded-xl border-line focus-visible:ring-4 focus-visible:ring-[oklch(0.84_0.17_85/0.18)] focus-visible:border-[oklch(0.45_0.13_85)]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Confirm strip */}
                    {listing.type === 'sublet' && listing.price_per_month && (
                      <div className="rounded-2xl border border-line bg-[oklch(0.97_0.008_75)]">
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-2 text-[12px] text-ink-soft">
                            <Calendar className="w-3.5 h-3.5 text-[oklch(0.45_0.13_85)]" />
                            {format(parseISO(listing.available_from), 'MMM d')} —{' '}
                            {format(parseISO(listing.available_to), 'MMM d, yyyy')}
                          </div>
                          <p className="font-display text-base text-ink tracking-tight">
                            {formatCents(listing.price_per_month)}
                            <span className="text-ink-muted font-normal text-sm">
                              {' '}
                              /mo
                            </span>
                          </p>
                        </div>
                        <div className="px-4 pb-3 -mt-0.5 text-right">
                          <FeeNote variant="inline" />
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-ink-muted leading-relaxed">
                      Sending an inquiry doesn&rsquo;t commit you to anything. The supplier
                      reviews and either accepts or declines.
                    </p>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="
                        group relative w-full h-12 rounded-full overflow-hidden mt-2
                        bg-[oklch(0.84_0.17_85)] text-[oklch(0.10_0.02_260)]
                        font-semibold text-sm tracking-tight
                        shadow-[0_4px_18px_oklch(0.84_0.17_85/0.35)]
                        hover:shadow-[0_10px_32px_oklch(0.84_0.17_85/0.50)]
                        disabled:opacity-60 disabled:cursor-not-allowed
                        active:scale-[0.98]
                        transition-all duration-300
                      "
                    >
                      <span className="absolute inset-0 bg-[oklch(0.10_0.02_260)] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" />
                      <span className="relative z-10 inline-flex items-center justify-center gap-2 group-hover:text-[oklch(0.84_0.17_85)] transition-colors duration-500">
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending…
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 -rotate-12" strokeWidth={2.25} />
                            Send inquiry
                          </>
                        )}
                      </span>
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={popSpring}
                  className="relative flex-1 flex flex-col items-center justify-center px-6 py-14 text-center"
                >
                  {/* Particle burst — skipped for reduced-motion users. */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    {!prefersReducedMotion && particles.map(p => (
                      <motion.span
                        key={p.i}
                        initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
                        animate={{
                          x: p.x,
                          y: p.y,
                          opacity: 0,
                          scale: 1,
                        }}
                        transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute w-2 h-2 rounded-[2px]"
                        style={{
                          background: p.color,
                          willChange: 'transform, opacity',
                        }}
                        aria-hidden
                      />
                    ))}
                  </div>
                  <motion.div
                    initial={{ scale: 0.4, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ ...popSpring, delay: 0.05 }}
                    className="relative inline-flex w-16 h-16 rounded-3xl items-center justify-center mx-auto shadow-[0_8px_28px_oklch(0.84_0.17_85/0.40)]"
                    style={{
                      background: 'oklch(0.84 0.17 85)',
                      color: 'oklch(0.10 0.02 260)',
                    }}
                  >
                    <CheckCircle2 className="w-7 h-7" strokeWidth={2.25} />
                  </motion.div>
                  <p className="relative font-display text-2xl tracking-tight text-ink mt-5 leading-tight">
                    Inquiry sent —
                    <br />
                    <span className="italic font-light text-[oklch(0.45_0.13_85)]">
                      you&rsquo;ll hear back soon.
                    </span>
                  </p>
                  <p className="relative text-sm text-ink-muted mt-3">
                    Opening your chat…
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
