# Recurring monthly rent on Wroomly — design doc

**Status:** Proposed. Read with fresh eyes before deciding.
**Author:** Claude (with Hugo)
**Last updated:** 2026-05-19

## Why

Today Wroomly charges first month + deposit + fee at booking, then the
consumer and supplier handle months 2+ off-platform (Venmo, etc.). This
caps platform revenue at 5% of one month per booking. Recurring monthly
charges through Wroomly would:

- **Increase per-booking revenue 4×** (typical 4-month sublease) without
  changing acquisition.
- **Eliminate "where's my rent?" tension** between suppliers and consumers
  — Stripe charges automatically.
- **Increase platform stickiness** — both sides log in monthly to see
  status, opening upsell paths (renewals, deposit returns, reviews).

## What the user sees

### Consumer
- At booking: "First month + deposit charged now. Months 2–4 charged
  automatically on the 1st of each month. You can pause or cancel any
  time before the next charge."
- Each month: pre-charge email (3 days before) → charged → confirmation
  email. Same flow as Netflix.
- `/applications` shows "Next charge: $1050 on Apr 1" with a cancel link.

### Supplier
- `/payouts` shows the recurring pipeline:
  ```
  Apr 1 — $1000 (pending) — Jordan K.
  May 1 — $1000 (scheduled) — Jordan K.
  Jun 1 — $1000 (scheduled) — Jordan K.
  ```
- If a charge fails: "Heads up: Jordan's April payment failed. We're
  retrying in 3 days. They've been notified."

## Architecture choice: Stripe Subscriptions vs manual cron

Two ways to build recurring on Stripe Connect:

### Option A — Stripe Subscriptions
Use Stripe's built-in recurring billing. Create a `Subscription` per
booking, cancel after `total_months`.

| Pros | Cons |
|---|---|
| Stripe handles cadence, retries, dunning | Can't easily change amount mid-lease |
| Built-in customer portal for self-service | Subscription model assumes indefinite duration — finite leases need cancel_at config |
| Less code to maintain | Application fee on subscriptions has quirks |
| Stripe emails consumers about upcoming charges | Less control over exact charge timing |

### Option B — Manual cron + saved PaymentMethod
Save the consumer's PaymentMethod at booking. Nightly cron job checks
for transactions where `next_charge_date <= today` and creates a
PaymentIntent with `off_session: true, confirm: true`.

| Pros | Cons |
|---|---|
| Full control over exact timing | We own retry logic, dunning emails |
| Easy to change amount, pause, prorate | More code to maintain |
| Easier to model finite leases | Need to handle our own webhook plumbing for monthly events |
| Same destination-charge model as today (consistent code path) | Slightly higher risk of bugs in cron orchestration |

### Recommendation: **Option B (manual cron)**.

Subleases are finite, often need pro-rating, and the consumer's
relationship is "I'm paying rent to a person" — not "I'm subscribed to
a service." Manual charges via saved PaymentMethod model that
correctly. Plus it reuses the destination-charge code path you already
have for the first month — webhook handler doesn't need to learn a new
event type.

## Data model changes

### Migration 013: add recurrence fields to transactions

```sql
alter table transactions
  add column if not exists is_recurring         boolean not null default false,
  add column if not exists lease_start_date     date,           -- when month 1 of the lease begins
  add column if not exists lease_end_date       date,           -- when the lease ends (last month inclusive)
  add column if not exists months_total         integer,        -- total billable months
  add column if not exists month_index          integer,        -- which month this charge is for (1 = first, 2 = second, …)
  add column if not exists parent_transaction_id uuid           -- links recurring charges to the original booking row
    references transactions(id) on delete set null;

-- The original booking row has month_index=1, parent_transaction_id=null.
-- Each subsequent monthly charge has month_index=2..N and
-- parent_transaction_id pointing back to the original.

-- New transaction_status to track "scheduled but not yet charged":
alter type transaction_status add value if not exists 'scheduled';
```

### Why these columns

