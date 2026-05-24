# Wroomly — Legal & Compliance Checklist

**Status:** Living document. Update as items get done.
**Last updated:** 2026-05-21

> ⚠️ This is a roadmap, not legal advice. Wroomly is a peer-to-peer
> housing marketplace operating in Michigan, taking payments through
> Stripe Connect. For anything marked **lawyer required**, do not skip.
> A $1000 consult before launch is cheaper than a $50k lawsuit after.

---

## How to use this doc

Items are organized in three buckets:

- 🔴 **Pre-launch blockers** — do these before letting real users on or
  taking real money. Skipping any of them creates real exposure.
- 🟡 **First 30 days** — important, but launch can happen without
  them in place if you're moving fast.
- 🟢 **As you grow** — relevant once you have users / revenue / a team.

For each item:
- **What it is** — plain English explanation
- **Why** — what bad thing happens without it
- **Do** — concrete next action
- **Cost** — rough $$ estimate
- **Lawyer needed?** — yes/no/optional

---

## 🔴 PRE-LAUNCH BLOCKERS

### 1. Form an LLC + get an EIN

- **What:** Register Wroomly as a limited liability company. The LLC
  becomes the legal entity that signs contracts, holds the Stripe
  account, pays taxes, and shields your personal assets from business
  liability.
- **Why:** Without it, every Wroomly dispute / debt / lawsuit hits
  YOUR personal name and credit. A single bad refund dispute could
  cost you personally. Also: live Stripe Connect requires a registered
  business entity.
- **Do:**
  - [ ] Choose between LLC and C-Corp (LLC is right unless raising VC
        in the next 6 months — see `docs/recurring-rent-design.md`'s
        decision tree)
  - [ ] Choose registration state (Michigan if that's where you are;
        Delaware if you want VC-friendly structure)
  - [ ] File via **Stripe Atlas** (recommended — bundles LLC + EIN +
        Stripe + Mercury bank): https://stripe.com/atlas
  - OR file directly:
    - Michigan LLC: https://www.michigan.gov/lara → ~$50 + ~$25/yr
      annual report
    - Delaware LLC: https://corp.delaware.gov → ~$110 + $300/yr
      franchise tax
  - [ ] Apply for EIN with IRS (free, ~10 minutes, instant if US
        citizen): https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online
- **Cost:** $50-$500 one-time + $25-$300/yr
- **Lawyer needed?** No (do-it-yourself is fine for a single-member LLC)

---

### 2. Live Stripe Connect approval

- **What:** Activate Connect for real-money transactions (currently in
  sandbox). Requires your LLC + EIN.
- **Why:** Without this, real students literally can't pay you. You're
  stuck in sandbox forever.
- **Do:**
  - [ ] After LLC + EIN are in hand
  - [ ] Stripe Dashboard → toggle to Live → Connect → Activate
  - [ ] Submit platform profile: marketplace, peer-to-peer housing,
        student verification, ~$1000-2000 average transaction, monthly
        volume estimate
  - [ ] Stripe usually approves student-housing marketplaces in 1-3
        business days
  - [ ] Once approved: swap sandbox keys → live keys in Vercel
- **Cost:** Free (Stripe takes their 2.9% + $0.30 per charge, already
  budgeted in your fee structure)
- **Lawyer needed?** No

---

### 3. Marketplace disclaimer — "Wroomly is NOT your landlord"

- **What:** Explicit, prominent disclosure in ToS + at booking + in
  the booked-listing page that Wroomly is only a facilitator — the
  rental contract is between the consumer (renter) and the supplier
  (host). Wroomly doesn't own, manage, or guarantee the property.
- **Why:** Without it, a consumer whose place turns out to be
  uninhabitable / a scam / unsafe can sue Wroomly under landlord
  liability. With it, the suit goes to the supplier (where it belongs).
  Same pattern Airbnb uses.
- **Do:**
  - [ ] Add a paragraph to `/terms` page: "Wroomly is a marketplace.
        The rental agreement is between you and the host. Wroomly is
        not a party to the rental, does not inspect properties, and
        is not responsible for habitability, safety, or condition of
        listed properties."
  - [ ] Add a check-the-box disclosure at checkout: "I understand
        Wroomly is a marketplace and the rental contract is between
        me and the host."
  - [ ] Add a small "Marketplace · Not the landlord" footnote on
        each listing detail page
- **Cost:** Free (~2-3 hours of code work)
- **Lawyer needed?** Optional pre-launch, **required before serious
  growth** to make sure the language is enforceable in Michigan

---

### 4. Sublease agreement at checkout

