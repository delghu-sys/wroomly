import { format, parseISO } from 'date-fns'

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function formatDateRange(from: string, to: string): string {
  const fromDate = parseISO(from)
  const toDate = parseISO(to)
  const fromStr = format(fromDate, 'MMM yyyy')
  const toStr = format(toDate, 'MMM yyyy')
  return fromStr === toStr ? fromStr : `${fromStr} – ${toStr}`
}

// "YYYY-MM" → "YYYY-MM-01"
export function monthToFromDate(yyyymm: string): string {
  return `${yyyymm}-01`
}

// "YYYY-MM" → last day of that month, ISO date "YYYY-MM-DD"
export function monthToToDate(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number)
  // day 0 of next month = last day of this month
  const d = new Date(Date.UTC(y, m, 0))
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// "YYYY-MM-DD" → "YYYY-MM" (for <input type="month"> defaultValue)
export function dateToMonth(yyyymmdd: string | null | undefined): string {
  if (!yyyymmdd) return ''
  return yyyymmdd.slice(0, 7)
}

export function getListingImageUrl(storagePath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${storagePath}`
}
