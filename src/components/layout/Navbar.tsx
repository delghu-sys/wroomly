'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
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
import { MessageSquare, Menu, X } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'

interface NavbarProps {
  user: User | null
  unreadCount?: number
}

export function Navbar({ user, unreadCount = 0 }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Pages whose top sections use the dark atmospheric hero. The navbar starts
  // transparent over them and fades to a solid glassy bar on scroll.
  const hasDarkHero =
    pathname === '/' ||
    pathname === '/listings' ||
    pathname === '/about'

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 50)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const transparent = hasDarkHero && !scrolled

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function nav(href: string) {
    return () => {
      setMobileOpen(false)
      router.push(href)
    }
  }

  const initials = user?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        transparent
          ? 'bg-transparent border-b border-transparent'
          : 'bg-background/80 backdrop-blur-xl border-b border-line/80 shadow-[0_1px_3px_oklch(0_0_0/0.04)] supports-[backdrop-filter]:bg-background/60'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 group ease-smooth transition-opacity hover:opacity-80"
        >
          <LogoMark
            size={32}
            className="ease-smooth transition-transform group-hover:scale-105 group-hover:rotate-[-3deg]"
          />
          <span
            className={`font-display text-lg font-semibold tracking-tighter transition-colors duration-500 ${
              transparent ? 'text-white' : 'text-ink'
            }`}
          >
            wroomly
          </span>
        </Link>

        {/* Center links — desktop */}
        <div className="hidden md:flex items-center gap-7">
          <Link
            href="/listings"
            className={`underline-grow text-sm font-medium ease-smooth transition-colors ${
              transparent
                ? 'text-white/70 hover:text-white'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            Browse
          </Link>
          <Link
            href="/about"
            className={`underline-grow text-sm font-medium ease-smooth transition-colors ${
              transparent
                ? 'text-white/70 hover:text-white'
                : 'text-ink-soft hover:text-ink'
            }`}
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
                  className={`rounded-full ease-smooth transition-colors ${
                    transparent
                      ? 'text-white/70 hover:text-white hover:bg-white/10'
                      : 'hover:bg-navy-soft'
                  }`}
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
                    className={`rounded-full px-4 ease-smooth transition-all hover:-translate-y-px ${
                      transparent
                        ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                        : 'bg-navy hover:bg-navy/90 text-white'
                    }`}
                  >
                    + List a place
                  </Button>
                </div>
              )}

              {/* Avatar dropdown — desktop */}
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 focus:ring-offset-background ease-smooth transition-transform hover:scale-[1.03]">
                    <Avatar className={`h-9 w-9 ring-1 ${transparent ? 'ring-white/20' : 'ring-line'}`}>
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
                    <DropdownMenuItem onClick={nav('/dashboard')} className="rounded-lg">
                      Dashboard
                    </DropdownMenuItem>
                    {(user.user_type === 'supplier' || user.user_type === 'admin') && (
                      <>
                        <DropdownMenuItem onClick={nav('/my-listings')} className="rounded-lg">
                          My listings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={nav('/inquiries')} className="rounded-lg">
                          Inquiries
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={nav('/payouts')} className="rounded-lg">
                          Payouts
                        </DropdownMenuItem>
                      </>
                    )}
                    {user.user_type === 'consumer' && (
                      <>
                        <DropdownMenuItem onClick={nav('/favorites')} className="rounded-lg">
                          Saved listings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={nav('/applications')} className="rounded-lg">
                          Applications
                        </DropdownMenuItem>
                      </>
                    )}
                    {user.user_type === 'admin' && (
                      <DropdownMenuItem onClick={nav('/admin')} className="rounded-lg">
                        Admin dashboard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={nav('/profile')} className="rounded-lg">
                      Profile settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setMobileOpen(false)
                        signOut()
                      }}
                      className="rounded-lg text-destructive focus:text-destructive"
                    >
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Hamburger — mobile */}
              <button
                onClick={() => setMobileOpen(o => !o)}
                className={`md:hidden w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  transparent
                    ? 'text-white hover:bg-white/10'
                    : 'hover:bg-navy-soft'
                }`}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={nav('/sign-in')}
                className={`rounded-full ease-smooth transition-colors ${
                  transparent
                    ? 'text-white/70 hover:text-white hover:bg-white/10'
                    : 'text-ink-soft hover:text-ink hover:bg-navy-soft'
                }`}
              >
                Sign in
              </Button>
              <Button
                size="sm"
                onClick={nav('/sign-up')}
                className={`hidden sm:inline-flex rounded-full px-4 ease-smooth transition-all hover:-translate-y-px ${
                  transparent
                    ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                    : 'bg-navy hover:bg-navy/90 text-white'
                }`}
              >
                Get started
              </Button>
              <button
                onClick={() => setMobileOpen(o => !o)}
                className={`md:hidden w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  transparent
                    ? 'text-white hover:bg-white/10'
                    : 'hover:bg-navy-soft'
                }`}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-line bg-background/95 backdrop-blur-xl animate-fade-up">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            <MobileLink href="/listings" onClick={() => setMobileOpen(false)}>
              Browse
            </MobileLink>
            <MobileLink href="/about" onClick={() => setMobileOpen(false)}>
              How it works
            </MobileLink>

            {user && (
              <>
                <div className="h-px bg-line my-2" />
                <MobileLink href="/dashboard" onClick={() => setMobileOpen(false)}>
                  Dashboard
                </MobileLink>
                <MobileLink href="/messages" onClick={() => setMobileOpen(false)}>
                  Messages{' '}
                  {unreadCount > 0 && (
                    <span className="ml-1.5 text-xs bg-maize text-navy px-1.5 py-0.5 rounded-full font-semibold">
                      {unreadCount}
                    </span>
                  )}
                </MobileLink>

                {(user.user_type === 'supplier' || user.user_type === 'admin') && (
                  <>
                    <MobileLink href="/my-listings" onClick={() => setMobileOpen(false)}>
                      My listings
                    </MobileLink>
                    <MobileLink href="/inquiries" onClick={() => setMobileOpen(false)}>
                      Inquiries
                    </MobileLink>
                    <MobileLink href="/listings/new" onClick={() => setMobileOpen(false)}>
                      + List a place
                    </MobileLink>
                  </>
                )}
                {user.user_type === 'consumer' && (
                  <>
                    <MobileLink href="/favorites" onClick={() => setMobileOpen(false)}>
                      Saved listings
                    </MobileLink>
                    <MobileLink href="/applications" onClick={() => setMobileOpen(false)}>
                      Applications
                    </MobileLink>
                  </>
                )}
                {user.user_type === 'admin' && (
                  <MobileLink href="/admin" onClick={() => setMobileOpen(false)}>
                    Admin
                  </MobileLink>
                )}

                <div className="h-px bg-line my-2" />
                <MobileLink href="/profile" onClick={() => setMobileOpen(false)}>
                  Profile settings
                </MobileLink>
                <button
                  onClick={() => {
                    setMobileOpen(false)
                    signOut()
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                >
                  Sign out
                </button>
              </>
            )}

            {!user && (
              <>
                <div className="h-px bg-line my-2" />
                <MobileLink href="/sign-in" onClick={() => setMobileOpen(false)}>
                  Sign in
                </MobileLink>
                <MobileLink href="/sign-up" onClick={() => setMobileOpen(false)}>
                  Create account
                </MobileLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-3 py-2.5 text-sm font-medium text-ink rounded-xl hover:bg-navy-soft transition-colors"
    >
      {children}
    </Link>
  )
}
