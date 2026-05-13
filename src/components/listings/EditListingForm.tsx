'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import {
  ANN_ARBOR_NEIGHBORHOODS,
  ANN_ARBOR_RESIDENCES,
  PROPERTY_TYPES,
} from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { AddressAutocomplete } from '@/components/listings/AddressAutocomplete'
import {
  dateToMonth,
  monthToFromDate,
  monthToToDate,
} from '@/lib/utils/listing'
import type { Listing } from '@/types/database'

const schema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(30).max(2000),
  neighborhood: z.string().min(1, 'Select a neighborhood'),
  property_type: z.enum([
    'apartment', 'house', 'condo',
    'townhouse', 'duplex', 'studio', 'other',
  ]),
  residence_name: z.string().optional(),
  address: z.string().min(5, 'Pick your address from the suggestions'),
  lat: z.number().refine(Number.isFinite, 'Pick your address from the suggestions'),
  lng: z.number().refine(Number.isFinite, 'Pick your address from the suggestions'),
  bedrooms: z.coerce.number().min(0).max(4),
  bathrooms: z.coerce.number().min(0.5).max(10),
  sq_ft: z.coerce.number().min(1).optional(),
  available_from: z.string().regex(/^\d{4}-\d{2}$/, 'Select a start month'),
  available_to: z.string().regex(/^\d{4}-\d{2}$/, 'Select an end month'),
  price_per_month: z.coerce.number().min(1).optional(),
  deposit_amount: z.coerce.number().min(0).optional(),
  furnished: z.boolean(),
  pets_allowed: z.boolean(),
  utilities_included: z.boolean(),
  status: z.enum(['active', 'paused', 'archived', 'pending_review', 'rented', 'swapped', 'draft']),
})

type FormValues = z.infer<typeof schema>

const STATUS_OPTIONS: { value: FormValues['status']; label: string; help: string }[] = [
  { value: 'active', label: 'Active', help: 'Visible to everyone' },
  { value: 'paused', label: 'Paused', help: 'Hidden temporarily — you can re-publish anytime' },
  { value: 'rented', label: 'Rented', help: 'Marked as rented out' },
  { value: 'swapped', label: 'Swapped', help: 'Marked as swap complete' },
  { value: 'archived', label: 'Archived', help: 'Permanently hidden from listings' },
]

