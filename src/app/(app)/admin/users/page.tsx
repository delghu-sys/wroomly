import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { AdminUserActions } from '@/components/admin/AdminUserActions'
import { format, parseISO } from 'date-fns'
import { Search, ShieldCheck, Ban } from 'lucide-react'
import type { User } from '@/types/database'

export const metadata: Metadata = { title: 'Admin — Users' }

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
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-1">{users.length} {users.length === 1 ? 'user' : 'users'}</p>
        </div>
      </div>

      {/* Filters */}
      <form action="/admin/users" className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by name, email, or university…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          {role && <input type="hidden" name="role" value={role} />}
        </div>
        <button
          type="submit"
          className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
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
                active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {users.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium text-gray-600">No users match those filters</p>
        </div>
      ) : (
        <div className="bg-white border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
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
                  <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50/60">
                    <td className="px-5 py-3">
                      <Link href={`/users/${u.id}`} className="flex items-center gap-3 group">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={u.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate group-hover:underline">
                            {u.full_name ?? '—'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{u.university ?? '—'}</td>
                    <td className="px-5 py-3">
                      <Badge
                        variant="outline"
                        className={
                          u.user_type === 'admin'
                            ? 'border-blue-300 text-blue-700'
                            : u.user_type === 'supplier'
                              ? 'border-emerald-300 text-emerald-700'
                              : 'border-gray-300 text-gray-600'
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
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                            <ShieldCheck className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Unverified</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
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
                      {isMe && <span className="text-xs text-gray-400">You</span>}
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