| Column | Purpose |
|---|---|
| `is_recurring` | Tells the cron job which bookings to scan. Backwards-compatible — old bookings = false. |
| `lease_start_date` | Used by cron to compute when month 2 is due. |
| `lease_end_date` | Cron stops scheduling after this. |
| `months_total` | Sanity check + UI display. |
| `month_index` | UI shows "Month 3 of 4". Also helps reconcile if cron runs twice. |
| `parent_transaction_id` | Group all monthly charges for one booking into one timeline view. |

### What's NOT changing
- `payer_id`, `payee_id`, `amount_cents`, `platform_fee_cents`,
  `deposit_cents`, `refunded_cents` — all stay. Each monthly charge is
  a separate `transactions` row with its own amount + fee.
- `users` table — consumer's `stripe_customer_id` is already saved;
  we'll just attach a default PaymentMethod to that customer.

## API surface

### New: save PaymentMethod at first checkout

**File:** `src/app/api/stripe/checkout/route.ts`

Add to the Stripe Checkout Session config:

```ts
payment_intent_data: {
  application_fee_amount: applicationFeeCents,
  transfer_data: { destination: supplier.stripe_account_id },
  // NEW: save the card for future off-session use.
  setup_future_usage: 'off_session',
  metadata: { ... },
},
```

After the first PaymentIntent succeeds (webhook handler), grab the
`payment_method` ID from the intent and:

```ts
await stripe.customers.update(customerId, {
  invoice_settings: { default_payment_method: paymentMethodId }
})
```

Now we have a default card on file for the consumer.

### New: schedule the recurring charges

After the first month's transaction row is inserted by the webhook,
also insert N-1 `scheduled` transaction rows — one per month:

```ts
// In webhook's handleCheckoutSession after upserting the month-1 row:
if (isRecurring && monthsTotal > 1) {
  const scheduled = []
  for (let m = 2; m <= monthsTotal; m++) {
    const chargeDate = addMonths(leaseStartDate, m - 1)
    scheduled.push({
      listing_id, payer_id, payee_id,
      type: 'monthly',
      status: 'scheduled',
      amount_cents: rentCents,           // rent only, NO deposit, NO platform_fee
      platform_fee_cents: 0,             // computed at charge time
      release_date: chargeDate,          // reused: when to charge
      is_recurring: true,
      lease_start_date: leaseStartDate,
      lease_end_date: leaseEndDate,
      months_total: monthsTotal,
      month_index: m,
      parent_transaction_id: monthOneTxId,
    })
  }
  await service.from('transactions').insert(scheduled)
}
```

This makes the `/payouts` and `/applications` views show the full
pipeline immediately — they're just rows in a table with `status =
'scheduled'`.

### New: nightly cron job

**File:** `src/app/api/cron/charge-monthly/route.ts`

Triggered by Vercel Cron daily at midnight UTC.

```ts
// 1. Find all scheduled transactions due today (or overdue).
const due = await service.from('transactions')
  .select('*')
  .eq('status', 'scheduled')
  .eq('is_recurring', true)
  .lte('release_date', today)

