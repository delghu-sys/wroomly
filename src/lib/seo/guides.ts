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
  // Per-guide Q&As, rendered at the end of the article and marked up as
  // FAQPage JSON-LD — the format AI answer engines extract most readily.
  // Answers are plain text, ideally 40–60 words, self-contained.
  faqs: { question: string; answer: string }[]
}

export const GUIDES: Guide[] = [
  {
    slug: 'how-to-sublet-your-apartment-at-university-of-michigan',
    title: 'How to sublet your apartment at the University of Michigan',
    description:
      'A step-by-step guide for UMich students subletting their Ann Arbor apartment — checking your lease, setting a price, finding a verified subletter, and getting paid safely.',
    excerpt:
      "Leaving for the summer, a co-op, or study abroad? Here's how to sublet your Ann Arbor place without losing money or breaking your lease.",
    updated: '2026-07-03',
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
          "The riskiest part of subletting is handing your place to (and collecting money from) someone you've never met. This is exactly why Wroomly verifies every user with an @umich.edu email: the person messaging you is a real U of M student with a name attached, not an anonymous account. Meet them, or at least do a video call, before anything is signed.",
          "When money moves, keep it traceable. Collect rent and any deposit by a method with a paper trail, and never take payment by gift card, crypto, or a wire from an account you can't verify — those are the classic scam patterns. A real subletter will happily pay in a way that protects them too.",
        ],
      },
      {
        heading: 'Put it in writing',
        paragraphs: [
          'Even a simple written sublease agreement — dates, rent, deposit terms, who pays utilities, condition of the place — saves enormous headaches. It protects both of you if something goes sideways, and most landlords want a copy anyway. Take timestamped move-in photos so the deposit return is a non-issue at the end.',
        ],
      },
    ],
    faqs: [
      {
        question: "Do I need my landlord's permission to sublet in Ann Arbor?",
        answer:
          'Usually, yes. Most Ann Arbor leases allow subletting but require written landlord approval, and some charge a small re-let fee. A few prohibit it outright. Read your lease, email your leasing office for the sublet policy, and keep the written approval before you list your place.',
      },
      {
        question: 'How much should I charge for a summer sublet at UMich?',
        answer:
          'Price at or slightly below what you pay in rent. Summer sublets in Ann Arbor go for less than the academic-year rate because supply outstrips demand from May through August. Furnished rooms close to Central Campus hold their value best; holding out for full rent usually means an empty room.',
      },
      {
        question: 'How do I find a subletter I can trust?',
        answer:
          'Use a platform that verifies identity — every Wroomly account is confirmed with an @umich.edu email, so inquiries come from real U of M students. Meet or video-call before signing, put the agreement in writing, and only accept payment by a traceable method, never wire, gift card, or crypto.',
      },
      {
        question: 'Do I need a written sublease agreement?',
        answer:
          'Yes. Even a simple one-page agreement covering dates, rent, deposit terms, utilities, and the condition of the place protects both sides, and most landlords want a copy. Pair it with timestamped move-in photos so the deposit return is straightforward at the end.',
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
    updated: '2026-07-03',
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
          'Summer is peak scam season for student housing — fake listings, "landlords" who need a deposit wired before you can see the place, prices too good to be true. Stick to platforms that verify identity. On Wroomly every user is @umich.edu-verified, so the person you\'re talking to is a real U of M student — and never pay anyone by wire, gift card, or crypto, no matter where you found the listing.',
        ],
      },
    ],
    faqs: [
      {
        question: 'When should I start looking for a summer sublet in Ann Arbor?',
        answer:
          'Start searching between February and April for a May move-in. Listings appear steadily through spring, with the biggest wave at the end of winter semester. Waiting until May still works, but the best-located and best-priced places are usually taken by then.',
      },
      {
        question: 'How much does a summer sublet cost in Ann Arbor?',
        answer:
          'Noticeably less than the academic-year rate for the same unit — the person subletting mostly wants to stop paying for an empty room. Furnished places near Central Campus and South University hold value best; unfurnished rooms or places farther from campus go for meaningfully less.',
      },
      {
        question: 'Which Ann Arbor neighborhoods are best for a summer sublet?',
        answer:
          'Central Campus and South University put you closest to everything but cost the most and fill fastest. Kerrytown and the Old West Side trade a few minutes of walking for quieter, cheaper stays. North Campus is ideal for summer research in engineering, music, or art.',
      },
      {
        question: 'Are Ann Arbor summer sublets safe?',
        answer:
          'They can be, if you verify who you\'re dealing with. Use a platform that confirms identity — Wroomly verifies every account with an @umich.edu email — see the place in person or over live video, get the agreement in writing, and never pay by wire, gift card, or crypto.',
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
    updated: '2026-07-03',
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
          'See the place — in person or at least over a live video call where they walk you through it. Verify the person is actually a student. Never pay with anything irreversible; a credit card gives you recourse, a wire does not. And get the agreement in writing before any money moves.',
          'This is the whole reason Wroomly exists in the shape it does: every user is verified with an @umich.edu email before they can list a place or send an inquiry. A scammer with a fake listing can\'t hide behind an anonymous profile — the person on the other end is a real, named U of M student.',
        ],
      },
      {
        heading: 'If you think you\'ve been scammed',
        paragraphs: [
          'Stop sending money immediately. If you paid by credit card, call your bank about a chargeback. Report the listing to wherever you found it and to the FTC. And tell other students — scammers reuse the same listings across Facebook groups and GroupMe every season.',
        ],
      },
    ],
    faqs: [
      {
        question: 'What are the red flags of a sublet scam?',
        answer:
          'The classic tells: a deposit demanded before you can see the place, payment by wire, gift card, crypto, or Zelle to a stranger, a price far below comparable listings, a "landlord" who is out of town and can\'t show it, pressure to decide immediately, and photos that fail a reverse image search.',
      },
      {
        question: 'How can I verify a sublet listing in Ann Arbor is real?',
        answer:
          'See the place in person or on a live video call where the person walks you through it. Reverse-image-search the photos. Verify the lister is a real student — on Wroomly, every account is confirmed with an @umich.edu email. Never move money before the agreement is in writing.',
      },
      {
        question: 'What should I do if I got scammed on a sublet?',
        answer:
          'Stop sending money immediately. If you paid by credit card, call your bank and ask about a chargeback. Report the listing to the platform where you found it and to the FTC at reportfraud.ftc.gov. Warn other students — scammers reuse the same fake listings every season.',
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
    updated: '2026-07-03',
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
          'Listings on Wroomly state the deposit up front, and because every account is @umich.edu-verified, you know exactly who is holding your money. Pay the deposit by a traceable method and keep the written terms — that paper trail is half the battle when it\'s time to get your deposit back.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How much is a security deposit for an Ann Arbor sublet?',
        answer:
          'Around one month\'s rent is typical, and plenty of summer sublets ask for less or none — especially room sublets where the original tenant stays on the lease. Under Michigan law, a residential security deposit generally can\'t exceed one and a half months\' rent.',
      },
      {
        question: 'When does a landlord have to return a security deposit in Michigan?',
        answer:
          'Within 30 days of the lease ending, a Michigan landlord must return the deposit or send an itemized list of damages. In a sublet, whoever holds your deposit takes on that obligation — so get the amount, what it covers, and the return terms in writing before you pay.',
      },
      {
        question: 'How do I make sure I get my deposit back?',
        answer:
          'Document everything. Take timestamped photos and a quick video of every room the day you move in, note existing damage in writing, and repeat the photos at move-out. Combined with written deposit terms, that evidence turns a deposit dispute into a non-event.',
      },
    ],
  },
]

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find(g => g.slug === slug)
}
