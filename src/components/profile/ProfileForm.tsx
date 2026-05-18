'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import type { User, UserPhoto } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Camera, AtSign, Plus, X } from 'lucide-react'
import { getListingImageUrl as publicUrl } from '@/lib/utils/listing'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  university: z.string().optional(),
  bio: z.string().max(500, 'Bio must be under 500 characters').optional(),
  phone: z.string().optional(),
  instagram_handle: z
    .string()
    .max(30, 'Handle must be under 30 characters')
    .regex(/^[A-Za-z0-9_.]*$/, 'Letters, numbers, periods and underscores only')
    .optional(),
})
type FormValues = z.infer<typeof schema>

export function ProfileForm({
  profile,
  initialPhotos,
}: {
  profile: User
  initialPhotos: UserPhoto[]
}) {
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [photos, setPhotos] = useState<UserPhoto[]>(initialPhotos)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: profile.full_name ?? '',
      university:
        profile.university ??
        (profile.user_type === 'supplier' ? 'University of Michigan' : ''),
      bio: profile.bio ?? '',
      phone: profile.phone ?? '',
      instagram_handle: profile.instagram_handle ?? '',
    },
  })

  async function onSubmit(data: FormValues) {
    const supabase = createClient()
    const handle = data.instagram_handle?.replace(/^@+/, '').trim() || null
    const { error } = await supabase
      .from('users')
      .update({
        full_name: data.full_name,
        university: data.university || null,
        bio: data.bio || null,
        phone: data.phone || null,
        instagram_handle: handle,
      })
      .eq('id', profile.id)

    if (error) {
      console.error('Profile update failed:', error)
      toast.error(`Failed to save profile: ${error.message}`)
    } else {
      toast.success('Profile updated!')
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `avatars/${profile.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('listing-images')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      toast.error('Failed to upload avatar.')
      setUploadingAvatar(false)
      return
    }

    const url = publicUrl(path) + `?v=${Date.now()}`
    await supabase.from('users').update({ avatar_url: url }).eq('id', profile.id)
    setAvatarUrl(url)
    toast.success('Avatar updated!')
    setUploadingAvatar(false)
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (photos.length + files.length > 6) {
      toast.error('You can have up to 6 photos.')
      return
    }

    setUploadingPhoto(true)
    const supabase = createClient()

    const newRows: UserPhoto[] = []
    let order = photos.length

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const filename = `${crypto.randomUUID()}.${ext}`
      const path = `profile-photos/${profile.id}/${filename}`

      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(path, file)

      if (uploadError) {
        toast.error(`Failed to upload ${file.name}.`)
        continue
      }

      const { data: row, error: insertError } = await supabase
        .from('user_photos')
        .insert({
          user_id: profile.id,
          storage_path: path,
          display_order: order++,
        })
        .select('*')
        .single()

      if (insertError || !row) {
        toast.error('Failed to save photo record.')
        continue
      }
      newRows.push(row as UserPhoto)
    }

    if (newRows.length > 0) {
      setPhotos(prev => [...prev, ...newRows])
      toast.success(newRows.length === 1 ? 'Photo added!' : `${newRows.length} photos added!`)
    }
    setUploadingPhoto(false)
    e.target.value = ''
  }

  async function handleDeletePhoto(photo: UserPhoto) {
    const supabase = createClient()
    const prev = photos
    setPhotos(p => p.filter(x => x.id !== photo.id))

    const { error } = await supabase.from('user_photos').delete().eq('id', photo.id)
    if (error) {
      toast.error('Failed to remove photo.')
      setPhotos(prev)
      return
    }
    await supabase.storage.from('listing-images').remove([photo.storage_path])
  }

  const initials = profile.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatarUrl ?? undefined} />
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xl font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <label className="absolute bottom-0 right-0 w-6 h-6 bg-white border rounded-full flex items-center justify-center cursor-pointer shadow-sm hover:bg-gray-50">
            <Camera className="w-3 h-3 text-gray-600" />
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
          </label>
        </div>
        <div>
          <p className="font-medium text-ink">{profile.full_name}</p>
          <p className="text-sm text-ink-muted">{profile.email}</p>
          <p className="text-xs text-primary capitalize mt-0.5">{profile.user_type}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Full name</Label>
        <Input {...register('full_name')} />
        {errors.full_name && <p className="text-sm text-red-600">{errors.full_name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>University</Label>
        <Input placeholder="Your university" {...register('university')} />
        <p className="text-xs text-ink-muted">
          Shown on your public profile so others can see where you study.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Bio</Label>
        <Textarea
          placeholder="A short intro — your major, what you're into, what kind of housemate you are…"
          rows={4}
          {...register('bio')}
        />
        <p className="text-xs text-ink-muted">
          Shown on your public profile so people know who they&apos;re renting to or from.
        </p>
        {errors.bio && <p className="text-sm text-red-600">{errors.bio.message}</p>}
      </div>

      {/* Photo gallery */}
      <div className="space-y-2">
        <Label>Photos of you</Label>
        <p className="text-xs text-ink-muted">
          Up to 6 photos. Helps build trust on both sides of a deal.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-2">
          {photos.map(photo => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-lg overflow-hidden bg-ink-soft/10 border border-black/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={publicUrl(photo.storage_path)}
                alt=""
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleDeletePhoto(photo)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition"
                aria-label="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {photos.length < 6 && (
            <label
              className={`aspect-square rounded-lg border-2 border-dashed border-black/15 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition text-ink-muted ${
                uploadingPhoto ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <Plus className="w-5 h-5" />
              <span className="text-xs">{uploadingPhoto ? 'Uploading…' : 'Add photo'}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
              />
            </label>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Instagram</Label>
        <div className="relative">
          <AtSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="yourhandle"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            {...register('instagram_handle')}
          />
        </div>
        <p className="text-xs text-ink-muted">Shown on your public profile so people can verify who you are.</p>
        {errors.instagram_handle && <p className="text-sm text-red-600">{errors.instagram_handle.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Phone (optional)</Label>
        <Input type="tel" placeholder="+1 (555) 000-0000" {...register('phone')} />
        <p className="text-xs text-ink-muted">Only shared with parties after an inquiry is accepted.</p>
      </div>

      <Button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