- **What:** A simple, standardized sublease document that both
  consumer and supplier acknowledge during the payment flow. Binds
  both sides to:
  - Rent amount + payment cadence (Wroomly does month 1, off-platform
    after)
  - Deposit amount + return conditions
  - Move-in / move-out dates
  - Cancellation policy
  - Damage / cleaning responsibilities
  - Utilities (included or not)
  - Pet policy
- **Why:** Right now, when someone pays through Wroomly, there's NO
  written contract between them and the host. If a dispute arises,
  there's nothing to point to. Both parties are exposed.
- **Do:**
  - [ ] Draft a Michigan sublease template (Stripe Atlas often
        includes templates, or use a Nolo template ~$30)
  - [ ] Have a lawyer review for ~$300-500 (Michigan landlord-tenant
        law is specific — DON'T skip this)
  - [ ] Implement: at checkout, both consumer and supplier sign with
        a typed-name + checkbox confirmation
  - [ ] Store signed copies in DB (for legal record)
  - [ ] Email PDF copy to both parties post-booking
- **Cost:** $300-500 (lawyer review) + ~5h code work
- **Lawyer needed?** **YES** — this is the single most important
  legal-review item

---

### 5. Fair Housing Act compliance

- **What:** Federal law prohibiting discrimination in housing based on
  race, color, religion, national origin, sex (including gender
  identity & sexual orientation), familial status, disability. Michigan
  adds source-of-income and marital status.
- **Why:** Listings or supplier behavior that discriminates can result
  in HUD complaints, fines ($16k+ per violation), and lawsuits — and
  the **platform** can be liable if it facilitates the discrimination
  (e.g., letting suppliers post "no [protected class]" preferences).
- **Do:**
  - [ ] Your AI moderator already flags discriminatory language —
        verify the prompt explicitly mentions protected classes
        (currently it does)
  - [ ] Add a Fair Housing notice on the listing creation form: "Per
        federal & Michigan law, you cannot discriminate based on
        race, color, religion, national origin, sex, gender identity,
        sexual orientation, familial status, disability, source of
        income, or marital status."
  - [ ] Add Fair Housing notice to consumer-facing inquiry form too
  - [ ] Add to ToS that any discriminatory listing will be removed
        and account suspended
- **Cost:** Free (1-2h code)
- **Lawyer needed?** Optional, but read HUD's Fair Housing landing
  page: https://www.hud.gov/program_offices/fair_housing_equal_opp

---

### 6. Age gate at signup (18+)

- **What:** Verify users are 18+ before account creation.
- **Why:** You're taking payments from these people. Minors can't
  enter binding contracts. If a 17-year-old uses Wroomly and their
  parents sue, you have nothing. Also: COPPA requires special
  handling for under-13s, simpler to just block them entirely.
- **Do:**
  - [ ] Add a checkbox on signup: "I am 18 years or older"
        (required)
  - [ ] Add to ToS: "Service restricted to users 18+"
  - [ ] (Optional, stronger): require DOB on signup, computed against
        18+
- **Cost:** Free (~30min)
- **Lawyer needed?** No

---

## 🟡 FIRST 30 DAYS

### 7. Privacy Policy — sub-processors + GDPR/CCPA

- **What:** Update privacy policy to disclose all third-party services
  that process user data, plus GDPR (EU) and CCPA (California)
  required rights.
- **Why:** GDPR fines are up to 4% of global revenue. CCPA fines $2.5k
  per violation, $7.5k for intentional. You don't have EU/CA users yet
  but you will, and the disclosures are required by their location not
  yours.
- **Sub-processors to list (audit current setup):**
  - Supabase — auth, database, storage
  - Stripe — payments
  - Resend — email
  - Anthropic — listing moderation (AI)
  - Vercel — hosting + analytics
  - Sentry — error tracking
  - Mapbox — map display
- **Required content:**
  - [ ] What data you collect (email, photos, messages, payment info,
        device info, etc.)
  - [ ] Why (book sublets, fraud prevention, etc.)
  - [ ] Who you share with (the sub-processors above)
  - [ ] Data retention period (e.g., 7 years for financial records,
        2 years for inactive accounts, indefinite for support tickets)
  - [ ] User rights (access, deletion, export, opt-out of marketing)
  - [ ] Contact email for data requests (`privacy@wroomly.app`)
  - [ ] Cookie disclosure if you add analytics
- **Do:**
  - [ ] Draft updates (I can help with first draft)
  - [ ] Lawyer review
  - [ ] Add a "Last updated" date that's actually current
  - [ ] Build a `/api/privacy/delete-me` endpoint so users can request
        deletion (GDPR Article 17)
- **Cost:** ~$500 lawyer review (or DIY with iubenda.com ~$30/mo)
- **Lawyer needed?** **Optional but recommended** if you'll ever serve
  EU users

---

### 8. Terms of Service — beef up + lawyer review

- **What:** Strengthen the existing ToS with standard SaaS protections.
- **Why:** Limits how much you can be sued for, where lawsuits happen,
  what users can and can't do, what happens if they break the rules.
- **Required clauses to add (or verify exist):**
  - [ ] **Acceptable use** — no scams, no discrimination, no off-platform
        contact pushing
  - [ ] **Marketplace disclaimer** (see item 3)
  - [ ] **Limitation of liability** — caps Wroomly's max liability
        (typically: "the lesser of $100 or fees paid in last 12 months")
  - [ ] **Indemnification** — if a user gets Wroomly sued for their
        behavior, they cover the costs
  - [ ] **Arbitration clause** — disputes go to arbitration, not court
        (cheaper for you, restrictive for them — controversial but
        standard)
  - [ ] **Class action waiver** — users can't aggregate claims
  - [ ] **Governing law** — Michigan (or Delaware if Delaware LLC)
  - [ ] **Termination** — when you can suspend accounts
  - [ ] **Modification** — how you'll notify users of ToS changes
- **Cost:** $500-1500 lawyer review
- **Lawyer needed?** **YES** if you ever take more than ~$10k in
  total platform revenue

---

### 9. Refund policy

- **What:** Written policy for when refunds happen and don't.
- **Why:** Without one, every disputed payment is a case-by-case
  fight. With one, Stripe disputes are much easier to win.
- **Topics to cover:**
  - [ ] Consumer cancels before move-in date: refund minus 5% fee?
        Sliding scale based on how close to move-in?
  - [ ] Supplier cancels: full refund + processing fee absorbed by
        Wroomly?
  - [ ] Property uninhabitable on arrival: full refund process?
  - [ ] Disputes after move-in: who arbitrates?
  - [ ] Deposit returns: timeline (Michigan law is 30 days), process
- **Do:**
  - [ ] Draft the policy
  - [ ] Add to ToS
  - [ ] Add a section to `/help` or FAQ
  - [ ] Email after each booking with refund-policy summary
- **Cost:** Free if you draft, $300 lawyer review
- **Lawyer needed?** Optional but smart

---

### 10. 1099-K reporting (for suppliers)

- **What:** IRS requires Wroomly to report supplier earnings if they
  exceed $5000/year (2025 federal threshold, dropping to $600 in 2026
  per current legislation).
- **Why:** Wroomly is technically a "third-party payment network" by
  IRS definition. You're required to file 1099-Ks for each qualifying
  supplier.
- **Do:**
  - [ ] **Stripe handles this for you on Connect** — they file the
        1099-Ks for connected accounts directly
  - [ ] Verify in Stripe Dashboard → Connect → Tax → 1099-Ks
        settings is enabled
  - [ ] No action needed unless Stripe surfaces an issue
- **Cost:** Free (Stripe absorbs filing cost)
- **Lawyer needed?** No

---

## 🟢 AS YOU GROW

### 11. Trademark "Wroomly" with USPTO

- **What:** Register the name + (later) logo as federal trademarks.
- **Why:** Without it, someone else can register "Wroomly" and force
  you to rebrand. The name is your brand asset.
- **Do:**
  - [ ] Self-file at uspto.gov for ~$350
  - [ ] Or use LegalZoom / Trademark Engine ~$300-500
  - [ ] Lawyer-assisted for $1000-1500 (catches conflicts faster)
- **Cost:** $350-1500
- **Lawyer needed?** Optional, but trademark lawyers are cheap insurance
- **When:** Once you have 100+ users and the name matters

---

### 12. General Liability Insurance

- **What:** Insurance against being sued for injury, property damage,
  or similar.
- **Why:** If a consumer slips in a Wroomly-listed place and sues
  Wroomly, your LLC + this insurance are what stand between you and
  losing your shirt.
- **Providers (US):**
  - Hiscox — startup-friendly, fast online quotes
  - Next Insurance — same
  - Embroker — broker, can shop around
- **Cost:** $40-80/mo
- **Lawyer needed?** No
- **When:** Before you have 100+ active bookings

---

### 13. Cyber/Data Breach Insurance

- **What:** Insurance covering costs of a data breach (notification,
  credit monitoring for affected users, legal, PR).
- **Why:** Supabase could get breached. Even if it's not your fault,
  state laws require YOU to notify affected users + pay for credit
  monitoring. That's expensive.
- **Cost:** $50-150/mo at low scale
- **When:** 500+ users

---

### 14. D&O (Directors & Officers) Insurance

- **What:** Insurance protecting officers personally from business
  liability claims.
- **Why:** Required by most VC term sheets.
- **When:** Only when raising institutional money

---

### 15. Lodging / Occupancy Tax

- **What:** Ann Arbor has a 6% accommodations tax for short-term rentals.
- **Why:** Subleases >30 days are usually exempt (treated as residential
  leases, not "transient lodging"). But you need to confirm.
- **Do:**
  - [ ] Contact Ann Arbor Treasurer's Office to confirm sublease
        exemption: (734) 794-6500
  - [ ] If not exempt: build tax collection into checkout, file
        quarterly with the city
- **Cost:** Free to ask, possibly 6% of rent if applicable
- **Lawyer needed?** Michigan real estate lawyer if it's not clear

---

### 16. Anti-Discrimination Training (for Supplier Onboarding)

- **What:** Quick "Fair Housing 101" module suppliers complete before
  their first listing goes live.
- **Why:** Reduces your platform-liability risk dramatically. Shows good
  faith if HUD ever investigates.
- **Cost:** Free (1-2 day implementation)
- **When:** Before 50 suppliers

---

## REFERENCE — Service Providers You're Already Using

| Service | What it does | Compliance notes |
|---|---|---|
| Stripe | Payments, Connect, identity verification | PCI DSS Level 1, GDPR/CCPA compliant, handles money transmitter licenses, files 1099-Ks |
| Supabase | DB, auth, storage | GDPR compliant, SOC 2 Type II, ISO 27001. Data lives in `us-east-1` |
| Resend | Transactional email | GDPR/CCPA aware, list as sub-processor in privacy policy |
| Anthropic | AI listing moderation | Data not used to train models per their API ToS |
| Vercel | Hosting | SOC 2, GDPR. Data lives in `us-east-1` (Washington DC) |
| Sentry | Error tracking | GDPR compliant, scrubs PII by default |
| Mapbox | Map display | GDPR/CCPA compliant |

---

## REFERENCE — Useful Resources

- **Stripe Atlas (LLC + EIN + Stripe in one):** https://stripe.com/atlas
- **Fair Housing Act:** https://www.hud.gov/program_offices/fair_housing_equal_opp
- **Michigan LLC formation:** https://www.michigan.gov/lara/bureau-list/cscl/corps
- **IRS EIN application:** https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online
- **USPTO trademark:** https://www.uspto.gov/trademarks
- **Michigan landlord-tenant law:** https://www.michigan.gov/ag/consumer-protection/tenants-rights
- **Ann Arbor short-term rental rules:** https://www.a2gov.org/services/business/Pages/default.aspx

---

## REFERENCE — Lawyer Hiring Guide

You probably need a lawyer who handles all of:

1. **Business formation** (LLC + initial contracts)
2. **Real estate / landlord-tenant** (sublease template for Michigan)
3. **Tech / SaaS** (ToS, Privacy, GDPR)
4. **IP** (trademark — separate, usually cheaper)

For an MVP, find a **startup-focused boutique firm** that bundles these.
Avoid BigLaw — overpriced, slow. Look at:

- **Cooley GO** (free templates, paid review): https://www.cooleygo.com/
- **LegalZoom / Atlas Legal** (cheap, online, less custom)
- **Local Michigan startup lawyer** — ask other founders for referrals
- **Clerky** (incorporation-focused, $799 for full package)

Budget: **$1000-2000** for initial pre-launch review of everything.
Worth it.

---

## QUICK PRE-LAUNCH CHECKLIST

Before launching to real users with real money, all of these must be ✅:

- [ ] LLC formed + EIN issued
- [ ] Live Stripe Connect approved
- [ ] LLC bank account opened (Mercury, Brex, or local)
- [ ] LLC signed up as a Stripe business (not personal)
- [ ] ToS includes marketplace disclaimer, limitation of liability,
      arbitration, indemnification, governing law
- [ ] Privacy policy lists all sub-processors + retention + user rights
- [ ] Fair Housing notice on listing creation
- [ ] 18+ age gate on signup
- [ ] Sublease agreement template approved by Michigan lawyer
- [ ] Sublease shown at checkout, both parties acknowledge
- [ ] Refund policy written + linked from ToS
- [ ] One full sentence of disclaimer at booking: "This is a marketplace.
      Wroomly is not a party to your rental. The host owns the place."
- [ ] Insurance quote obtained (don't have to buy yet, but know cost)
- [ ] Lawyer reviewed everything above (~$1000-1500 one-time)

When all of those are checked, you're as legally prepared as a small
startup needs to be. Iterate from there.
