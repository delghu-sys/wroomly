'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import {
  AMENITIES,
  ANN_ARBOR_NEIGHBORHOODS,
  ANN_ARBOR_RESIDENCES,
  MAX_LISTING_IMAGES,
  PROPERTY_TYPES,
} from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Upload, X, Check } from 'lucide-react'
import Image from 'next/image'
import { AddressAutocomplete } from '@/components/listings/AddressAutocomplete'
import { monthToFromDate, monthToToDate } from '@/lib/utils/listing'

const STEPS = ['Details', 'Photos', 'Pricing', 'Review']

function formatMonthLabel(yyyymm: string | undefined): string {
  if (!yyyymm || !/^\d{4}-\d{2}$/.test(yyyymm)) return '—'
  const [y, m] = yyyymm.split('-').map(Number)
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${names[m - 1]} ${y}`
}

const schema = z.object({
  type: z.literal('sublet'),
  title: z.string().min(5, 'Title must be at least 5 characters').max(100),
  description: z.string().min(30, 'Please write at least 30 characters').max(2000),
  neighborhood: z.string().min(1, 'Select a neighborhood'),
  property_type: z.enum([
    'apartment', 'house', 'condo',
    'townhouse', 'duplex', 'studio', 'other',
  ]),
  residence_name: z.string().optional(),
  address: z.string().min(5, 'Pick your address from the suggestions'),
  lat: z.number().refine(n => Number.isFinite(n), 'Pick your address from the suggestions'),
  lng: z.number().refine(n => Number.isFinite(n), 'Pick your address from the suggestions'),
  bedrooms: z.coerce.number().min(0).max(4),
  bathrooms: z.coerce.number().min(0.5).max(10),
  sq_ft: z.coerce.number().min(1).optional(),
  // Stored as "YYYY-MM" by the form; converted to a full date on submit.
  available_from: z.string().regex(/^\d{4}-\d{2}$/, 'Select a start month'),
  available_to: z.string().regex(/^\d{4}-\d{2}$/, 'Select an end month'),
  price_per_month: z.coerce.number().min(1, 'Monthly price is required'),
  deposit_amount: z.coerce.number().min(0).optional(),
  furnished: z.boolean().default(false),
  pets_allowed: z.boolean().default(false),
  utilities_included: z.boolean().default(false),
  amenities: z.array(z.string()).default([]),
})

type FormValues = z.infer<typeof schema>

export function ListingWizard({ userId }: { userId: string }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoURLs, setPhotoURLs] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      type: 'sublet',
      property_type: 'apartment',
      residence_name: '',
      furnished: false,
      pets_allowed: false,
      utilities_included: false,
      amenities: [],
    },
  })

  function handlePhotoAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    const maxSize = 10 * 1024 * 1024 // 10 MB per file

    const valid = files.filter(f => {
      if (!validTypes.includes(f.type)) return false
      if (f.size > maxSize) return false
      return true
    })

    if (valid.length < files.length) {
      toast.error('Some files were skipped (only JPG, PNG, WebP under 10 MB)')
    }

    const remaining = MAX_LISTING_IMAGES - photos.length
    const toAdd = valid.slice(0, remaining)
    setPhotos(prev => [...prev, ...toAdd])
    setPhotoURLs(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photoURLs[index])
    setPhotos(prev => prev.filter((_, i) => i !== index))
    setPhotoURLs(prev => prev.filter((_, i) => i !== index))
  }

  async function onSubmit(data: FormValues) {
    setSubmitting(true)
    const supabase = createClient()

    try {
      // 1. Create listing
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert({
          supplier_id: userId,
          type: 'sublet',
          title: data.title,
          description: data.description,
          neighborhood: data.neighborhood,
          address: data.address,
          lat: data.lat,
          lng: data.lng,
          property_type: data.property_type,
          residence_name:
            data.property_type === 'apartment' && data.residence_name
              ? data.residence_name
              : null,
          city: 'Ann Arbor',
          state: 'MI',
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          sq_ft: data.sq_ft ?? null,
          available_from: monthToFromDate(data.available_from),
          available_to: monthToToDate(data.available_to),
          price_per_month: data.price_per_month * 100,
          deposit_amount: data.deposit_amount ? data.deposit_amount * 100 : null,
          furnished: data.furnished,
          pets_allowed: data.pets_allowed,
          utilities_included: data.utilities_included,
          status: 'pending_review',
        })
        .select('id')
        .single()

      if (listingError || !listing) throw listingError

      const listingId = listing.id

      // 2. Upload photos
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i]
        const ext = file.name.split('.').pop()
        const path = `${userId}/${listingId}/${i}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(path, file, { upsert: true })
        if (!uploadError) {
          await supabase.from('listing_images').insert({
            listing_id: listingId,
            storage_path: path,
            display_order: i,
          })
        }
      }

      // 3. Insert amenities
      if (data.amenities.length > 0) {
        await supabase.from('listing_amenities').insert(
          data.amenities.map(amenity => ({ listing_id: listingId, amenity }))
        )
      }

      // Fire-and-forget AI auto-review — the listing is submitted regardless
      fetch('/api/admin/auto-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      }).catch(() => {})

      toast.success('Listing submitted! Our AI moderator is reviewing it now — it should go live in a few seconds.')
      router.push('/my-listings')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function validateStep(): Promise<boolean> {
    const fieldsByStep: (keyof FormValues)[][] = [
      ['title', 'description', 'neighborhood', 'address', 'lat', 'lng', 'property_type', 'residence_name', 'bedrooms', 'bathrooms', 'available_from', 'available_to'],
      [], // photos — no validation
      ['price_per_month'],
      [], // review
    ]
    const result = await form.trigger(fieldsByStep[step])
    return result
  }

  async function nextStep() {
    const valid = await validateStep()
    if (valid) setStep(s => s + 1)
  }

  // Map fields back to the step they live on, so we can jump there on error
  const FIELD_TO_STEP: Partial<Record<keyof FormValues, number>> = {
    title: 0, description: 0, neighborhood: 0, address: 0, lat: 0, lng: 0,
    property_type: 0, residence_name: 0,
    bedrooms: 0, bathrooms: 0, sq_ft: 0,
    available_from: 0, available_to: 0,
    furnished: 0, pets_allowed: 0, utilities_included: 0, amenities: 0,
    price_per_month: 2, deposit_amount: 2,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onError(errors: any) {
    const firstField = Object.keys(errors)[0] as keyof FormValues | undefined
    if (!firstField) return
    const msg = errors[firstField]?.message
      ?? `Please complete the "${String(firstField).replace(/_/g, ' ')}" field.`
    const targetStep = FIELD_TO_STEP[firstField] ?? 0
    if (targetStep !== step) setStep(targetStep)
    toast.error(msg)
  }

  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div>
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  i < step
                    ? 'bg-blue-600 text-white'
                    : i === step
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-8 sm:w-16 transition-colors ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500">
          Step {step + 1} of {STEPS.length}: <span className="font-medium text-gray-700">{STEPS[step]}</span>
        </p>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form onSubmit={(form.handleSubmit as any)(onSubmit, onError)} noValidate className="space-y-6">
        {/* Step 0: Details */}
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Tell us about the place</h2>

            <div className="space-y-2">
              <Label>Listing title</Label>
              <Input placeholder="e.g. Sunny 1BR near Central Campus" {...form.register('title')} />
              {form.formState.errors.title && (
                <p className="text-sm text-red-600">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe your place — layout, location highlights, what's nearby, house rules..."
                rows={5}
                {...form.register('description')}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Neighborhood</Label>
                <Controller
                  name="neighborhood"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {ANN_ARBOR_NEIGHBORHOODS.map(n => (
                          <SelectItem key={n} value={n}>{n}</SelectItem>
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
                          // typing again invalidates the previous pick
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
                  name="property_type"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
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
                    name="residence_name"
                    control={form.control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
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
                <Input type="number" min={0} max={4} placeholder="0 = studio" {...form.register('bedrooms')} />
                {form.formState.errors.bedrooms && (
                  <p className="text-sm text-red-600">{form.formState.errors.bedrooms.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Bathrooms</Label>
                <Input type="number" min={0.5} max={10} step={0.5} {...form.register('bathrooms')} />
                {form.formState.errors.bathrooms && (
                  <p className="text-sm text-red-600">{form.formState.errors.bathrooms.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Sq ft (opt.)</Label>
                <Input type="number" min={100} {...form.register('sq_ft')} />
                {form.formState.errors.sq_ft && (
                  <p className="text-sm text-red-600">{form.formState.errors.sq_ft.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Available from</Label>
                <Input type="month" {...form.register('available_from')} />
                {form.formState.errors.available_from && (
                  <p className="text-sm text-red-600">{form.formState.errors.available_from.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Available until</Label>
                <Input type="month" {...form.register('available_to')} />
                {form.formState.errors.available_to && (
                  <p className="text-sm text-red-600">{form.formState.errors.available_to.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Features</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: 'furnished' as const, label: 'Furnished' },
                  { name: 'pets_allowed' as const, label: 'Pets OK' },
                  { name: 'utilities_included' as const, label: 'Utilities incl.' },
                ].map(({ name, label }) => (
                  <Controller
                    key={name}
                    name={name}
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={name}
                          checked={!!field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor={name} className="cursor-pointer font-normal">{label}</Label>
                      </div>
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Amenities</Label>
              <div className="grid grid-cols-2 gap-2">
                {AMENITIES.map(amenity => (
                  <Controller
                    key={amenity}
                    name="amenities"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={amenity}
                          checked={field.value?.includes(amenity)}
                          onCheckedChange={checked => {
                            const current = field.value ?? []
                            field.onChange(
                              checked
                                ? [...current, amenity]
                                : current.filter(a => a !== amenity)
                            )
                          }}
                        />
                        <Label htmlFor={amenity} className="cursor-pointer font-normal text-sm">{amenity}</Label>
                      </div>
                    )}
                  />
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Step 1: Photos */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Add photos</h2>
            <p className="text-sm text-gray-500">
              Listings with photos get significantly more inquiries. Add up to {MAX_LISTING_IMAGES}.
            </p>

            <label className="block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Click to upload photos</p>
              <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP — max 10MB each</p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handlePhotoAdd}
                disabled={photos.length >= MAX_LISTING_IMAGES}
              />
            </label>

            {photoURLs.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {photoURLs.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {i === 0 && (
                      <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">
                        Cover
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Pricing */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Set your price</h2>

            <div className="space-y-2">
              <Label>Monthly rent ($)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  placeholder="1200"
                  {...form.register('price_per_month')}
                />
              </div>
              {form.formState.errors.price_per_month && (
                <p className="text-sm text-red-600">{form.formState.errors.price_per_month.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Wroomly charges a 5% platform fee on successful transactions.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Security deposit ($) — optional</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  placeholder="Same as 1 month's rent"
                  {...form.register('deposit_amount')}
                />
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-medium mb-1">How payments work</p>
              <p>
                The consumer pays deposit + first month via Stripe. Funds are held in escrow and
                released to you on the move-in date. You&apos;ll receive the amount minus a 5% fee.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Review your listing</h2>
            <div className="bg-gray-50 rounded-xl p-5 space-y-3 text-sm">
              {[
                { label: 'Title', value: form.watch('title') },
                { label: 'Neighborhood', value: form.watch('neighborhood') },
                { label: 'Bedrooms', value: form.watch('bedrooms') === 0 ? 'Studio' : `${form.watch('bedrooms')} bed` },
                { label: 'Available', value: `${formatMonthLabel(form.watch('available_from'))} → ${formatMonthLabel(form.watch('available_to'))}` },
                { label: 'Price', value: `$${form.watch('price_per_month')}/mo` },
                { label: 'Photos', value: `${photos.length} photo${photos.length !== 1 ? 's' : ''}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <span className="text-gray-500 shrink-0">{label}</span>
                  <span className="font-medium text-gray-900 text-right">{value}</span>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
              Your listing will be reviewed by our team before going live. This usually takes
              less than 24 hours.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)}>
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={nextStep}>
              Continue
            </Button>
          ) : (
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit listing'}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
