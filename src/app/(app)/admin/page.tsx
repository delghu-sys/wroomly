import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, Users, Flag, CreditCard, ArrowRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin Dashboard' }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profileData } = await supabase
    .from('users')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if ((profileData as { user_type?: string } | null)?.user_type !== 'admin') redirect('/dashboard')

  const [pendingListingsRes, totalUsersRes, openReportsRes, totalTxRes] = await Promise.all([
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('transactions').select('amount_cents').eq('status', 'succeeded'),
  ])

  const totalRevenue = ((totalTxRes.data ?? []) as { amount_cents: number }[])
    .reduce((sum, t) => sum + t.amount_cents, 0)

  const stats = [
    { icon: Home, label: 'Pending review', value: pendingListingsRes.count ?? 0, href: '/admin/listings', alert: (pendingListingsRes.count ?? 0) > 0 },
    { icon: Users, label: 'Total users', value: totalUsersRes.count ?? 0, href: '/admin/users' },
    { icon: Flag, label: 'Open reports', value: openReportsRes.count ?? 0, href: '/admin/reports', alert: (openReportsRes.count ?? 0) > 0 },
    { icon: CreditCard, label: 'GMV (succeeded)', value: `$${(totalRevenue / 100).toLocaleString()}`, href: '#' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ icon: Icon, label, value, href, alert }) => (
          <Link key={label} href={href}>
            <Card className={`hover:shadow-md transition-shadow cursor-pointer ${alert ? 'border-blue-300' : ''}`}>
              <CardContent className="pt-5 pb-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${alert ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <Icon className={`w-5 h-5 ${alert ? 'text-blue-600' : 'text-gray-500'}`} />
                </div>
                <p className={`text-2xl font-bold ${alert ? 'text-blue-600' : 'text-gray-900'}`}>{value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: '/admin/listings', label: 'Review listings', desc: 'Approve or reject submitted listings', icon: Home },
          { href: '/admin/users', label: 'Manage users', desc: 'View, verify, or suspend user accounts', icon: Users },
          { href: '/admin/reports', label: 'Handle reports', desc: 'Review reports from the community', icon: Flag },
        ].map(({ href, label, desc, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Icon className="w-5 h-5 text-blue-600" />
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
