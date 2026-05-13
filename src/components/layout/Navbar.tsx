'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types/database'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MessageSquare } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'

interface NavbarProps {
  user: User | null
  unreadCount?: number
}

export function Navbar({ user, unreadCount = 0 }: NavbarProps) {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function nav(href: string) {
    return () => router.push(href)
  }

  const initials = user?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 group ease-smooth transition-opacity hover:opacity-80"
        >
          <LogoMark size={32} className="ease-smooth transition-transform group-hover:scale-105 group-hover:rotate-[-3deg]" />
          <span className="font-display text-lg font-semibold tracking-tighter text-ink">
            wroomly
          </span>
        </Link>

        {/* Center links */}
        <div className="hidden md:flex items-center gap-7">
          <Link
            href="/listings"
            className="underline-grow text-sm text-ink-soft hover:text-ink font-medium ease-smooth transition-colors"
          >
            Browse
          </Link>
          <Link
            href="/about"
            className="underline-grow text-sm text-ink-soft hover:text-ink font-medium ease-smooth transition-colors"
          >
            How it works
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {/* Messages */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nav('/messages')}
                  className="rounded-full hover:bg-navy-soft ease-smooth transition-colors"
                >
                  <MessageSquare className="w-[18px] h-[18px]" />
                </Button>
                {unreadCount > 0 && (
                  <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] font-semibold bg-maize text-navy border-0 pointer-events-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </div>

              {/* Supplier CTA */}
              {(user.user_type === 'supplier' || user.user_type === 'admin') && (
                <div className="hidden sm:block">
                  <Button
                    size="sm"
                    onClick={nav('/listings/new')}
                    className="rounded-full bg-navy hover:bg-navy/90 text-white px-4 ease-smooth transition-all hover:-translate-y-px"
                  >
                    + List a place
                  </Button>
                </div>
              )}

              {/* Avatar dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 focus:ring-offset-background ease-smooth transition-transform hover:scale-[1.03]">
                  <Avatar className="h-9 w-9 ring-1 ring-line">
                    <AvatarImage src={user.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-navy-soft text-navy text-sm font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 border-line shadow-soft">
                  <div className="px-3 py-2.5">
                    <p className="text-sm font-medium text-ink truncate">{user.full_name}</p>
                    <p className="text-xs text-ink-muted truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={nav('/dashboard')} className="rounded-lg">Dashboard</DropdownMenuItem>
                  {(user.user_type === 'supplier' || user.user_type === 'admin') && (
                    <>
                      <DropdownMenuItem onClick={nav('/my-listings')} className="rounded-lg">My listings</DropdownMenuItem>
                      <DropdownMenuItem onClick={nav('/inquiries')} className="rounded-lg">Inquiries</DropdownMenuItem>
                      <DropdownMenuItem onClick={nav('/payouts')} className="rounded-lg">Payouts</DropdownMenuItem>
                    </>
                  )}
                  {user.user_type === 'consumer' && (
                    <>
                      <DropdownMenuItem onClick={nav('/favorites')} className="rounded-lg">Saved listings</DropdownMenuItem>
                      <DropdownMenuItem onClick={nav('/applications')} className="rounded-lg">Applications</DropdownMenuItem>
                    </>
                  )}
                  {user.user_type === 'admin' && (
                    <DropdownMenuItem onClick={nav('/admin')} className="rounded-lg">Admin dashboard</DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={nav('/profile')} className="rounded-lg">Profile settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="rounded-lg text-destructive focus:text-destructive">
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={nav('/sign-in')}
                className="rounded-full text-ink-soft hover:text-ink hover:bg-navy-soft ease-smooth transition-colors"
              >
                Sign in
              </Button>
              <Button
                size="sm"
                onClick={nav('/sign-up')}
                className="rounded-full bg-navy hover:bg-navy/90 text-white px-4 ease-smooth transition-all hover:-translate-y-px"
              >
                Get started
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
