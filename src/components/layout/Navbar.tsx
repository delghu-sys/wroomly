'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { MessageSquare, Menu, X, House, Heart } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'
import { PAYMENTS_ENABLED } from '@/lib/config'
import { buildMenuSections, type MenuRole } from '@/lib/nav/site-menu'
import { SiteMenu } from './SiteMenu'

interface NavbarProps {
  user: User | null
  unreadCount?: number
  supplyOnly?: boolean
  /** A few neighborhoods for the site menu ({slug, name} only: the full copy stays on the server). */
  menuNeighborhoods?: { slug: string; name: string }[]
}

export function Navbar({ user, unreadCount = 0, supplyOnly = false, menuNeighborhoods = [] }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  // The menu remembers which page it was opened on, so any navigation (a link,
  // the back button) closes it without an effect.
  const [menuOpenedOn, setMenuOpenedOn] = useState<string | null>(null)
  const menuOpen = menuOpenedOn === pathname
  const closeMenu = useCallback(() => setMenuOpenedOn(null), [])
  const toggleMenu = useCallback(() => setMenuOpenedOn(p => (p === pathname ? null : pathname)), [pathname])
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

  // Solid while the site menu is open, so the bar and the panel read as one surface.
  const transparent = hasDarkHero && !scrolled && !menuOpen

  // Supply-only soft launch: hide the renter content links (Browse / How it
  // works) for anyone who isn't an exempt supplier/admin — they only lead to
  // /coming-soon, so they read as broken on supplier-flow pages.
  const hideRenterNav =
    supplyOnly && user?.user_type !== 'supplier' && user?.user_type !== 'admin'

  const menuRole: MenuRole | null =
    user?.user_type === 'admin' || user?.user_type === 'supplier' || user?.user_type === 'consumer' ? user.user_type : user ? 'consumer' : null
  const menuSections = useMemo(
    () => buildMenuSections({ role: menuRole, hideRenterNav, paymentsEnabled: PAYMENTS_ENABLED, unreadCount, neighborhoods: menuNeighborhoods }),
    [menuRole, hideRenterNav, unreadCount, menuNeighborhoods],
  )

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function nav(href: string) {
    return () => {
      closeMenu()
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
          : menuOpen
            ? 'bg-background border-b border-line'
            : 'mobile-frost bg-background/90 sm:bg-background/80 backdrop-blur-xl border-b border-line/80 shadow-1 sm:supports-[backdrop-filter]:bg-background/60'
      }`}
    >
      <nav aria-label="Main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
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
        {!hideRenterNav && (
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
              href="/list-place"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-maize text-navy text-[0.8125rem] font-bold ease-smooth transition-all hover:-translate-y-px hover:shadow-glow-maize"
            >
              <House className="w-3.5 h-3.5" strokeWidth={2.5} />
              List your place
            </Link>
            <Link
              href="/match"
              className={`underline-grow text-sm font-medium ease-smooth transition-colors ${
                transparent
                  ? 'text-white/70 hover:text-white'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              Get matched
            </Link>
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {/* Saved listings — a heart in the nav mirrors the heart on every
                  card, so "save" and "see saved" are equally discoverable.
                  Visible to every signed-in user: anyone can favorite, so the
                  destination can't be renter-only. */}
              <Button
                variant="ghost"
                size="icon"
                onClick={nav('/favorites')}
                aria-label="Saved listings"
                title="Saved listings"
                className={`rounded-full ease-smooth transition-colors ${
                  transparent
                    ? 'text-white/70 hover:text-white hover:bg-white/10'
                    : 'hover:bg-navy-soft'
                }`}
              >
                <Heart className="w-[18px] h-[18px]" />
              </Button>

              {/* Messages */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nav('/messages')}
                  aria-label="Messages"
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

              {/* Site menu — desktop. Everything on the site, next to the
                  account menu (which keeps the account pages). */}
              <button
                type="button"
                onClick={() => toggleMenu()}
                aria-expanded={menuOpen}
                aria-controls="site-menu"
                className={`hidden md:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-medium border ease-smooth transition-colors ${
                  transparent
                    ? 'text-white border-white/20 hover:bg-white/10'
                    : 'text-ink border-line hover:bg-navy-soft'
                }`}
              >
                {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />} Menu
              </button>

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
                        {PAYMENTS_ENABLED && (
                          <DropdownMenuItem onClick={nav('/payouts')} className="rounded-lg">
                            Payouts
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    {/* Saved listings for everyone — any user can favorite. */}
                    <DropdownMenuItem onClick={nav('/favorites')} className="rounded-lg">
                      Saved listings
                    </DropdownMenuItem>
                    {user.user_type === 'consumer' && (
                      <>
                        <DropdownMenuItem onClick={nav('/saved-searches')} className="rounded-lg">
                          Saved searches
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
                        closeMenu()
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
                onClick={() => toggleMenu()}
                className={`md:hidden w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  transparent
                    ? 'text-white hover:bg-white/10'
                    : 'hover:bg-navy-soft'
                }`}
                aria-label="Toggle menu"
                aria-expanded={menuOpen}
                aria-controls="site-menu"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </>
          ) : (
            <>
              {/* Site menu — desktop. Everything on the site, next to the
                  account menu (which keeps the account pages). */}
              <button
                type="button"
                onClick={() => toggleMenu()}
                aria-expanded={menuOpen}
                aria-controls="site-menu"
                className={`hidden md:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-medium border ease-smooth transition-colors ${
                  transparent
                    ? 'text-white border-white/20 hover:bg-white/10'
                    : 'text-ink border-line hover:bg-navy-soft'
                }`}
              >
                {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />} Menu
              </button>

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
                onClick={() => toggleMenu()}
                className={`md:hidden w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  transparent
                    ? 'text-white hover:bg-white/10'
                    : 'hover:bg-navy-soft'
                }`}
                aria-label="Toggle menu"
                aria-expanded={menuOpen}
                aria-controls="site-menu"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </>
          )}
        </div>
      </nav>

      <SiteMenu open={menuOpen} sections={menuSections} onClose={closeMenu} onSignOut={user ? signOut : undefined} />
    </header>
  )
}
