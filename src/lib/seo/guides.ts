// SEO: evergreen guide articles targeting informational long-tail queries
// ("how to sublet at university of michigan", "are ann arbor sublets safe",
// etc.). Real, useful, student-voiced prose — these earn links and rank
// for queries the listing pages can't. Rendered at /guides/[slug].

export interface GuideSection {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

export interface Guide {
  slug: string
  title: string // page <h1> + SEO title
  description: string // meta description
  excerpt: string // shown on the /guides index
  updated: string // ISO date for lastModified + display
  readingMinutes: number
  sections: GuideSection[]
}

export const GUIDES: Guide[] = [
  {
    slug: 'how-to-sublet-your-apartment-at-university-of-michigan',
    title: 'How to sublet your apartment at the University of Michigan',
    description:
      'A step-by-step guide for UMich students subletting their Ann Arbor apartment — checking your lease, setting a price, finding a verified subletter, and getting paid safely.',
    excerpt:
      "Leaving for the summer, a co-op, or study abroad? Here's how to sublet your Ann Arbor place without losing money or breaking your lease.",
    updated: '2026-05-21',
    readingMinutes: 6,
    sections: [
      {
        heading: 'First: check whether your lease even allows it',
        paragraphs: [
          "Before anything else, read your lease. Most Ann Arbor leases allow subletting but require written landlord approval, and some charge a small re-let fee. A few prohibit it outright. If you sublet against your lease and your landlord finds out, you can be on the hook — so get approval in writing first.",
          "If your building is managed by one of the big campus property companies, there's usually a form. Email your leasing office, ask for the sublet policy, and keep the reply. That paper trail protects you later.",
        ],
      },
      {
        heading: 'Set a price that actually fills the room',
        paragraphs: [
          "Summer sublets in Ann Arbor almost always go for less than the academic-year rate — students are competing for a smaller pool of renters, and most people only need May through August. Pricing at or slightly below what you pay is normal. Holding out for full rent usually means an empty room and you paying for it anyway.",
          'Look at comparable live listings near you to anchor your number. A furnished room a short walk from the Diag commands more than an unfurnished room out in Pittsfield — location and furniture are the two biggest levers.',
        ],
      },
      {
        heading: 'Write a listing people trust',
        paragraphs: [
          'Good photos do most of the work. Shoot in daylight, tidy up first, and include the actual room being sublet plus the kitchen, bathroom, and any shared space. Be honest about the number of roommates and the vibe — surprises are what cause sublets to fall apart halfway through.',
        ],
        bullets: [
          'Real daylight photos of the actual space',
          'Exact dates available (and whether they flex)',
          'Rent, deposit, and what utilities are included',
          'How many roommates, and a sentence about them',
          'Distance to campus / which bus line',
        ],
      },
      {
        heading: 'Vet your subletter — and get paid safely',
        paragraphs: [
          "The riskiest part of subletting is handing your place (and collecting money) from someone you've never met. This is exactly why Wroomly verifies every user with an @umich.edu email and runs payments through escrow: the subletter pays first month plus deposit through the platform, the money routes to you through Stripe, and nobody's wiring cash to a stranger.",
          "Whatever platform you use, never take a deposit by gift card, crypto, or a wire to an account you can't verify — those are the classic scam patterns. A real subletter will happily pay through a system that protects them too.",
        ],
      },
      {
        heading: 'Put it in writing',
        paragraphs: [
          'Even a simple written sublease agreement — dates, rent, deposit terms, who pays utilities, condition of the place — saves enormous headaches. It protects both of you if something goes sideways, and most landlords want a copy anyway. Take timestamped move-in photos so the deposit return is a non-issue at the end.',
        ],
      },
    ],
  },
  {
    slug: 'summer-sublets-in-ann-arbor-student-guide',
    title: "Summer sublets in Ann Arbor: a student's guide",
    description:
      'Everything UMich students need to know about finding or filling a summer sublet in Ann Arbor — timing, pricing, neighborhoods, and how to avoid getting scammed.',
    excerpt:
      'When to start looking, what summer rent really costs, and the neighborhoods worth targeting for a May–August sublet.',
    updated: '2026-05-21',
    readingMinutes: 5,
    sections: [
      {
        heading: 'The summer sublet market, explained',
        paragraphs: [
          'Most Ann Arbor student leases run 12 months, but a huge chunk of students leave town from roughly May through August — internships, co-ops, study abroad, or just going home. That mismatch is the entire summer sublet market: thousands of people paying for rooms they aren\'t using, looking for someone to cover them.',
          'For a subletter, that\'s leverage. Summer rates run well below the academic year, and supply peaks in spring. For someone subletting their place out, it means pricing realistically and listing early.',
        ],
      },
      {
        heading: 'When to start looking',
        paragraphs: [
          'The sweet spot to start searching is February through April for a summer move-in. Listings appear steadily through spring, with the biggest wave right around the end of winter semester as people lock in plans. If you wait until May, you\'ll find places — but the best-located, best-priced ones are usually gone.',
          'Setting a saved search early is the cheat code: you get emailed when a matching place posts instead of refreshing listings every day.',
        ],
      },
      {
        heading: 'What summer rent actually costs',
        paragraphs: [
          'Expect summer sublets to come in noticeably under the academic-year rate for the same unit — often a meaningful discount, because the person subletting just wants to stop paying for an empty room. Furnished places near Central Campus and South University hold value best; rooms further out or unfurnished go for less.',
        ],
      },
      {
        heading: 'Neighborhoods worth targeting',
        paragraphs: [
          'For a summer near campus, Central Campus and South University put you closest to everything but cost the most and move fastest. Kerrytown and the Old West Side trade a few minutes of walk for a quieter, cheaper stay. North Campus is ideal if you\'re doing summer research in engineering, music, or art.',
        ],
      },
      {
        heading: 'Stay safe',
        paragraphs: [
          'Summer is peak scam season for student housing — fake listings, "landlords" who need a deposit wired before you can see the place, prices too good to be true. Stick to platforms that verify identity and hold payments in escrow. On Wroomly every user is @umich.edu-verified and money moves through Stripe, so a sublet can\'t turn into a wire-transfer-to-nowhere.',
        ],
      },
    ],
  },
  {
    slug: 'subletting-vs-housing-swaps',
    title: 'Subletting vs. housing swaps: what U of M students should know',
    description:
      'Sublet or swap? A plain-English comparison for University of Michigan students weighing how to handle housing over the summer or a semester away.',
    excerpt:
      'Two ways to not pay for an empty room. Here\'s how subletting and housing swaps actually differ — and when each makes sense.',
    updated: '2026-05-21',
    readingMinutes: 4,
    sections: [
      {
        heading: 'What a sublet is',
        paragraphs: [
          'A sublet is the standard move: you find someone to take over your place (or a room in it) for a set period and pay rent, usually directly to you, while you stay responsible to your landlord. Money changes hands one direction. It\'s the right call when you\'re leaving town and just want your rent covered.',
        ],
      },
      {
        heading: 'What a housing swap is',
        paragraphs: [
          'A housing swap is when two students trade places for a period — you take theirs, they take yours. Common when you\'re both going somewhere for the same stretch (say, one of you to a program in another city, the other coming the opposite way). Often no money changes hands, or just a small balancing payment if the places differ in value.',
        ],
      },
      {
        heading: 'When each makes sense',
        paragraphs: [
          'Sublet if you simply need your rent covered while you\'re gone — it\'s simpler and there\'s a much bigger pool of people looking. Swap if you specifically need housing somewhere else for the same window and can find a counterpart, which is rarer but can mean near-zero net cost.',
        ],
        bullets: [
          'Sublet → you leave, someone covers your rent',
          'Swap → two people trade places, often money-neutral',
          'Sublets have far more supply and demand',
          'Swaps are harder to match but can be cheaper',
        ],
      },
      {
        heading: 'The fine print is the same',
        paragraphs: [
          'Either way, your lease rules still apply, your landlord usually needs to approve, and you want it in writing. And either way, the safety advice holds: verify who you\'re dealing with and don\'t move money outside a system that protects both sides. Wroomly supports both sublets and swaps, with verification and escrow on the paid side.',
        ],
      },
    ],
  },
  {
    slug: 'how-to-avoid-sublet-scams-ann-arbor',
    title: 'How to avoid sublet scams in Ann Arbor',
    description:
      'The common student housing scams in Ann Arbor and the exact red flags to watch for — so your UMich sublet search doesn\'t cost you a deposit.',
    excerpt:
      'Wired a deposit and never heard back? Here are the scam patterns that hit Ann Arbor students every year, and how to dodge them.',
    updated: '2026-05-21',
    readingMinutes: 5,
    sections: [
      {
        heading: 'Why students get targeted',
        paragraphs: [
          'Student housing is a scammer\'s dream: urgent timelines, people new to renting, big deposits, and a lot of deals done sight-unseen over the summer. Ann Arbor is no exception — every year UMich students lose deposits to listings that were never real.',
        ],
      },
      {
        heading: 'The red flags',
        paragraphs: [
          'Almost every scam shares the same tells. If you see these, slow down:',
        ],
        bullets: [
          'They want a deposit before you can see the place or meet',
          'Payment by gift card, crypto, Zelle to a stranger, or wire',
          'Price is way below everything comparable',
          'They\'re "out of town" and can\'t show it in person',
          'Pressure to decide right now or "lose it"',
          'Photos look stolen (reverse-image-search them)',
          'They dodge a video call or won\'t verify identity',
        ],
      },
      {
        heading: 'How to protect yourself',
        paragraphs: [
          'See the place — in person or at least over a live video call where they walk you through it. Verify the person is actually a student. Never pay with anything irreversible; a credit card or an escrow platform gives you recourse, a wire does not. And get the agreement in writing before any money moves.',
          'This is the whole reason Wroomly exists in the shape it does: every user is verified with an @umich.edu email, and payments run through Stripe escrow — the deposit and first month are held and routed through the platform, so there\'s no "wire me and trust me" step to get burned on.',
        ],
      },
      {
        heading: 'If you think you\'ve been scammed',
        paragraphs: [
          'Stop sending money immediately. If you paid by credit card, call your bank about a chargeback. Report the listing to wherever you found it and to the FTC. And tell other students — scammers reuse the same listings across Facebook groups and GroupMe every season.',
        ],
      },
    ],
  },
  {
    slug: 'security-deposits-ann-arbor-sublets',
    title: 'Security deposits for Ann Arbor sublets: what to know',
    description:
      'How security deposits work for sublets in Ann Arbor, Michigan — what\'s normal, your rights under Michigan law, and how to actually get yours back.',
    excerpt:
      'How much is normal, what Michigan law says, and the move-in photos that get your deposit back without a fight.',
    updated: '2026-05-21',
    readingMinutes: 5,
    sections: [
      {
        heading: 'What\'s a normal deposit',
        paragraphs: [
          'For a sublet, a deposit of around one month\'s rent is typical, though plenty of summer sublets ask for less or none — especially room sublets in a place the original tenant is still on the lease for. Under Michigan law, a residential security deposit generally can\'t exceed one and a half months\' rent.',
        ],
      },
      {
        heading: 'Your rights under Michigan law',
        paragraphs: [
          'Michigan\'s security deposit rules are specific. A landlord must return the deposit, or send an itemized list of damages, within 30 days of the lease ending. In a sublet, the person holding your deposit takes on that obligation, so it matters who you\'re paying. Get the deposit terms in writing up front: amount, what it covers, and when it comes back.',
        ],
      },
      {
        heading: 'How to actually get it back',
        paragraphs: [
          'The single best thing you can do is document the place the day you move in. Photos and a quick video, timestamped, of every room and any existing damage. Do the same when you leave. That evidence turns a he-said-she-said deposit dispute into a non-event.',
        ],
        bullets: [
          'Timestamped move-in photos + video of every room',
          'Note any existing damage in writing, shared with the other party',
          'Keep the place clean and undamaged',
          'Repeat the photos at move-out',
          'Get the deposit terms in writing before you pay',
        ],
      },
      {
        heading: 'Deposits on Wroomly',
        paragraphs: [
          'When a listing on Wroomly includes a deposit, it\'s collected through Stripe at booking alongside first month\'s rent, so there\'s a clear record of exactly what was paid and when. That paper trail is half the battle when it\'s time to get your deposit back.',
        ],
      },
    ],
  },
]

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find(g => g.slug === slug)
}
