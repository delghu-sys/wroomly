import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { AdminUserActions } from '@/components/admin/AdminUserActions'
import { format, parseISO } from 'date-fns'
import { Ban, Search, ShieldCheck, Users } from 'lucide-react'
import type { User } from '@/types/database'
import { EmptyState } from '@/components/brand/EmptyState'

export const metadata: Metadata = { title: 'Admin: Users' }

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>
}) {
  const { q, role } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: me } = await supabase
    .from('users')
    .select('user_type')
    .eq('id', user.id)
    .single()
  if ((me as { user_type?: string } | null)?.user_type !== 'admin') redirect('/dashboard')

  // Admin console lists + searches users by email — unreadable by authenticated
  // after 029, so this admin-gated query runs under the service role.
  const service = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = service
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (role && ['supplier', 'consumer', 'admin'].includes(role)) {
    query = query.eq('user_type', role)
  }
  if (q) {
    // PostgREST `.or()` uses `,` as the term separator and `()` for grouping —
    // a raw `q` like `foo),user_type.eq.admin,(x` would break out of the
    // intended filter. Strip the metachars before interpolation. We also
    // cap length so a malicious value can't be used to DoS the query planner.
    const safe = q.replace(/[(),*]/g, '').slice(0, 80)
    if (safe) {
      query = query.or(
        `email.ilike.%${safe}%,full_name.ilike.%${safe}%,university.ilike.%${safe}%`,
      )
    }
  }

  const { data: usersData } = await query.limit(200)
  const users = (usersData ?? []) as User[]

  const TABS = [
    { label: 'All', value: '' },
    { label: 'Consumers', value: 'consumer' },
    { label: 'Suppliers', value: 'supplier' },
    { label: 'Admins', value: 'admin' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl tracking-tight text-ink">Users</h1>
          <p className="text-sm text-ink-muted mt-1">{users.length} {users.length === 1 ? 'user' : 'users'}</p>
        </div>
      </div>

      {/* Filters */}
      <form action="/admin/users" className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by name, email, or university…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-line bg-surface text-sm outline-none focus:border-navy focus:ring-2 focus:ring-navy-soft"
          />
          {role && <input type="hidden" name="role" value={role} />}
        </div>
        <button
          type="submit"
          className="h-9 px-4 rounded-lg bg-navy-deep text-maize-bright text-sm font-medium hover:bg-navy-deep/90"
        >
          Search
        </button>
      </form>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(tab => {
          const href = tab.value
            ? `/admin/users?role=${tab.value}${q ? `&q=${encodeURIComponent(q)}` : ''}`
            : `/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`
          const active = (role ?? '') === tab.value
          return (
            <Link
              key={tab.value}
              href={href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-navy-deep text-maize-bright' : 'bg-surface text-ink-soft hover:bg-navy-soft'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {users.length === 0 ? (
        <EmptyState
          size="sm"
          icon={<Users className="w-5 h-5" strokeWidth={1.75} />}
          title="No users match those filters"
          description="Try a different role or verification filter."
        />
      ) : (
        <div className="bg-surface border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-navy-soft/40 text-ink-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-medium">User</th>
                <th className="text-left px-5 py-3 font-medium">University</th>
                <th className="text-left px-5 py-3 font-medium">Role</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Joined</th>
                <th className="text-right px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const initials = u.full_name
                  ?.split(' ')
                  .map(n => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
                const isMe = u.id === user.id

                return (
                  <tr key={u.id} className="border-t border-line hover:bg-navy-soft/30">
                    <td className="px-5 py-3">
                      <Link href={`/users/${u.id}`} className="flex items-center gap-3 group">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={u.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs bg-navy-soft text-navy">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-ink truncate group-hover:underline">
                            {u.full_name ?? '—'}
                          </p>
                          <p className="text-xs text-ink-muted truncate">{u.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{u.university ?? '—'}</td>
                    <td className="px-5 py-3">
                      <Badge
                        variant="outline"
                        className={
                          u.user_type === 'admin'
                            ? 'border-navy/30 text-navy'
                            : u.user_type === 'supplier'
                              ? 'border-emerald-300 text-emerald-700'
                              : 'border-line text-ink-soft'
                        }
                      >
                        {u.user_type}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {u.is_suspended ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600">
                            <Ban className="w-3 h-3" /> Suspended
                          </span>
                        ) : u.is_verified ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[#2F6BFF]">
                            <ShieldCheck className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="text-xs text-ink-muted">Unverified</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink-muted text-xs whitespace-nowrap">
                      {format(parseISO(u.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!isMe && (
                        <AdminUserActions
                          userId={u.id}
                          currentRole={u.user_type}
                          isSuspended={u.is_suspended}
                          isVerified={u.is_verified}
                        />
                      )}
                      {isMe && <span className="text-xs text-ink-muted">You</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
