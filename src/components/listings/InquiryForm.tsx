'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import type { Listing } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import Link from 'next/link'
import { CheckCircle2, CreditCard, MessageSquare } from 'lucide-react'

const schema = z.object({
  message: z.string().min(20, 'Please write at least 20 characters'),
  move_in_date: z.string().optional(),
  move_out_date: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface InquiryFormProps {
  listing: Listing
  authUser: { id: string } | null
  isOwner: boolean
  existingInquiry: { id: string; status: string } | null
  conversationId: string | null
  hasPaid?: boolean
}

export function InquiryForm({ listing, authUser, isOwner, existingInquiry, conversationId, hasPaid }: InquiryFormProps) {
  const router = useRouter()
  const [paying, setPaying] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  if (isOwner) {
    return (
      <div className="text-center py-2">
        <p className="text-sm text-ink-muted mb-3">This is your listing</p>
        <Link href={`/listings/${listing.id}/edit`}>
          <Button variant="outline" className="w-full">Edit listing</Button>
        </Link>
      </div>
    )
  }

  if (!authUser) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-muted text-center">Sign in to send an inquiry</p>
        <Link href={`/sign-in?next=/listings/${listing.id}`}>
          <Button className="w-full">Sign in to inquire</Button>
        </Link>
        <Link href="/sign-up">
          <Button variant="outline" className="w-full">Create account</Button>
        </Link>
      </div>
    )
  }

  async function startCheckout() {
    if (paying) return
    setPaying(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listing.id }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'Could not start checkout')
        setPaying(false)
        return
      }
      window.location.href = data.url
    } catch {
      toast.error('Could not start checkout')
      setPaying(false)
    }
  }

  if (existingInquiry) {
    const status = existingInquiry.status

    if (status === 'accepted' && listing.type === 'sublet') {
      if (hasPaid) {
        return (
          <div className="bg-[oklch(0.97_0.04_142)] border border-[oklch(0.85_0.1_142)] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-center gap-2 text-[oklch(0.45_0.15_142)] font-medium">
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-display text-lg">Booking confirmed</p>
            </div>
            <p className="text-sm text-ink-soft text-center">
              You&apos;ve paid for this place. You&apos;re all set!
            </p>
            {conversationId && (
              <Link href={`/messages/${conversationId}`} className="block">
                <Button className="press w-full rounded-full bg-navy text-white hover:bg-navy/90 h-11">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Message your host
                </Button>
              </Link>
            )}
          </div>
        )
      }
      return (
        <div className="bg-[oklch(0.97_0.04_142)] border border-[oklch(0.85_0.1_142)] rounded-2xl p-4 space-y-3">
          <div>
            <p className="font-display text-lg text-ink">Inquiry accepted</p>
            <p className="text-sm text-ink-soft mt-0.5">
              Confirm your booking to lock in this place.
            </p>
          </div>
          <Button
            onClick={startCheckout}
            disabled={paying}
            className="press w-full rounded-full bg-navy text-white hover:bg-navy/90 h-11"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {paying ? 'Redirecting…' : 'Pay now'}
          </Button>
          {conversationId && (
            <Link href={`/messages/${conversationId}`} className="block">
              <Button variant="outline" className="w-full rounded-full">
                <MessageSquare className="w-4 h-4 mr-2" />
                Open chat
              </Button>
            </Link>
          )}
        </div>
      )
    }

    if (status === 'accepted') {
      // swap — no payment, just go to chat
      return (
        <div className="bg-[oklch(0.97_0.04_142)] border border-[oklch(0.85_0.1_142)] rounded-2xl p-4 space-y-3">
          <div>
            <p className="font-display text-lg text-ink">Swap accepted</p>
            <p className="text-sm text-ink-soft mt-0.5">
              Coordinate the swap details in chat.
            </p>
          </div>
          {conversationId && (
            <Link href={`/messages/${conversationId}`} className="block">
              <Button className="press w-full rounded-full bg-navy text-white hover:bg-navy/90 h-11">
                <MessageSquare className="w-4 h-4 mr-2" />
                Open chat
              </Button>
            </Link>
          )}
        </div>
      )
    }

    if (status === 'pending') {
      return (
        <div className="bg-navy-soft border border-line rounded-2xl p-4 space-y-3">
          <div>
            <p className="font-display text-lg text-ink">Inquiry sent</p>
            <p className="text-sm text-ink-soft mt-0.5">
              The supplier will review and respond in chat.
            </p>
          </div>
          {conversationId && (
            <Link href={`/messages/${conversationId}`} className="block">
              <Button className="press w-full rounded-full bg-navy text-white hover:bg-navy/90 h-11">
                <MessageSquare className="w-4 h-4 mr-2" />
                Open chat
              </Button>
            </Link>
          )}
        </div>
      )
    }

    return (
      <div className="bg-surface border border-line rounded-2xl p-4 text-center">
        <p className="font-display text-lg text-ink">
          {status === 'rejected' ? 'Inquiry not accepted' : 'Inquiry withdrawn'}
        </p>
        <p className="text-sm text-ink-muted mt-1">
          {status === 'rejected'
            ? 'The supplier did not accept this inquiry.'
            : 'You withdrew this inquiry.'}
        </p>
      </div>
    )
  }

  async function onSubmit(data: FormValues) {
    if (!authUser) return
    const supabase = createClient()

    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiries')
      .insert({
        listing_id: listing.id,
        consumer_id: authUser.id,
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
        consumer_id: authUser.id,
        inquiry_id: inquiry.id,
      })
      .select('id')
      .single()

    if (convoError || !convo) {
      toast.error('Inquiry sent, but could not open chat.')
      router.refresh()
      return
    }

    await supabase.from('messages').insert({
      conversation_id: convo.id,
      sender_id: authUser.id,
      content: data.message,
    })

    toast.success('Inquiry sent!')
    router.push(`/messages/${convo.id}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {listing.type === 'sublet' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Move-in date</Label>
            <Input
              type="date"
              min={listing.available_from}
              max={listing.available_to}
              {...register('move_in_date')}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Move-out date</Label>
            <Input
              type="date"
              min={listing.available_from}
              max={listing.available_to}
              {...register('move_out_date')}
            />
          </div>
        </div>
      )}

      <div className="space-y-1">
        <Label>Your message</Label>
        <Textarea
          placeholder="Introduce yourself — tell them about your situation, why you're interested, and any questions you have."
          rows={4}
          {...register('message')}
        />
        {errors.message && (
          <p className="text-sm text-destructive">{errors.message.message}</p>
        )}
      </div>

      <Button type="submit" className="press w-full rounded-full bg-navy text-white hover:bg-navy/90 h-11" disabled={isSubmitting}>
        {isSubmitting ? 'Sending…' : 'Send inquiry'}
      </Button>

      <p className="text-xs text-ink-muted text-center">
        Opens a chat with the supplier — no commitment.
      </p>
    </form>
  )
}