// 2. For each, charge the consumer's saved PaymentMethod.
for (const tx of due) {
  const { wroomlyFeeCents, stripeFeeCents, applicationFeeCents, totalChargeCents } =
    calculateFees(tx.amount_cents)  // rent only — no deposit on monthly charges

  try {
    const pi = await stripe.paymentIntents.create({
      amount: totalChargeCents,
      currency: 'usd',
      customer: consumer.stripe_customer_id,
      payment_method: consumer.default_payment_method,
      off_session: true,
      confirm: true,
      application_fee_amount: applicationFeeCents,
      transfer_data: { destination: supplier.stripe_account_id },
      metadata: { transaction_id: tx.id, month_index: tx.month_index },
    })

    await service.from('transactions').update({
      status: 'succeeded',
      stripe_payment_intent_id: pi.id,
      amount_cents: totalChargeCents,
      platform_fee_cents: applicationFeeCents,
    }).eq('id', tx.id)
  } catch (err) {
    // Card declined / insufficient funds / expired
    await service.from('transactions').update({ status: 'failed' }).eq('id', tx.id)
    // Email consumer + supplier
    // Schedule retry in 3 days (a new scheduled row with release_date = today + 3)
  }
}
```

**Vercel Cron config** in `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/charge-monthly", "schedule": "0 0 * * *" }
  ]
}
```

Secured by `process.env.CRON_SECRET` (auto-set by Vercel). The route
checks the `Authorization` header matches before running.

### Webhook handler changes

`payment_intent.succeeded` already runs in our webhook. We need it to
handle BOTH the first month (which currently sets status='rented' on
the listing) AND monthly recurring charges (which should NOT change
listing status — already rented).

Distinguish via the `transaction_id` metadata we set when creating the
recurring PaymentIntent. If `metadata.transaction_id` is present and
`month_index > 1`, skip the listing.status update.

### Cancellation flow

**File:** `src/app/api/applications/[id]/cancel/route.ts` (new)

Consumer (or supplier with reason) can cancel a recurring booking:

```ts
// 1. Verify the auth user is the consumer (or admin).
// 2. Mark all 'scheduled' transactions for this booking as 'cancelled'.
// 3. If the next charge is within 24 hours, refund it via PaymentIntent.refund.
// 4. Post a ::booking_cancelled:: system message in the conversation.
// 5. Optionally: refund a prorated portion of the current month (config flag).
```

UI: `/applications` shows a "Cancel booking" link next to active recurring
bookings. Clicking it opens a confirmation modal with:
- How many months remain
- What gets refunded (none, last month, or prorated)
- A reason text field

## Edge cases

| Case | Handling |
|---|---|
| Card declined on monthly charge | Mark `failed`, email both parties, retry in 3 days (one retry, then cancel) |
| Card expired before month 3 | Same as declined. Email asks consumer to update. |
| Consumer cancels mid-month | Refund unused portion if config flag is set; otherwise no refund (cleaner) |
| Supplier disables their listing mid-lease | Existing scheduled charges still go through (consumer paid for those months) |
| Supplier's Stripe Connect account becomes inactive | Block new charges, alert admin |
| Refund of month 1 (after recurring scheduled) | Cancel all `scheduled` rows |
| Cron job runs twice on same day | Use a `unique` constraint on `(parent_transaction_id, month_index)` to prevent duplicates |
| Lease end date in past at booking | Validate at checkout: lease must be ≥ 1 month and ≤ 12 months |
| Daylight saving time | All dates stored in UTC, charge at midnight UTC. Don't try to do "consumer's local time" — too messy. |
| Stripe Connect account on supplier side gets suspended | Pending charges fail. Mark transactions as `failed`, email admin. |
| Consumer asks for partial refund of a past month | Manual admin action via Stripe Dashboard → adjust `refunded_cents` |

## Failure handling — the "money disappeared" risk

The most dangerous failure mode: cron charges the consumer, the
PaymentIntent succeeds, but our DB update to mark it `succeeded` fails
(network blip, Supabase outage). Result: consumer is charged but our
records show `scheduled` → cron tries to charge again next day →
double-charge.

**Mitigation:**
1. **Idempotency key** on every PaymentIntent: use the `transactions.id`
   UUID. Stripe will refuse to create a duplicate PaymentIntent with the
   same key.
2. **UNIQUE constraint** on `transactions.stripe_payment_intent_id`
   (already exists from migration 007).
3. **Re-entrant cron**: if cron sees a `scheduled` row that already has a
   `stripe_payment_intent_id`, look it up in Stripe and use the existing
   intent's status instead of re-charging.

## UI changes

### Consumer side
- **`/applications`** card per booking shows:
  - "Month 3 of 4 • next charge $1050 on Apr 1"
  - "Cancel booking" button → confirmation modal
  - "Update payment method" link → Stripe Customer Portal (set up
    portal session in `/api/stripe/portal/route.ts`)
- **`/applications/[id]`** detail page (new — or expand existing
  applications card): shows the full timeline (Month 1: paid Feb 1,
  Month 2: paid Mar 1, Month 3: scheduled Apr 1, Month 4: scheduled May 1).

### Supplier side
- **`/payouts`** scheduled pipeline section above the existing past-payouts list.
- **`/my-listings`** shows "1 active booking" with timeline view.
- Email notifications:
  - 3 days before each charge: "Heads up: Jordan's April payment in 3 days."
  - On success: "April payment received from Jordan."
  - On failure: "April payment from Jordan failed. We're retrying."

## Testing strategy

### Sandbox e2e
1. Create supplier with Connect, create listing, accept inquiry from consumer.
2. Pay first month — verify card saved.
3. Manually run cron via `curl /api/cron/charge-monthly` with auth header.
4. Verify month 2 transaction transitions `scheduled` → `succeeded`.
5. Test failure: use Stripe's `pm_card_chargeDeclined` PaymentMethod →
   verify status `failed`, retry scheduled, email sent (mock).
6. Test cancel: cancel booking, verify all future `scheduled` rows
   become `cancelled`.

### Unit tests
- `calculateFees(rentCents, depositCents=0)` for monthly charges (no deposit on month 2+).
- `addMonths` edge cases (Jan 31 + 1 month = Feb 28? Feb 29?).
- Cron's duplicate-prevention logic.

### Add to Playwright suite
- `tests/e2e/recurring.spec.ts`:
  - Sign in as consumer, navigate to /applications, see "Next charge: ..."
  - Cancel a booking, verify subsequent scheduled rows update.

## Migration path for existing bookings

When we ship this, there will be 0-5 existing bookings (test ones). All
have `is_recurring = false` and `months_total = null`. The cron job
filters by `is_recurring = true`, so existing bookings are unaffected.
No backfill needed.

If we wanted to convert existing bookings to recurring, we'd need to:
1. Identify which bookings have months 2+ remaining.
2. Ask the consumer to add their card via Customer Portal.
3. Update the transaction row + insert scheduled rows.

We won't do this — the existing handful of test bookings can stay
single-payment.

## Rollout plan

1. **Migration 013** — ship the columns + status enum value. Backwards
   compatible (default to non-recurring).
2. **Save card at first checkout** — small change to existing route.
   Existing bookings unaffected because the column reads default false.
3. **Cron job + new transaction rows** — ship behind an `IS_RECURRING_ENABLED`
   env flag. Test in sandbox before flipping for production.
4. **Consumer UI** — `/applications` shows pipeline, cancel button.
5. **Supplier UI** — `/payouts` shows scheduled pipeline.
6. **Email notifications** — once the rest is verified.

Each step is its own commit + PR review. No big-bang rollout.

## Open questions

1. **What's the default lease length?** 4 months for summer sublets, but
   what about year-long leases? Cap at 12 months?
2. **Pro-rated refunds on mid-lease cancel** — yes or no? Yes makes
   consumers happier, no is simpler ops.
3. **Late fees** — if a charge fails, does the supplier collect a late
   fee? Don't think pre-launch.
4. **Auto-renew** — when lease ends, prompt to renew for another N
   months? Defer to v2.
5. **Should suppliers be able to set rent escalation** (month 2 = $1000,
   month 3 = $1050)? Defer.

## Estimated effort (revised, honest)

| Phase | Hours |
|---|---|
| Migration + types | 2 |
| Save card at checkout + webhook updates | 4 |
| Cron job + retry logic | 6 |
| Consumer UI (pipeline + cancel) | 5 |
| Supplier UI (`/payouts` pipeline) | 3 |
| Email notifications (Resend integration — note: requires real Resend API key) | 4 |
| Playwright tests | 3 |
| End-to-end sandbox testing + edge cases | 4 |
| **Total** | **~31 hours** |

For Hugo working evenings: probably 2 weeks. For a focused 2-3 day stretch: doable.

## When to decide

After reading this with fresh eyes tomorrow. Things to consider:

- Are you willing to maintain a cron job + recurring billing? It's not
  fire-and-forget — failed payments, expired cards, refund requests will
  happen.
- Does the 4× revenue justify another 2 weeks of building before users?
- Or does it make more sense to validate the basic flow with 5 beta
  users first, then come back and build this on top once you know they
  even like Wroomly?

Honest take: this is the right thing to build eventually, but **not the
single most important thing to build before getting users**. The most
important thing is finding out whether students actually want Wroomly
at all. You can do that with the current single-payment flow.

If you have a 2-week window with no other priorities, build it. If you
have other things competing for that time (LLC, beta testing, marketing
prep), do those first.