export function EditListingForm({ listing }: { listing: Listing }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isSublet = listing.type === 'sublet'

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      title: listing.title,
      description: listing.description ?? '',
      neighborhood: listing.neighborhood ?? '',
      property_type: (listing.property_type ?? 'apartment') as FormValues['property_type'],
      residence_name: listing.residence_name ?? '',
      address: listing.address ?? '',
      lat: listing.lat ?? NaN,
      lng: listing.lng ?? NaN,
      bedrooms: listing.bedrooms ?? 0,
      bathrooms: listing.bathrooms ?? 1,
      sq_ft: listing.sq_ft ?? undefined,
      available_from: dateToMonth(listing.available_from),
      available_to: dateToMonth(listing.available_to),
      price_per_month: listing.price_per_month
        ? Math.round(listing.price_per_month / 100)
        : undefined,
      deposit_amount: listing.deposit_amount
        ? Math.round(listing.deposit_amount / 100)
        : undefined,
      furnished: listing.furnished,
      pets_allowed: listing.pets_allowed,
      utilities_included: listing.utilities_included,
      status: listing.status as FormValues['status'],
    },
  })

  async function onSubmit(data: FormValues) {
    setSubmitting(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('listings')
      .update({
        title: data.title,
        description: data.description,
        neighborhood: data.neighborhood,
        property_type: data.property_type,
        residence_name:
          data.property_type === 'apartment' && data.residence_name
            ? data.residence_name
            : null,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        sq_ft: data.sq_ft ?? null,
        available_from: monthToFromDate(data.available_from),
        available_to: monthToToDate(data.available_to),
        price_per_month: isSublet && data.price_per_month ? data.price_per_month * 100 : null,
        deposit_amount: isSublet && data.deposit_amount ? data.deposit_amount * 100 : null,
        furnished: data.furnished,
        pets_allowed: data.pets_allowed,
        utilities_included: data.utilities_included,
        status: data.status,
      })
      .eq('id', listing.id)

    setSubmitting(false)
    if (error) {
      toast.error(`Failed to save: ${error.message}`)
    } else {
      toast.success('Listing updated.')
      router.refresh()
    }
  }

  async function handleDelete() {
    const isDraft = listing.status === 'draft'
    const msg = isDraft
      ? 'Delete this draft permanently? This cannot be undone.'
      : 'Archive this listing? It will be removed from search but you can restore it later.'
    if (!confirm(msg)) return
    setDeleting(true)
    const supabase = createClient()

    if (isDraft) {
      const { error } = await supabase.from('listings').delete().eq('id', listing.id)
      setDeleting(false)
      if (error) {
        toast.error(`Failed to delete: ${error.message}`)
        return
      }
      toast.success('Draft deleted.')
    } else {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'archived' })
        .eq('id', listing.id)
      setDeleting(false)
      if (error) {
        toast.error(`Failed to archive: ${error.message}`)
        return
      }
      toast.success('Listing archived.')
    }
    router.push('/my-listings')
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input {...form.register('title')} />
        {form.formState.errors.title && (
          <p className="text-sm text-red-600">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea rows={6} {...form.register('description')} />
        {form.formState.errors.description && (
          <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Neighborhood</Label>
          <Controller
            control={form.control}
            name="neighborhood"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select neighborhood" />
                </SelectTrigger>
                <SelectContent>
                  {ANN_ARBOR_NEIGHBORHOODS.map(n => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.neighborhood && (
            <p className="text-sm text-red-600">{form.formState.errors.neighborhood.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Street address</Label>
          <Controller
            control={form.control}
            name="address"
            render={({ field }) => {
              const hasPick =
                Number.isFinite(form.getValues('lat')) &&
                Number.isFinite(form.getValues('lng'))
              return (
                <AddressAutocomplete
                  value={field.value ?? ''}
                  hasPick={hasPick}
                  onChange={v => {
                    field.onChange(v)
                    form.setValue('lat', NaN as unknown as number, { shouldValidate: false })
                    form.setValue('lng', NaN as unknown as number, { shouldValidate: false })
                  }}
                  onPick={pick => {
                    field.onChange(pick.address)
                    form.setValue('lat', pick.lat, { shouldValidate: true })
                    form.setValue('lng', pick.lng, { shouldValidate: true })
                  }}
                />
              )
            }}
          />
          {form.formState.errors.address && (
            <p className="text-sm text-red-600">{form.formState.errors.address.message}</p>
          )}
          {!form.formState.errors.address && form.formState.errors.lat && (
            <p className="text-sm text-red-600">
              {(form.formState.errors.lat as { message?: string })?.message ??
                'Pick your address from the suggestions'}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Property type</Label>
          <Controller
            control={form.control}
            name="property_type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.property_type && (
            <p className="text-sm text-red-600">{form.formState.errors.property_type.message}</p>
          )}
        </div>
        {form.watch('property_type') === 'apartment' && (
          <div className="space-y-2">
            <Label>Residence / complex (optional)</Label>
            <Controller
              control={form.control}
              name="residence_name"
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select residence…" /></SelectTrigger>
                  <SelectContent>
                    {ANN_ARBOR_RESIDENCES.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                    <SelectItem value="Other">Other (not listed)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.residence_name && (
              <p className="text-sm text-red-600">{form.formState.errors.residence_name.message}</p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Bedrooms</Label>
          <Input type="number" min={0} max={4} {...form.register('bedrooms')} />
        </div>
        <div className="space-y-2">
          <Label>Bathrooms</Label>
          <Input type="number" min={0.5} max={10} step={0.5} {...form.register('bathrooms')} />
        </div>
        <div className="space-y-2">
          <Label>Sq ft (opt.)</Label>
          <Input type="number" min={100} {...form.register('sq_ft')} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Available from</Label>
          <Input type="month" {...form.register('available_from')} />
          {form.formState.errors.available_from && (
            <p className="text-sm text-red-600">{form.formState.errors.available_from.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Available to</Label>
          <Input type="month" {...form.register('available_to')} />
          {form.formState.errors.available_to && (
            <p className="text-sm text-red-600">{form.formState.errors.available_to.message}</p>
          )}
        </div>
      </div>

      {isSublet && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Monthly price ($)</Label>
            <Input type="number" min={1} {...form.register('price_per_month')} />
            {form.formState.errors.price_per_month && (
              <p className="text-sm text-red-600">{form.formState.errors.price_per_month.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Deposit ($, opt.)</Label>
            <Input type="number" min={0} {...form.register('deposit_amount')} />
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-2xl border border-line p-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Furnished</Label>
            <p className="text-xs text-ink-muted">Comes with furniture</p>
          </div>
          <Controller
            control={form.control}
            name="furnished"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Pets allowed</Label>
            <p className="text-xs text-ink-muted">Renter may bring pets</p>
          </div>
          <Controller
            control={form.control}
            name="pets_allowed"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Utilities included</Label>
            <p className="text-xs text-ink-muted">Water/electric/internet covered</p>
          </div>
          <Controller
            control={form.control}
            name="utilities_included"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Status</Label>
          <Badge variant="outline" className="capitalize">
            {listing.status.replace('_', ' ')}
          </Badge>
        </div>
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    <div className="flex flex-col">
                      <span>{o.label}</span>
                      <span className="text-xs text-ink-muted">{o.help}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {listing.status === 'pending_review' && (
          <p className="text-xs text-amber-700">
            This listing is awaiting review. Saving will keep it in pending unless you change status.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-line">
        <Button
          type="button"
          variant="outline"
          onClick={handleDelete}
          disabled={deleting || submitting}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          {deleting
            ? (listing.status === 'draft' ? 'Deleting…' : 'Archiving…')
            : (listing.status === 'draft' ? 'Delete draft' : 'Archive listing')}
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/my-listings')}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || deleting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </form>
  )
}
