// SEO: evergreen guide articles targeting informational long-tail queries
// ("how to sublet at university of michigan", "are ann arbor sublets safe",
// etc.). Real, useful, student-voiced prose — these earn links and rank
// for queries the listing pages can't. Rendered at /guides/[slug].

export interface GuideSection {
  heading: string
  paragraphs: string[]
  bullets?: string[]
  /** Optional comparison table. Strong for "X vs Y" queries and featured
   *  snippets; rendered as a real <table> in a horizontal-scroll container. */
  table?: { caption?: string; columns: string[]; rows: string[][] }
}

export interface Guide {
  slug: string
  title: string // page <h1> (human headline, can run long)
  /** SERP <title> — keyword-first, <=60 chars incl. the ' | Wroomly' suffix.
   *  Falls back to `title`. Keeps the on-page H1 readable while the tab/SERP
   *  title stays inside Google's truncation width. */
  seoTitle?: string
  description: string // meta description
  excerpt: string // shown on the /guides index
  published: string // ISO date of first publication (Article datePublished)
  updated: string // ISO date of last substantive revision (dateModified + display)
  readingMinutes: number
  sections: GuideSection[]
  // Per-guide Q&As, rendered at the end of the article and marked up as
  // FAQPage JSON-LD — the format AI answer engines extract most readily.
  // Answers are plain text, ideally 40–60 words, self-contained.
  faqs: { question: string; answer: string }[]
  // Optional internal links rendered after the article body — this is how
  // hub guides (neighborhoods, buildings) pass link equity to the landing
  // pages they describe.
  links?: { label: string; href: string }[]
}

export const GUIDES: Guide[] = [
  {
    slug: 'how-to-sublet-your-apartment-at-university-of-michigan',
    title: 'How to sublet your apartment at the University of Michigan',
    seoTitle: 'How to Sublet an Apartment in Ann Arbor (UMich)',
    description:
      'How to sublet your apartment in Ann Arbor: check your lease first, price the room, find a verified UMich subletter, and get paid safely.',
    excerpt:
      "Leaving for the summer, a co-op, or study abroad? Here's how to sublet your Ann Arbor place without losing money or breaking your lease.",
    published: '2026-07-03',
    updated: '2026-08-30',
    readingMinutes: 6,
    sections: [
      {
        heading: 'First: check whether your lease even allows it',
        paragraphs: [
          "Before anything else, read your lease. Most Ann Arbor leases allow subletting but require written landlord approval, and some charge a small re-let fee. A few prohibit it outright. If you sublet against your lease and your landlord finds out, you can be on the hook. Get approval in writing first.",
          "If your building is managed by one of the big campus property companies, there's usually a form. Email your leasing office, ask for the sublet policy, and keep the reply. That paper trail protects you later.",
        ],
      },
      {
        heading: 'Set a price that actually fills the room',
        paragraphs: [
          "Summer sublets in Ann Arbor almost always go for less than the academic-year rate. Students are competing for a smaller pool of renters, and most people only need May through August. Pricing at or slightly below what you pay is normal. Holding out for full rent usually means an empty room and you paying for it anyway.",
          'Look at comparable live listings near you to anchor your number. A furnished room a short walk from the Diag commands more than an unfurnished room out in Pittsfield. Location and furniture are the two biggest levers.',
        ],
      },
      {
        heading: 'Write a listing people trust',
        paragraphs: [
          'Good photos do most of the work. Shoot in daylight, tidy up first, and include the actual room being sublet plus the kitchen, bathroom, and any shared space. Be honest about the number of roommates and the vibe. Surprises are what cause sublets to fall apart halfway through.',
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
        heading: 'Vet your subletter, then get paid safely',
        paragraphs: [
          "The riskiest part of subletting is handing your place to (and collecting money from) someone you've never met. This is exactly why Wroomly verifies students through their UMich Google login: where you see a blue check, the person messaging you is a real U of M student with a name attached, not an anonymous account. Meet them, or at least do a video call, before anything is signed.",
          "When money moves, keep it traceable. Collect rent and any deposit by a method with a paper trail, and never take payment by gift card, crypto, or a wire from an account you can't verify. Those are the classic scam patterns. A real subletter will happily pay in a way that protects them too.",
        ],
      },
      {
        heading: 'Put it in writing',
        paragraphs: [
          'Even a simple written sublease agreement (dates, rent, deposit terms, who pays utilities, condition of the place) saves enormous headaches. It protects both of you if something goes sideways, and most landlords want a copy anyway. Take timestamped move-in photos so the deposit return is a non-issue at the end.',
        ],
      },
    ],
    links: [
      { label: 'Browse UMich sublets', href: '/umich-sublets' },
      { label: 'How to pay for a sublet safely', href: '/guides/how-to-pay-for-a-sublet-safely' },
      { label: 'Sublet while you study abroad', href: '/guides/sublet-apartment-while-studying-abroad' },
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
          'Use a platform that verifies identity. On Wroomly, students who sign in with their UMich Google account carry a blue check, so you can tell a real U of M student from an anonymous one. Meet or video-call before signing, put the agreement in writing, and only accept payment by a traceable method, never wire, gift card, or crypto.',
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
    seoTitle: 'Summer Sublets in Ann Arbor: Student Guide',
    description:
      'Everything UMich students need to know about finding or filling a summer sublet in Ann Arbor: timing, pricing, neighborhoods, and how to avoid getting scammed.',
    excerpt:
      'When to start looking, what summer rent really costs, and the neighborhoods worth targeting for a May–August sublet.',
    published: '2026-07-03',
    updated: '2026-08-30',
    readingMinutes: 5,
    sections: [
      {
        heading: 'The summer sublet market, explained',
        paragraphs: [
          'Most Ann Arbor student leases run 12 months, but a huge chunk of students leave town from roughly May through August. Internships, co-ops, study abroad, or just going home. That mismatch is the entire summer sublet market: thousands of people paying for rooms they aren\'t using, looking for someone to cover them.',
          'For a subletter, that\'s leverage. Summer rates run well below the academic year, and supply peaks in spring. For someone subletting their place out, it means pricing realistically and listing early.',
        ],
      },
      {
        heading: 'When to start looking',
        paragraphs: [
          'The sweet spot to start searching is February through April for a summer move-in. Listings appear steadily through spring, with the biggest wave right around the end of winter semester as people lock in plans. If you wait until May, you\'ll find places. The best-located, best-priced ones are usually gone.',
          'Setting a saved search early is the cheat code: you get emailed when a matching place posts instead of refreshing listings every day.',
        ],
      },
      {
        heading: 'What summer rent actually costs',
        paragraphs: [
          'Expect summer sublets to come in noticeably under the academic-year rate for the same unit, often a meaningful discount, because the person subletting just wants to stop paying for an empty room. Furnished places near Central Campus and South University hold value best; rooms further out or unfurnished go for less.',
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
          'Summer is peak scam season for student housing. Fake listings, "landlords" who need a deposit wired before you can see the place, prices too good to be true. Stick to platforms that verify identity. On Wroomly, students who verify with their UMich Google login carry a blue check, so you can see who is a real U of M student. And never pay anyone by wire, gift card, or crypto, no matter where you found the listing.',
        ],
      },
    ],
    links: [
      { label: 'How to pay for a sublet safely', href: '/guides/how-to-pay-for-a-sublet-safely' },
      { label: 'Sublet while you study abroad', href: '/guides/sublet-apartment-while-studying-abroad' },
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
          'Noticeably less than the academic-year rate for the same unit. The person subletting mostly wants to stop paying for an empty room. Furnished places near Central Campus and South University hold value best; unfurnished rooms or places farther from campus go for meaningfully less.',
      },
      {
        question: 'Which Ann Arbor neighborhoods are best for a summer sublet?',
        answer:
          'Central Campus and South University put you closest to everything but cost the most and fill fastest. Kerrytown and the Old West Side trade a few minutes of walking for quieter, cheaper stays. North Campus is ideal for summer research in engineering, music, or art.',
      },
      {
        question: 'Are Ann Arbor summer sublets safe?',
        answer:
          'They can be, if you verify who you\'re dealing with. Use a platform that confirms identity: on Wroomly, verified UMich students carry a blue check so you can see who is a real student. See the place in person or over live video, get the agreement in writing, and never pay by wire, gift card, or crypto.',
      },
    ],
  },
  {
    slug: 'how-to-avoid-sublet-scams-ann-arbor',
    title: 'How to avoid sublet scams in Ann Arbor',
    seoTitle: 'How to Avoid Sublet Scams in Ann Arbor',
    description:
      'The common student housing scams in Ann Arbor and the exact red flags to watch for, so your UMich sublet search doesn\'t cost you a deposit.',
    excerpt:
      'Wired a deposit and never heard back? Here are the scam patterns that hit Ann Arbor students every year, and how to dodge them.',
    published: '2026-07-03',
    updated: '2026-08-30',
    readingMinutes: 5,
    sections: [
      {
        heading: 'Why students get targeted',
        paragraphs: [
          'Student housing is a scammer\'s dream: urgent timelines, people new to renting, big deposits, and a lot of deals done sight-unseen over the summer. Ann Arbor is no exception. Every year UMich students lose deposits to listings that were never real.',
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
          'See the place, in person or at least over a live video call where they walk you through it. Verify the person is actually a student. Never pay with anything irreversible; a credit card gives you recourse, a wire does not. And get the agreement in writing before any money moves.',
          'This is the whole reason Wroomly exists in the shape it does: students verify with their UMich Google login and carry a blue check on their profile and their listings. A scammer with a fake listing has no way to earn that check. Where you see one, the person on the other end is a real, named U of M student.',
        ],
      },
      {
        heading: 'If you think you\'ve been scammed',
        paragraphs: [
          'Stop sending money immediately. If you paid by credit card, call your bank about a chargeback. Report the listing to wherever you found it and to the FTC. And tell other students. Scammers reuse the same listings across Facebook groups and GroupMe every season.',
        ],
      },
    ],
    links: [
      { label: 'How to pay for a sublet safely', href: '/guides/how-to-pay-for-a-sublet-safely' },
      { label: 'Find a roommate at UMich', href: '/guides/find-a-roommate-umich-off-campus' },
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
          'See the place in person or on a live video call where the person walks you through it. Reverse-image-search the photos. Check that the lister is a real student. On Wroomly, verified UMich students carry a blue check next to their name. Never move money before the agreement is in writing.',
      },
      {
        question: 'What should I do if I got scammed on a sublet?',
        answer:
          'Stop sending money immediately. If you paid by credit card, call your bank and ask about a chargeback. Report the listing to the platform where you found it and to the FTC at reportfraud.ftc.gov. Warn other students. Scammers reuse the same fake listings every season.',
      },
    ],
  },
  {
    slug: 'security-deposits-ann-arbor-sublets',
    title: 'Security deposits for Ann Arbor sublets: what to know',
    seoTitle: 'Security Deposits for Ann Arbor Sublets',
    description:
      'How security deposits work for sublets in Ann Arbor, Michigan: what\'s normal, your rights under Michigan law, and how to actually get yours back.',
    excerpt:
      'How much is normal, what Michigan law says, and the move-in photos that get your deposit back without a fight.',
    published: '2026-07-03',
    updated: '2026-08-30',
    readingMinutes: 5,
    sections: [
      {
        heading: 'What\'s a normal deposit',
        paragraphs: [
          'For a sublet, a deposit of around one month\'s rent is typical, though plenty of summer sublets ask for less or none, especially room sublets in a place the original tenant is still on the lease for. Under Michigan law, a residential security deposit generally can\'t exceed one and a half months\' rent.',
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
          'Listings on Wroomly state the deposit up front, and a blue check marks listers who\'ve verified as UMich students, so you can see who is holding your money. Pay the deposit by a traceable method and keep the written terms. That paper trail is half the battle when it\'s time to get your deposit back.',
        ],
      },
    ],
    links: [
      { label: 'How to pay for a sublet safely', href: '/guides/how-to-pay-for-a-sublet-safely' },
      { label: 'Individual vs joint lease', href: '/guides/individual-lease-vs-joint-lease-ann-arbor' },
    ],
    faqs: [
      {
        question: 'How much is a security deposit for an Ann Arbor sublet?',
        answer:
          'Around one month\'s rent is typical, and plenty of summer sublets ask for less or none, especially room sublets where the original tenant stays on the lease. Under Michigan law, a residential security deposit generally can\'t exceed one and a half months\' rent.',
      },
      {
        question: 'When does a landlord have to return a security deposit in Michigan?',
        answer:
          'Within 30 days of the lease ending, a Michigan landlord must return the deposit or send an itemized list of damages. In a sublet, whoever holds your deposit takes on that obligation. So get the amount, what it covers, and the return terms in writing before you pay.',
      },
      {
        question: 'How do I make sure I get my deposit back?',
        answer:
          'Document everything. Take timestamped photos and a quick video of every room the day you move in, note existing damage in writing, and repeat the photos at move-out. Combined with written deposit terms, that evidence turns a deposit dispute into a non-event.',
      },
    ],
  },
  {
    slug: 'best-neighborhoods-for-umich-students',
    title: 'The best Ann Arbor neighborhoods for UMich students, compared',
    seoTitle: 'Best Ann Arbor Neighborhoods for UMich Students',
    description:
      'Central Campus vs. South U vs. Kerrytown and beyond: an honest comparison of every Ann Arbor neighborhood for University of Michigan students, by walk time, vibe, and value.',
    excerpt:
      'Eleven neighborhoods, one honest comparison: where to live based on your program, budget, and how much quiet you actually want.',
    published: '2026-07-07',
    updated: '2026-08-30',
    readingMinutes: 7,
    sections: [
      {
        heading: 'Start with your campus, not the neighborhood',
        paragraphs: [
          "The single biggest housing mistake at Michigan is optimizing for the wrong campus. If you're in Engineering, Music, or Art & Design, your classes are on North Campus. Living on the South U strip means a bus commute every day, in both directions, in a Michigan winter. If you're in LSA or Ross, it's the reverse.",
          'So before comparing neighborhoods, answer one question: where are your 9ams? Then pick from the neighborhoods that serve that answer.',
        ],
      },
      {
        heading: 'The walk-to-class core: Central Campus and South University',
        paragraphs: [
          "Central Campus and South University are the classic student zones: the shortest walks, the highest rents, and the fastest-moving sublets. South U adds the restaurant-and-nightlife strip and most of the luxury high-rises (Landmark, Six11, Arbor Blu, Vic Village); Central Campus proper is more older houses and mid-rises mixed with a few towers.",
          "Pick these if being fifteen minutes from bed to lecture is worth paying for. Skip them if you're sensitive to noise or price.",
        ],
      },
      {
        heading: 'The character belt: Kerrytown, Downtown, Old West Side',
        paragraphs: [
          'Kerrytown gives you the Farmers Market, brick sidewalks, and a calmer walk to class. Downtown puts you on Main Street with the best food in the city and a short walk east to campus. The Old West Side is the historic district. Leafy, quiet, and popular with grad students who want Ann Arbor to feel like a town instead of a campus.',
          'These three trade a few minutes of commute for a much better place to actually live. Rents vary: downtown high-rises cost real money, while a room in a Kerrytown or Old West Side house can beat the campus core.',
        ],
      },
      {
        heading: 'The value ring: Burns Park, Water Hill, Eberwhite, Lower Town, Pittsfield',
        paragraphs: [
          "Burns Park is calm and close, a favorite of professors, families, and upperclassmen. Water Hill is artsy and more affordable, a bike ride northwest. Eberwhite is quiet mid-century residential on the west side. Lower Town sits across the river by the medical campus, handy for health-sciences programs. And Pittsfield, south of the city, is where you get real square footage, parking, and lower rent — with a car or a bus ride as the price.",
        ],
        bullets: [
          'Shortest walk: Central Campus, South University',
          'Best food at your door: Downtown, South University',
          'Quiet + character: Kerrytown, Old West Side, Burns Park',
          'Best value: Water Hill, Eberwhite, Pittsfield',
          'North Campus programs: North Campus, Lower Town',
          'Michigan Medicine: Lower Town, Kerrytown',
        ],
      },
      {
        heading: 'How this plays out in sublets',
        paragraphs: [
          'Sublet supply follows the twelve-month-lease buildings, so Central Campus, South U, and Downtown produce the most listings, especially in summer. The character and value neighborhoods list fewer places, but they linger longer and price gentler. Whichever neighborhood you pick, listers who verify with their UMich account carry a blue check.',
        ],
      },
    ],
    links: [
      { label: 'Central Campus', href: '/ann-arbor/central-campus' },
      { label: 'South University', href: '/ann-arbor/south-university' },
      { label: 'North Campus', href: '/ann-arbor/north-campus' },
      { label: 'Kerrytown', href: '/ann-arbor/kerrytown' },
      { label: 'Downtown', href: '/ann-arbor/downtown' },
      { label: 'Old West Side', href: '/ann-arbor/old-west-side' },
      { label: 'Burns Park', href: '/ann-arbor/burns-park' },
      { label: 'Water Hill', href: '/ann-arbor/water-hill' },
      { label: 'Eberwhite', href: '/ann-arbor/eberwhite' },
      { label: 'Lower Town', href: '/ann-arbor/lower-town' },
      { label: 'Pittsfield', href: '/ann-arbor/pittsfield' },
      { label: 'Browse buildings', href: '/buildings' },
    ],
    faqs: [
      {
        question: 'What is the best neighborhood for UMich students?',
        answer:
          'It depends on your campus. LSA, Ross, and most undergrads want Central Campus or South University for the shortest walk. Engineering, Music, and Art & Design students should look at North Campus. Students who value quiet and character over walk time prefer Kerrytown, the Old West Side, or Burns Park.',
      },
      {
        question: 'What is the cheapest area to live near the University of Michigan?',
        answer:
          'Generally, prices fall as you move away from Central Campus. Water Hill, Eberwhite, and Pittsfield Township typically offer the lowest rents. Pittsfield trades walkability for space and parking, while Water Hill keeps you within biking distance. Rooms in shared houses beat high-rise studios everywhere.',
      },
      {
        question: 'Where should engineering students live at UMich?',
        answer:
          'Near North Campus, where Engineering classes actually meet. The Courtyards area and Northwood corridor are the classic picks, and Lower Town works too. Living on the South U strip means commuting by bus across town every day, which gets old fast in winter.',
      },
    ],
  },
  {
    slug: 'umich-off-campus-housing-timeline',
    title: 'The UMich off-campus housing timeline: when to look, sign, and sublet',
    seoTitle: 'UMich Off-Campus Housing Timeline, Month by Month',
    description:
      'When to look and sign for UMich off-campus housing in Ann Arbor, month by month, and what to do if you already missed the early wave.',
    excerpt:
      "Ann Arbor leases sign absurdly early. The month-by-month calendar, and what to do if you've already missed the wave.",
    published: '2026-07-07',
    updated: '2026-08-30',
    readingMinutes: 5,
    sections: [
      {
        heading: 'Why Ann Arbor leases so early',
        paragraphs: [
          "Ann Arbor's off-campus market is famous for how early it moves: prime houses and high-rise units for next fall start leasing in the fall of the year before. Students sign twelve-month leases nearly a year out, often before they know their internship, co-op, or study-abroad plans. That early cycle is stressful. It's also exactly why the sublet market exists at the scale it does.",
        ],
      },
      {
        heading: 'The month-by-month calendar',
        paragraphs: [
          'Every year varies, but the rhythm of the market looks like this:',
        ],
        bullets: [
          'September–November: leasing season for NEXT fall kicks off; the most-wanted houses and buildings go first',
          'December–February: the main wave continues; popular buildings fill for the following year',
          'February–April: summer sublet listings surge as internship and study-abroad plans firm up',
          'April–May: peak summer-sublet turnover as winter semester ends',
          'June–August: last-minute deals; fall-semester sublets appear from co-op and abroad students',
          'November–December: winter-semester sublets post as December grads and spring-abroad students leave',
        ],
      },
      {
        heading: "Missed the leasing wave? You're the sublet market now",
        paragraphs: [
          "If it's spring and everything decent is 'leased for next year,' you haven't failed. You've just moved from the lease market to the sublet-and-relet market, and it's bigger than it looks. Every early signer whose plans changed is now looking for someone exactly like you. Transfer students, grad students arriving mid-year, and anyone with a plot twist lives on this market.",
          'The mechanics differ slightly: a sublet keeps the original tenant on the lease, while a relet (or lease takeover) replaces them entirely with the landlord\'s approval. Either way, the inventory is real apartments in the same buildings that "sold out" months earlier.',
        ],
      },
      {
        heading: 'Play the calendar, not against it',
        paragraphs: [
          "Subletting your place out? List in February or March, before the market floods in April. Looking for a place? Set a saved search early and let the email do the refreshing. And if you're signing a twelve-month lease knowing you'll be gone all summer, budget for the reality that summer sublets recover only part of your rent. That's the market-wide norm, not a failure of your listing.",
        ],
      },
    ],
    links: [
      { label: 'Summer sublet guide', href: '/guides/summer-sublets-in-ann-arbor-student-guide' },
      { label: 'Live rent data', href: '/guides/ann-arbor-rent-prices' },
      { label: 'Browse buildings', href: '/buildings' },
      { label: 'Individual vs joint lease', href: '/guides/individual-lease-vs-joint-lease-ann-arbor' },
    ],
    faqs: [
      {
        question: 'When should I sign a lease for next year at UMich?',
        answer:
          "Ann Arbor's leasing season for the following fall starts in the fall. The most-wanted houses and buildings begin signing in September through November, nearly a year ahead. If you want a specific building or house, engage early; if you miss the wave, the sublet and relet market picks up the slack.",
      },
      {
        question: 'Is it too late to find UMich housing in the spring or summer?',
        answer:
          'No. You\'ve just shifted from the lease market to the sublet market. Students whose internship, co-op, or study-abroad plans changed are actively looking for people to take their rooms, often at below the original rent. Relets and lease takeovers also open up in "sold out" buildings.',
      },
      {
        question: 'What is the difference between a sublet and a relet?',
        answer:
          'In a sublet, the original tenant stays on the lease and rents the unit to you for a period. In a relet (lease takeover or assignment), you replace them on the lease entirely, with landlord approval. Relets give you a direct relationship with the landlord; sublets are more flexible for short stays.',
      },
    ],
  },
  {
    slug: 'sublet-vs-relet-lease-takeover',
    title: 'Sublet vs. relet vs. lease takeover: which one do you actually want?',
    seoTitle: 'Sublet vs. Relet vs. Lease Takeover: Which to Pick',
    description:
      'Sublet, relet or lease takeover in Ann Arbor? See who stays on the lease, who holds the risk, and which one fits a summer stay.',
    excerpt:
      "Sublet, sublease, relet, lease takeover, assignment. People use them interchangeably; they mean legally different things. Here is who's on the lease, who holds the risk, and which to pick.",
    published: '2026-07-07',
    updated: '2026-09-03',
    readingMinutes: 6,
    sections: [
      {
        heading: 'The terms, and which ones mean the same thing',
        paragraphs: [
          "Half the confusion is vocabulary: several of these words are synonyms, and a few are genuinely different arrangements. Sort the synonyms first and the rest is easy.",
          "Sublet, sublease, subletting, and subleasing all describe the same thing: the original tenant stays on the lease and rents the place to you for a period. “Underlet” is an older legal word for the same arrangement. Relet and re-let (and reletting) are the words Ann Arbor landlords and students use for a lease takeover: you replace the original tenant on the lease. Lease takeover, lease assignment, and lease transfer are all names for that same takeover. So there are really only two arrangements underneath a dozen words.",
        ],
      },
      {
        heading: 'The two arrangements, side by side',
        paragraphs: [
          "A sublet (sublease) keeps the original tenant on the hook; a relet (lease takeover, assignment, transfer) moves you onto the lease in their place. Everything else follows from that one difference:",
        ],
        table: {
          caption:
            'Comparison of a sublet/sublease versus a relet, lease takeover, or assignment',
          columns: [
            '',
            'Sublet / sublease',
            'Relet / lease takeover / assignment',
          ],
          rows: [
            ['Who is on the lease', 'Original tenant stays on it', 'You replace them on it'],
            ['Who holds the risk', 'The original tenant', 'You'],
            ['Landlord approval', 'Usually required, in writing', 'Always required'],
            ['Your deposit', 'Held by the original tenant', 'Held by the landlord'],
            ['Relationship with landlord', 'Indirect, through the tenant', 'Direct, you are the tenant'],
            ['Best for', 'A summer or one semester', 'Staying to lease-end or longer'],
          ],
        },
      },
      {
        heading: 'Who holds the risk',
        paragraphs: [
          "In a sublet, the original tenant carries the risk in both directions: if you damage the place, the landlord comes after them; if they stop forwarding your rent to the landlord, the problem lands on the unit anyway. That is why a written sublease agreement and traceable payments matter so much.",
          "In a relet, risk transfers cleanly to you: your name, your deposit, your relationship with the landlord. That is better for long stays, and it is why landlords usually charge a fee and vet you like any new applicant.",
        ],
      },
      {
        heading: 'Which one fits your situation',
        paragraphs: ['A quick decision rule:'],
        bullets: [
          'Staying a summer or one semester → sublet (flexible, fast, no lease transfer)',
          'Staying through the end of the lease or longer → relet / takeover (clean, direct)',
          "Landlord won't approve assignments → sublet with written landlord consent",
          'You want the unit again next year → relet, then renew directly',
        ],
      },
      {
        heading: 'Paperwork either way',
        paragraphs: [
          "Whichever route: get it in writing. A sublet needs a sublease agreement (dates, rent, deposit, utilities, condition) plus the landlord's written consent. A relet needs the landlord's assignment paperwork. On Wroomly, a blue check shows which side has verified as a UMich student, which takes most of the guesswork out of who you are dealing with. The paperwork removes the rest.",
        ],
      },
    ],
    links: [
      { label: 'How to sublet your apartment', href: '/guides/how-to-sublet-your-apartment-at-university-of-michigan' },
      { label: 'Security deposits', href: '/guides/security-deposits-ann-arbor-sublets' },
      { label: 'Housing timeline', href: '/guides/umich-off-campus-housing-timeline' },
      { label: 'Individual vs joint lease', href: '/guides/individual-lease-vs-joint-lease-ann-arbor' },
    ],
    faqs: [
      {
        question: 'What is the difference between a sublet and a relet?',
        answer:
          'In a sublet, the original tenant stays on the lease and rents the unit to you; they remain responsible to the landlord. In a relet (also called a lease takeover or assignment), you replace them on the lease entirely with landlord approval, becoming the landlord’s direct tenant with your own deposit and obligations.',
      },
      {
        question: 'Is subletting the same as subleasing?',
        answer:
          'Yes. Sublet, sublease, subletting, and subleasing are the same arrangement: the original tenant stays on the lease and rents the place to you for a set period while remaining responsible to the landlord. The words are used interchangeably; there is no legal difference between them.',
      },
      {
        question: 'What does “relet” mean?',
        answer:
          'To relet (or re-let) an apartment means to hand your lease to someone who takes your place on it, with the landlord’s approval. In Ann Arbor, “relet” is the common word for a lease takeover or assignment: the new person becomes the landlord’s tenant, and you come off the lease entirely.',
      },
      {
        question: 'What is a lease takeover?',
        answer:
          'A lease takeover, also called a lease assignment or transfer, is when a new tenant fully replaces the original one on the lease. The landlord approves the new person, who then holds the lease, the deposit, and the obligations directly. It is the same thing Ann Arbor students mean by a relet.',
      },
      {
        question: 'Sublease vs lease takeover: which is better?',
        answer:
          'A sublease is better for a short stay like a summer, because it is faster and needs no lease transfer. A lease takeover is better if you are staying to the end of the term or want the unit in your own name, since it gives you a direct relationship with the landlord and your own deposit.',
      },
      {
        question: 'Is a lease transfer the same as a sublet?',
        answer:
          'No. A lease transfer (lease takeover or assignment) moves you onto the lease in place of the original tenant, so you become the landlord’s direct tenant. A sublet keeps the original tenant on the lease; you pay them and they stay responsible to the landlord. A transfer changes who holds the lease; a sublet does not.',
      },
      {
        question: 'Is a sublet or a relet better for a summer stay?',
        answer:
          'A sublet. For a May-to-August stay, a sublet is faster, more flexible, and does not require transferring the lease. Relets make sense when you are staying through the end of the lease term or want to renew the unit in your own name afterward.',
      },
      {
        question: 'Does the landlord need to approve a sublet in Ann Arbor?',
        answer:
          'Almost always. Most Ann Arbor leases allow subletting only with written landlord approval, and some charge a fee. A relet or assignment always requires the landlord, since the lease itself changes hands. Get the approval in writing before money moves in either arrangement.',
      },
    ],
  },
  {
    slug: 'international-student-housing-guide-umich',
    title: 'Housing at UMich as an international student: renting from abroad, safely',
    seoTitle: 'UMich Housing for International Students',
    description:
      'How international students at the University of Michigan find housing from abroad: timing, documents, avoiding sight-unseen scams, and why verified sublets beat Facebook groups.',
    excerpt:
      "Signing a lease from another continent, sight-unseen, in a market you've never set foot in. Here's how to do it without getting burned.",
    published: '2026-07-07',
    updated: '2026-08-30',
    readingMinutes: 6,
    sections: [
      {
        heading: 'The core problem: renting sight-unseen',
        paragraphs: [
          "Most international students arrange Ann Arbor housing before ever visiting Ann Arbor. That means every scam pattern in student housing (fake listings, stolen photos, deposits wired to people who don't exist) hits international students hardest, because 'come see the place first' isn't an option from Shanghai or Mumbai.",
          'The fix is not more caution in the abstract; it\'s process: verify the person, verify the place, and keep the money traceable.',
        ],
      },
      {
        heading: 'Verify the person before the place',
        paragraphs: [
          "A listing is only as real as the human behind it. Insist on a live video call, not a pre-recorded video, where the person walks the actual apartment and shows the street outside. On Wroomly, UMich students verify through their @umich.edu Google login and carry a blue check, so you can see when the person on the other end is a named, real University of Michigan student. Looking for that check removes most of the fraud you'd face in open Facebook groups.",
        ],
      },
      {
        heading: 'Timing and paperwork from abroad',
        paragraphs: [
          'The Ann Arbor lease market moves nearly a year early, but the sublet market moves on your schedule. Spring for fall arrivals, November for January arrivals. Sublets also solve the paperwork problem: full leases often want a US credit history, a guarantor, or several months of rent upfront; a sublet from a student typically just needs the agreement, the deposit, and first month.',
        ],
        bullets: [
          'Start looking 2–4 months before arrival; set a saved search',
          'Ask for a live video walkthrough, always',
          'Expect: written agreement, deposit (≤1.5 months under Michigan law), first month',
          'Never pay by wire, gift card, or crypto. Use a traceable method',
          'Get the sublease and landlord consent in writing before sending anything',
        ],
      },
      {
        heading: 'Furnished matters more than you think',
        paragraphs: [
          "Arriving with two suitcases means an unfurnished apartment is an immediate several-hundred-dollar furniture problem with no car to solve it. Furnished sublets, the norm in the big student buildings, let you land, unpack, and start classes. Filter for furnished and weigh a modest premium against the true cost of furnishing from zero.",
        ],
      },
    ],
    links: [
      { label: 'Avoiding sublet scams', href: '/guides/how-to-avoid-sublet-scams-ann-arbor' },
      { label: 'Live rent data', href: '/guides/ann-arbor-rent-prices' },
      { label: 'Neighborhood comparison', href: '/guides/best-neighborhoods-for-umich-students' },
      { label: 'Browse buildings', href: '/buildings' },
    ],
    faqs: [
      {
        question: 'How do international students find housing at the University of Michigan?',
        answer:
          'Most arrange it from abroad: university housing if they get it, otherwise sublets and leases found online. Sublets from verified students are the safest off-campus route sight-unseen. On Wroomly, listers who verify with a UMich account carry a blue check. Start two to four months before arrival and always do a live video walkthrough.',
      },
      {
        question: 'How can I avoid housing scams when renting from abroad?',
        answer:
          'Verify the person, not just the listing: insist on a live video call where they walk the apartment, use a platform that verifies identity, and never pay by wire, gift card, or crypto. Get the written agreement and the landlord\'s sublet consent before any money moves.',
      },
      {
        question: 'Do I need a US credit history to rent in Ann Arbor?',
        answer:
          'For a full lease, often yes. Landlords may ask for a US guarantor, credit history, or months of rent upfront. Sublets sidestep most of that: you typically need only the written sublease, the security deposit (capped at 1.5 months\' rent in Michigan), and first month\'s rent.',
      },
    ],
  },
  {
    slug: 'grad-student-housing-ann-arbor',
    title: 'Grad student housing in Ann Arbor: quieter, closer to your lab, saner',
    seoTitle: 'Grad Student Housing in Ann Arbor Near Campus',
    description:
      'Where University of Michigan grad students actually live: the quiet neighborhoods, medical-campus logistics, 12-month realities, and how sublets fit a defense-date life.',
    excerpt:
      'You want quiet, a reasonable commute to your lab, and neighbors who sleep at night. The grad-student map of Ann Arbor.',
    published: '2026-07-07',
    updated: '2026-08-30',
    readingMinutes: 5,
    sections: [
      {
        heading: 'The grad-student map is different',
        paragraphs: [
          "The undergrad housing map (South U high-rises, Central Campus houses) optimizes for walk-to-lecture and social density. Grad life optimizes differently: quiet, month-to-month sanity, and proximity to a lab, library, or hospital you'll visit seven days a week. That points at a different set of neighborhoods: Kerrytown, the Old West Side, Burns Park, Water Hill, and Lower Town.",
          'Kerrytown and Burns Park put you a walkable mile from Central Campus without the undergrad noise. The Old West Side and Water Hill add value and character. Lower Town is the sleeper pick for Michigan Medicine, across the river from the hospital, with river trails at your door.',
        ],
      },
      {
        heading: 'Rooms in houses beat studios on value',
        paragraphs: [
          'The grad-student sweet spot is usually a room in a shared house or a unit in a smaller building, not a high-rise studio. You get more space, quieter neighbors, and rent that leaves something of a stipend behind. Houses in the grad-favored neighborhoods sublet steadily as people leave for fieldwork, fellowships, and defenses.',
        ],
      },
      {
        heading: 'Sublets fit the academic-nomad calendar',
        paragraphs: [
          "Grad timelines are jagged: a semester of fieldwork, a summer internship at a company, a postdoc starting in March. Twelve-month leases handle that badly; sublets handle it perfectly, on both sides. Arriving mid-year for a program that starts in January? The winter sublet wave, December grads and spring study-abroad, is your market.",
        ],
        bullets: [
          'Michigan Medicine: Lower Town, Kerrytown',
          'Central Campus labs/libraries: Kerrytown, Burns Park, Old West Side',
          'North Campus (engineering PhDs): North Campus, Lower Town',
          'Maximum value: Water Hill, Eberwhite, Pittsfield',
        ],
      },
      {
        heading: 'One honest warning about "quiet"',
        paragraphs: [
          'A great-looking room in a house two blocks from South U is not quiet in September, no matter what the listing says. If silence matters, prioritize the neighborhood over the unit. The Old West Side at midnight and the South U strip at midnight are different planets. Check the address on a map before you commit, and ask directly how many undergrads share the house.',
        ],
      },
    ],
    links: [
      { label: 'Kerrytown', href: '/ann-arbor/kerrytown' },
      { label: 'Old West Side', href: '/ann-arbor/old-west-side' },
      { label: 'Burns Park', href: '/ann-arbor/burns-park' },
      { label: 'Lower Town', href: '/ann-arbor/lower-town' },
      { label: 'Water Hill', href: '/ann-arbor/water-hill' },
      { label: 'Neighborhood comparison', href: '/guides/best-neighborhoods-for-umich-students' },
    ],
    faqs: [
      {
        question: 'Where do grad students live in Ann Arbor?',
        answer:
          'The classic grad neighborhoods are Kerrytown, the Old West Side, Burns Park, and Water Hill: quiet, characterful, and a walk or short bike from Central Campus. Michigan Medicine students favor Lower Town, directly across the river from the hospital. Rooms in shared houses offer the best value.',
      },
      {
        question: 'Should a grad student sign a 12-month lease or sublet?',
        answer:
          'If your year includes fieldwork, a summer internship, or a mid-year start, sublets fit better. They flex around academic timelines that leases punish. If you\'re settled for multiple years, a lease in a quiet neighborhood wins on cost. Many grad students do one sublet year first, then sign where they actually want to live.',
      },
      {
        question: 'What is the best area near Michigan Medicine to live?',
        answer:
          'Lower Town, directly across the Huron River from the medical campus, gives the shortest hospital commute plus river trails. Kerrytown is the walkable alternative on the downtown side. Both are calmer than the undergrad zones while staying within a mile of the hospital.',
      },
    ],
  },
  {
    slug: 'winter-semester-sublets-ann-arbor',
    title: 'Winter semester sublets in Ann Arbor: the January move-in playbook',
    seoTitle: 'Winter Sublets in Ann Arbor: January Move-In',
    description:
      'How to find (or fill) a January–April sublet at the University of Michigan: who leaves mid-year, when winter listings post, and how to price a spring semester.',
    excerpt:
      'Everyone writes about summer. But December graduations and spring study-abroad create a real January market. Here\'s how it works.',
    published: '2026-07-07',
    updated: '2026-08-30',
    readingMinutes: 4,
    sections: [
      {
        heading: 'Yes, there is a January market',
        paragraphs: [
          'Summer gets all the attention, but Ann Arbor has a genuine mid-year sublet wave: December graduates leaving with five months left on their lease, students heading abroad for winter semester, co-op students starting January rotations elsewhere. Their rooms all need filling for roughly January through April or August.',
          'On the demand side: transfer students arriving in January, grad students with spring starts, students returning early from fall programs abroad, and co-op students rotating back into town.',
        ],
      },
      {
        heading: 'Timing: November is the window',
        paragraphs: [
          'Winter sublets post mostly in November and early December, as fall plans finalize and graduation dates lock in. If you need a January place, start looking at Thanksgiving; if you\'re filling a room, list before finals. Once campus empties in mid-December, attention (and your applicant pool) leaves with it.',
        ],
      },
      {
        heading: 'Pricing a winter sublet',
        paragraphs: [
          'Winter sublets hold value better than summer ones. The renter is there for classes, campus is full, and the discount pressure of an empty summer town is absent. At-rent or slightly below is normal for a furnished room near campus in January. The exception is a lease running through August: the summer tail drags the average, so many people split pricing — one rate through April, a lower one for the summer months.',
        ],
      },
      {
        heading: 'Winter-specific things to actually check',
        paragraphs: ['A few things that don\'t matter in a July walkthrough but matter a lot in January:'],
        bullets: [
          'Heat: included in rent or on you? Ask for a typical winter utility bill',
          'Walk or bus route to campus: a "12-minute walk" is different at -10°C',
          'Furnished, always. Nobody moves a couch in a snowstorm',
          'Snow removal: whose job is the sidewalk (city fines the address, not the absent tenant)',
          'Parking: overnight winter parking rules differ street to street',
        ],
      },
    ],
    links: [
      { label: 'Summer sublet guide', href: '/guides/summer-sublets-in-ann-arbor-student-guide' },
      { label: 'Housing timeline', href: '/guides/umich-off-campus-housing-timeline' },
      { label: 'Live rent data', href: '/guides/ann-arbor-rent-prices' },
      { label: 'Sublet while you study abroad', href: '/guides/sublet-apartment-while-studying-abroad' },
    ],
    faqs: [
      {
        question: 'Can I find a sublet in Ann Arbor for winter semester?',
        answer:
          'Yes. December graduations, spring study-abroad, and January co-op rotations create a real mid-year market. Winter sublets post mostly in November and early December for January move-in. Start looking around Thanksgiving; furnished rooms near campus go first.',
      },
      {
        question: 'How much does a winter sublet cost compared to summer?',
        answer:
          'More. Winter sublets hold close to full rent because campus is full and the renter is there for classes. At-rent or slightly below is typical for a furnished room near campus. Summer sublets discount much more steeply because supply floods an empty town.',
      },
      {
        question: 'When should I list my room for a January sublet?',
        answer:
          'Before finals. Winter demand peaks in November and early December as transfer students, returning study-abroad students, and January arrivals lock in housing. Once campus empties mid-December, your applicant pool leaves too. Listing in early November beats listing in late December.',
      },
    ],
  },
  {
    slug: 'how-to-price-your-sublet',
    title: 'How to price your Ann Arbor sublet (without leaving it empty)',
    seoTitle: 'How to Price Your Ann Arbor Sublet',
    description:
      'A practical pricing method for UMich sublets: anchor on live comparables, adjust for furniture and walk time, and understand why an empty room is the real loss.',
    excerpt:
      'The math nobody does: every month your room sits empty costs more than the discount that would have filled it.',
    published: '2026-07-07',
    updated: '2026-08-30',
    readingMinutes: 5,
    sections: [
      {
        heading: 'Start from the only number that matters',
        paragraphs: [
          "Your rent is not your price. The market doesn't know or care what you pay. It cares what comparable rooms ask right now. Start from live comparables: same bedroom count, same furnished status, similar walk to campus. Wroomly's live rent-price data shows the current median by size and neighborhood, computed from active listings. Anchor there, not on your lease.",
        ],
      },
      {
        heading: 'The empty-room math',
        paragraphs: [
          'Here\'s the calculation that should drive every pricing decision. Say you pay $1,200 and insist on $1,200 while the market clears at $1,000. If holding out costs you one extra empty month over a four-month summer, you collected $3,600 instead of $4,000. Your "full price" strategy lost $400. An empty room at any price is the most expensive option you have.',
          'Price to fill within two weeks. If you\'re getting messages but no commitments, you\'re close: sweeten with a utility inclusion. If you\'re getting silence, you\'re not close, so cut meaningfully, not $25 at a time.',
        ],
      },
      {
        heading: 'The adjustments that actually move price',
        paragraphs: ['From the comparable baseline, adjust for the things renters actually pay for:'],
        bullets: [
          'Furnished: the single biggest premium, since most sublet seekers arrive without furniture',
          'Walk time: under 10 minutes to Central Campus commands the top of the range',
          'Private bathroom: meaningful premium in shared apartments',
          'Utilities included: worth advertising as a number ("~$60/mo included"), not a vague perk',
          'Parking spot: real money in the campus core, near-worthless in Pittsfield',
          'Summer vs. winter: winter sublets hold near full rent; summer discounts steeply',
        ],
      },
      {
        heading: 'Present the price honestly',
        paragraphs: [
          'State the rent, the deposit, and what utilities are included, in the listing. Vague pricing ("DM for details") reads as a red flag in a market trained on scams. And if your lease runs past your sublet dates, decide up front whether the dates flex. "May–August, dates flexible" fills faster than a rigid window.',
        ],
      },
    ],
    links: [
      { label: 'Live rent data', href: '/guides/ann-arbor-rent-prices' },
      { label: 'How to sublet your apartment', href: '/guides/how-to-sublet-your-apartment-at-university-of-michigan' },
      { label: 'Summer sublet guide', href: '/guides/summer-sublets-in-ann-arbor-student-guide' },
      { label: 'Split rent across different bedrooms', href: '/guides/split-rent-with-roommates-different-bedrooms' },
    ],
    faqs: [
      {
        question: 'How much should I charge for my sublet in Ann Arbor?',
        answer:
          'Anchor on live comparables (same bedroom count, furnished status, and walk time), not on what you pay. Summer sublets typically ask at or below the original rent; winter sublets hold near full rent. Price to fill within two weeks: an empty month costs more than any realistic discount.',
      },
      {
        question: 'Why is my sublet not getting any responses?',
        answer:
          'Usually price or photos. If you get messages but no commitments, you\'re close: add included utilities or flex the dates. If you get silence, cut the price meaningfully rather than $25 at a time, and check that your photos are real daylight shots of the actual room.',
      },
      {
        question: 'Should I include utilities in my sublet price?',
        answer:
          'Including utilities and stating it as a number ("rent $950, ~$60/mo utilities included") makes a listing easier to compare and more trustworthy. For a summer sublet the simplicity usually wins you more than the utility cost, and it removes a whole category of move-out disputes.',
      },
    ],
  },
  {
    slug: 'first-apartment-checklist-ann-arbor',
    title: 'Your first Ann Arbor apartment: the move-in checklist',
    seoTitle: 'Your First Ann Arbor Apartment: Move-In Checklist',
    description:
      'Everything to check and set up when moving into your first UMich apartment or sublet: condition photos, utilities, renters insurance, and the Ann Arbor-specific details.',
    excerpt:
      'The unglamorous 90 minutes of move-in day that saves your deposit, your Wi-Fi, and your relationship with your roommates.',
    published: '2026-07-07',
    updated: '2026-08-30',
    readingMinutes: 5,
    sections: [
      {
        heading: 'Hour one: document everything',
        paragraphs: [
          "Before a single box opens, walk every room with your phone. Photos and a slow video of walls, floors, appliances, window seals, and any existing damage, timestamped by your camera automatically. Send the damage list to your landlord or the tenant you're subletting from the same day, in writing. This is the entire deposit game, played in twenty minutes.",
        ],
        bullets: [
          'Photo + video every room, closet, and appliance',
          'Test every burner, the oven, the disposal, all faucets (hot water pressure!)',
          'Flush toilets, run the shower, check under sinks for leaks',
          'Note existing damage in a written message to the other party, the same day',
          'Locate the breaker panel and water shutoff',
        ],
      },
      {
        heading: 'Utilities and internet',
        paragraphs: [
          "Ask what's already on and in whose name. In a sublet, utilities usually stay in the original tenant's name and you reimburse. Get the arrangement (and a typical monthly amount) in writing. In your own lease, set up electric/gas and internet a few days before move-in; installation slots around late August in Ann Arbor book out as every student in the city calls at once.",
        ],
      },
      {
        heading: 'Renters insurance: cheap, usually worth it',
        paragraphs: [
          "A renters policy typically costs on the order of $10–20 a month and covers your laptop, bike, and belongings against theft and damage, plus liability if your overflowing tub ruins the unit below. Some Ann Arbor leases outright require it. For the price of two coffees a month, it's one of the few pieces of adult paperwork that's actually a good deal.",
        ],
      },
      {
        heading: 'The Ann Arbor-specific details',
        paragraphs: ['A few local realities that surprise first-time renters:'],
        bullets: [
          'Bikes get stolen. Register yours with the university and use a U-lock',
          'Football Saturdays transform parking and noise near the stadium. Know your game-day parking rules',
          'Winter is real: confirm whose job snow shoveling is, and where overnight winter parking is allowed',
          'Move-in/move-out weekends jam every elevator and truck rental in town. Book early',
          'Compost and recycling pickup rules vary by building; fines go to the address',
        ],
      },
      {
        heading: 'Roommate ground rules, day one',
        paragraphs: [
          'The best roommate conversations happen before the first dish stays in the sink: how rent and utilities split and by what date, quiet hours during exams, guests, groceries, cleaning. Ten slightly awkward minutes on day one buys eight peaceful months. Put the money agreements in the group chat so they\'re written down somewhere.',
        ],
      },
    ],
    links: [
      { label: 'Security deposits', href: '/guides/security-deposits-ann-arbor-sublets' },
      { label: 'Sublet vs. relet', href: '/guides/sublet-vs-relet-lease-takeover' },
      { label: 'Neighborhood comparison', href: '/guides/best-neighborhoods-for-umich-students' },
      { label: 'Individual vs joint lease', href: '/guides/individual-lease-vs-joint-lease-ann-arbor' },
    ],
    faqs: [
      {
        question: 'What should I do on move-in day at a new apartment?',
        answer:
          'Document first: photos and video of every room, appliance, and any existing damage before unpacking, then send the damage list to your landlord or subletter in writing the same day. Test appliances and water, locate the breaker panel, and confirm utilities and internet are on and in whose name.',
      },
      {
        question: 'Do I need renters insurance for a UMich apartment?',
        answer:
          'Some Ann Arbor leases require it, and it\'s usually worth having anyway: for roughly $10–20 a month it covers your laptop, bike, and belongings against theft and damage, plus liability. In a sublet, ask whether the original tenant\'s policy covers the unit. It typically doesn\'t cover your stuff.',
      },
      {
        question: 'How should roommates split utilities in a sublet?',
        answer:
          'Keep utilities in the original account-holder\'s name and reimburse a stated monthly amount, agreed in writing before move-in. Ask for a typical winter bill. Heat in a Michigan January is the number that surprises people. Even splits by headcount are the norm unless rooms differ wildly.',
      },
    ],
  },
  {
    slug: 'how-to-verify-an-ann-arbor-landlord',
    title: 'How to verify an Ann Arbor landlord before you pay anyone',
    seoTitle: 'How to Verify an Ann Arbor Landlord',
    description:
      'Ann Arbor requires every legal rental to hold a city Certificate of Compliance. Here is how to look one up, what it proves about a listing, and what it does not. It is a scam check almost no student uses.',
    excerpt:
      'The city keeps a public record of every legal rental in Ann Arbor. Most students never check it. Here is how — and exactly what it does and doesn’t prove.',
    published: '2026-07-14',
    updated: '2026-08-30',
    readingMinutes: 6,
    sections: [
      {
        heading: 'The one check almost nobody does',
        paragraphs: [
          "Every renter in Ann Arbor knows the usual scam advice: don’t wire money, insist on a video tour, check whether the poster’s profile looks real. All good. But there’s one check that’s stronger than any of them and almost nobody uses it, because it’s hiding in city government instead of a housing group.",
          "Ann Arbor law requires every rental unit to hold a valid Certificate of Compliance from the city. The municipal code is blunt about it: “No person shall lease or otherwise make a dwelling or rooming unit available for occupancy if a Certificate of Compliance is not in effect for the unit” (Section 8:516). The certificate means the city has actually inspected the place and licensed it to be rented. It’s not optional, and the records are public.",
          "So a legitimate Ann Arbor rental has a paper trail with the city. A fake listing — an address the “landlord” doesn’t control, or a unit that isn’t a licensed rental at all — usually doesn’t. That gap is a scam detector the scammers don’t expect you to use.",
        ],
      },
      {
        heading: 'How to actually look it up',
        paragraphs: [
          "The city tracks rental registrations and Certificates of Compliance in an online permit system called STREAM, at stream.a2gov.org, for records from mid-2022 on. Older records live in the city’s A2Trak permit archive. Search by the property address and look for a rental registration and a Certificate of Compliance that hasn’t expired — certificates run about 2.5 years from the last inspection (3.5 if the property passed on the first try).",
        ],
        bullets: [
          'Search the exact street address in STREAM (stream.a2gov.org)',
          'Look for a rental registration + a current (unexpired) Certificate of Compliance',
          'For older buildings, check the A2Trak archive too',
          'No luck online? Call Ann Arbor Rental Housing Services at 734.794.6264 — they can confirm whether an address is a registered rental',
        ],
      },
      {
        heading: 'What it proves — and what it doesn’t',
        paragraphs: [
          "Be honest with yourself about what this check does. A valid certificate proves the place is real: the address is a licensed, city-inspected rental that legally exists. If an address has no rental registration at all, that’s a serious red flag — either it’s not a legal rental or the person listing it is making things up.",
          "What the certificate does not prove is that the person messaging you is actually connected to that unit. A scammer can copy a real, registered address off Zillow and pretend to rent it. So the permit check is necessary but not sufficient: it confirms the place, not the person. You still have to confirm you’re dealing with the real leaseholder — which is the other half of the problem.",
          "That’s the whole reason Wroomly is built the way it is. The certificate lookup confirms the place is legitimate; a blue check on Wroomly confirms the person on the other end is a real, named University of Michigan student rather than an anonymous account. Together they close both halves of the scam — real place, real person.",
        ],
      },
      {
        heading: 'Applying it to a sublet',
        paragraphs: [
          "Sublets have a wrinkle: the person renting to you usually isn’t the landlord, so they won’t appear on the Certificate of Compliance — the original tenant does, through their lease. That’s expected and fine. The certificate still does its job: it confirms the building and unit are a legal, inspected rental rather than an invented address.",
          "For the person side of a sublet, your checks are the ones in the subletting guides: the original tenant’s written landlord approval to sublet (most Ann Arbor leases require it), a written sublease agreement, and, on Wroomly, a blue check on the student handing you the keys. Certificate for the place, consent-plus-verification for the person.",
        ],
      },
      {
        heading: 'Two more local protections most students miss',
        paragraphs: [
          "While you’re learning what Ann Arbor law gives you, two more are worth knowing, because they push back on the parts of the market students complain about most.",
          "Right to Renew / the Early Leasing Ordinance: Ann Arbor limits how early a landlord can pressure you about next year. Under the current ordinance, landlords generally can’t make you decide on a renewal or show your occupied unit until well into your lease, and you keep a right to renew until roughly 150 days before the term ends. It exists specifically to blunt the notorious October leasing rush — so you don’t have to sign for next year in week three.",
          "Free legal help: University of Michigan Student Legal Services will review a lease or sublease for enrolled students at no cost, and Legal Services of South Central Michigan and the Fair Housing Center are there if something goes wrong. Using them is normal, not dramatic — a ten-minute lease review beats a lost deposit.",
        ],
      },
    ],
    faqs: [
      {
        question: 'Does every rental in Ann Arbor need a Certificate of Compliance?',
        answer:
          'Yes. Ann Arbor Municipal Code Section 8:516 states no one may lease a dwelling or rooming unit for occupancy unless a Certificate of Compliance is in effect. It means the city has inspected and licensed the unit as a legal rental, and the records are public — so a legitimate rental has a city paper trail.',
      },
      {
        question: 'How do I look up an Ann Arbor rental’s Certificate of Compliance?',
        answer:
          'Search the property address in the city’s STREAM permit system at stream.a2gov.org (records from mid-2022 on), or the A2Trak archive for older ones. Look for a rental registration and an unexpired Certificate of Compliance. If you can’t find it online, call Ann Arbor Rental Housing Services at 734.794.6264.',
      },
      {
        question: 'Does a valid rental permit mean a listing is not a scam?',
        answer:
          'Not by itself. A certificate proves the place is a real, licensed rental — but a scammer can copy a real registered address they don’t control. It confirms the place, not the person. Pair it with confirming you’re dealing with the actual leaseholder, which is what a verified student’s blue check on Wroomly is for.',
      },
      {
        question: 'Do I need a Certificate of Compliance to sublet in Ann Arbor?',
        answer:
          'The certificate belongs to the property and the original tenant’s lease, not to you as a subletter, so you won’t be on it — that’s normal. It still confirms the building is a legal rental. For the sublet itself, get the landlord’s written approval and a written sublease agreement.',
      },
      {
        question: 'What if the address has no rental registration in Ann Arbor?',
        answer:
          'Treat it as a serious red flag. Either the unit isn’t a legal rental or the person listing it is fabricating the address. Don’t send any money, ask the lister to explain, and confirm the address with Ann Arbor Rental Housing Services (734.794.6264) before going further.',
      },
    ],
    links: [
      { label: 'How to avoid sublet scams', href: '/guides/how-to-avoid-sublet-scams-ann-arbor' },
      { label: 'Security deposits', href: '/guides/security-deposits-ann-arbor-sublets' },
      { label: 'How to sublet your apartment', href: '/guides/how-to-sublet-your-apartment-at-university-of-michigan' },
      { label: 'Sublet vs. relet', href: '/guides/sublet-vs-relet-lease-takeover' },
      { label: 'Browse buildings', href: '/buildings' },
    ],
  },
  {
    slug: 'where-to-find-a-sublet-umich',
    title: 'Where to find a sublet at UMich, every channel compared',
    seoTitle: 'Where to Find a Sublet in Ann Arbor at UMich',
    description:
      'Where to find a sublet in Ann Arbor: the U-M housing site, Facebook groups, Craigslist, word of mouth and Wroomly, compared on who can post and how to stay safe.',
    excerpt:
      'Every place Ann Arbor sublets get posted, what each one tells you about the person on the other end, and which to use for a summer, fall or winter search.',
    published: '2026-10-12',
    updated: '2026-10-12',
    readingMinutes: 6,
    sections: [
      {
        heading: 'Where do UMich students actually post sublets?',
        paragraphs: [
          "Ann Arbor sublets get posted in five places: the university's off campus housing site, Facebook groups and Marketplace, Craigslist, word of mouth, and sublet marketplaces like Wroomly. All of them have listings. What differs is who is allowed to post, whether you can tell who that person is, and where you stand if the deal goes wrong. Pick the channel for the risk, not just the selection.",
          "The university's off campus housing site has a sublease section, and opening it sends you to a U-M sign in, so the people posting there have a U-M login. Facebook groups are where a lot of student to student posts land, and anyone the group admins let in can post. Craigslist has an Ann Arbor sublets and temporary section that anyone can post to. Word of mouth runs through classmates, your department and student groups, and some programs keep their own sublet lists for their students.",
          'Wroomly is a sublet marketplace for the UMich community in Ann Arbor. It is independent and not run by the university. Anyone can browse, inquire and list, and students who sign in with their umich Google account carry a blue check.',
        ],
      },
      {
        heading: 'Which channels tell you who is posting?',
        paragraphs: [
          'This is the question that matters most, because a sublet scam depends on you not knowing who is on the other end. The classic move: someone copies the photos and description from a real listing, swaps in their own contact details, and reposts it. That works anywhere a stranger can post.',
          'Here is how the channels compare on the things that decide your risk:',
        ],
        table: {
          caption:
            'Where to find a sublet in Ann Arbor, compared by who can post and how you can check them',
          columns: [
            'Channel',
            'Who can post',
            'Can you tell who is posting?',
            'Where you talk',
            'What to watch for',
            'Best fit',
          ],
          rows: [
            [
              'U-M off campus housing site, sublease section',
              'People with a U-M login',
              'The poster signed in with a U-M account',
              'Whatever contact the poster shares',
              'A real student can still misdescribe a place, so vet the unit and the lease',
              'Any term, if you have a U-M login',
            ],
            [
              'Facebook groups and Marketplace',
              'Anyone the group admins let in, or anyone with a Facebook account',
              'A profile name only, which is not proof of a student',
              'Messenger, outside any housing platform',
              'Copied listings and pressure to pay a deposit before a viewing',
              'A wide summer search, with extra vetting',
            ],
            [
              'Craigslist sublets',
              'Anyone',
              'Not from the post itself',
              'The Craigslist mail relay, then email or phone',
              "Requests to wire money, pay with gift cards or deposit a cashier's check, which Craigslist itself calls scams",
              'A last resort, and only if you can see the place in person',
            ],
            [
              'Word of mouth and program lists',
              'Classmates, friends, your department or program',
              'Yes, you know them or someone who does',
              'Text, email or in person',
              'Handshake deals with nothing in writing',
              'Fall only or winter stays, when fewer places get posted publicly',
            ],
            [
              'Wroomly',
              'Anyone can browse, inquire and list',
              'A blue check shows a person who signed in with a umich Google account, and nothing more',
              'Wroomly messages, which keep a record',
              'A verified student can still be dishonest, and Wroomly never handles payments',
              'Any term: filter by your dates',
            ],
          ],
        },
      },
      {
        heading: 'Does knowing who posted make a listing safe?',
        paragraphs: [
          "No. A channel that ties the poster to a real account narrows the risk; it does not remove it. Wroomly's own safety page says it plainly: a verified student can still be dishonest. New Wroomly listings are screened before they go live, but screening reads the words and photos, so it cannot prove the place exists. Whatever channel you use, run the same checks.",
        ],
      },
      {
        heading: 'Which channel fits a summer, fall or winter sublet?',
        paragraphs: [
          'Summer is the easy one. Lots of students leave Ann Arbor from May through August for internships, co-ops and home, so every channel fills up in spring. Cast the widest net: set a saved search on a marketplace, watch the Facebook groups, and check the university site.',
          'Fall only places are scarcer, because fewer people leave for just September to December. The ones who do are usually heading out for a fall study abroad term, a co-op or an internship. Word of mouth and program lists matter more here, and a saved search catches the rare post the day it appears.',
          'Winter sublets come from students leaving for a winter term abroad, a co-op, or graduating in December, and they tend to post during the fall semester. Some programs run their own winter sublet lists, so ask your department or program office before you go public.',
        ],
        bullets: [
          'Summer: every channel, starting in spring, with a saved search running',
          'Fall only: word of mouth, program lists, and a saved search for September to December dates',
          'Winter: program lists first, then student posts during the fall semester',
        ],
      },
      {
        heading: 'How do you vet a listing whatever channel it came from?',
        paragraphs: [
          'Same routine, every channel. You are confirming three things: the place exists, the person is allowed to sublet it, and the price is real.',
        ],
        bullets: [
          'See the place in person, or on a live video call where they walk you through it and open the doors you ask about',
          "Search the address together with the poster's name and the management company; an owner name that does not match is a warning sign",
          'Reverse image search the photos to catch a copied listing',
          'Reach the landlord or leasing office through contact details you find yourself, not ones the poster gives you, and ask whether the sublet is approved',
          'Compare the rent with similar places nearby; a price far below everything else is a red flag',
          'Keep the conversation in writing, ideally somewhere that keeps a record',
        ],
      },
      {
        heading: 'What has to be true before you send any money?',
        paragraphs: [
          'Money is the point of no return, so make it the last step. Never pay by wire transfer, gift card or cryptocurrency: those work like cash, and the money is usually gone for good. Payment apps are not much safer with a stranger, because once the money is sent it is hard to get back. If something already went wrong, stop paying, call your bank, and report it to the site where you found the listing and to the FTC.',
          'Do not pay anything until all of these are true:',
        ],
        bullets: [
          'You have seen the place, in person or on a live walkthrough',
          'You know who the person is, and they hold the lease or own the place',
          'The landlord or leasing office has confirmed the sublet in writing',
          'You have a written sublease agreement covering dates, rent, deposit, utilities and the condition of the place',
          'You are paying by a method that leaves a record tied to that person',
        ],
      },
      {
        heading: 'Where should you start looking today?',
        paragraphs: [
          'Start with the channels that tell you who is posting, then widen out. Browse current sublets on Wroomly filtered to your dates, check the university site if you have a U-M login, and ask your program and your friends. Then run every listing you like through the same checks above, whichever channel it came from.',
        ],
      },
    ],
    faqs: [
      {
        question: 'What is the best website for UMich sublets?',
        answer:
          "There is no single best one; it depends on how much you can verify. The university's off campus housing site requires a U-M login, and on Wroomly a blue check marks a student who signed in with a umich account. Facebook groups and Craigslist have volume but let almost anyone post. Use more than one channel and vet every listing.",
      },
      {
        question: 'Are Facebook groups safe for finding an Ann Arbor sublet?',
        answer:
          'They can work, but treat every post as unverified. Anyone the admins let in can post, a profile name is not proof of a student, and scammers copy real listings and repost them with their own contact details. See the place, confirm the sublet with the landlord, and never pay a deposit before a viewing.',
      },
      {
        question: 'Does the university list sublets?',
        answer:
          "Yes. The University of Michigan's off campus housing site has a sublease section where students can find or post a sublease, and it asks for a U-M sign in. The Dean of Students office also points students to a sublease contract template on that site. A listing there still needs the same vetting as any other.",
      },
      {
        question: 'Can someone who is not a student find a sublet in Ann Arbor?',
        answer:
          "Yes. The university's sublease section needs a U-M login, but Facebook groups, Craigslist and Wroomly are open to anyone. On Wroomly anyone can browse, inquire and list, and the blue check only marks people who verified as UMich students. Each lease sets its own rules on subletting, so read it and ask the landlord.",
      },
    ],
    links: [
      { label: 'Avoiding sublet scams', href: '/guides/how-to-avoid-sublet-scams-ann-arbor' },
      { label: 'Summer sublet guide', href: '/guides/summer-sublets-in-ann-arbor-student-guide' },
      { label: 'Verify an Ann Arbor landlord', href: '/guides/how-to-verify-an-ann-arbor-landlord' },
      { label: 'Browse current sublets', href: '/listings' },
      { label: 'FTC guide to rental listing scams', href: 'https://consumer.ftc.gov/articles/rental-listing-scams' },
      { label: 'FTC advice on payment app scams', href: 'https://consumer.ftc.gov/articles/mobile-payment-apps-how-avoid-scam-when-you-use-one' },
      { label: 'Report a scam to the FTC', href: 'https://reportfraud.ftc.gov/' },
    ],
  },
  {
    slug: 'how-to-pay-for-a-sublet-safely',
    title: 'How to pay for a sublet without getting burned',
    seoTitle: 'How to Pay for a Sublet Safely in Ann Arbor',
    description:
      'How to pay for a sublet safely: what to confirm before money moves, which payment methods leave a record, and what to do if a payment goes wrong.',
    excerpt:
      'Pay last, and pay in a way that leaves a record tied to a real person and a signed sublease. Here is what to confirm first and how each payment method compares.',
    published: '2026-11-03',
    updated: '2026-11-03',
    readingMinutes: 6,
    sections: [
      {
        heading: 'Why does the way you pay matter so much on a sublet?',
        paragraphs: [
          "Pay for a sublet last, and pay in a way that leaves a record tied to a real person and a signed sublease. The payment method is your last line of defense, not your first. Seeing the place, knowing who holds the lease and getting the landlord's okay in writing protect you more than any app or card does.",
          'The method still matters, because some of them cannot be undone. The FTC says that wiring money, sending gift cards or paying by cryptocurrency is the same as sending cash, and that you probably cannot get it back. Its advice on payment apps says scammers know that once you send money, it is hard for you to get it back.',
          "The amounts are not small. Wroomly's live rent data (the Ann Arbor rent prices guide, read 2026-11-03) puts the median asking rent at $1,900 a month across 151 active sublets. If the deposit is one month's rent, a deposit plus first month is $3,800 in one move.",
          'Wroomly processes no payments, never holds or guarantees money, and cannot recover money sent between users. Whatever channel you found the place on, the payment is between you and the person you pay. That is why the checks come first.',
        ],
      },
      {
        heading: 'What has to be true before you pay anything?',
        paragraphs: [
          'Get all of these done first. If any one is missing, the answer to a request for money is not yet.',
          'One more rule sits above the list: if anyone pressures you to decide fast, walk away. The FTC gives the same advice for rental listings, and a real sublet survives a day of checking.',
        ],
        bullets: [
          'You have seen the place, in person or on a live video walkthrough where the person opens the rooms and doors you ask about',
          'You know who the person is and that they hold the lease or own the place. A blue check on Wroomly shows someone signed in with a umich Google account, and nothing more',
          'The landlord or leasing office has approved the sublet in writing, and you reached them through contact details you found yourself',
          'You have a written sublease with the dates, the rent, the deposit amount, who holds the deposit and when it comes back',
          'The name on the payment matches the name on the sublease. A request to pay a friend, a relative or a business partner instead is a stop sign',
          'The payment method is one you can explain in a sentence, and it is not the only one the person will accept',
        ],
      },
      {
        heading: 'Which payment methods leave a record and which do not?',
        paragraphs: [
          "Two questions sort the methods: can the payment be reversed if it turns out to be fraud, and what proof does it leave of who got your money and why. The table uses the FTC's own pages on what to do if you were scammed. Where those pages say nothing, the table says so rather than guessing.",
          "Where does Zelle fit? The FTC's payment app advice names Cash App, Venmo and PayPal, and it does not name Zelle. Reversal rules for bank to bank apps depend on your bank, so read your bank's own terms before you rely on a refund. Until your bank tells you otherwise in writing, treat Zelle like any other app.",
        ],
        table: {
          caption: 'Sublet payment methods compared by whether they can be reversed, the record they leave and when they are acceptable',
          columns: [
            'Method',
            'Can it be reversed? (as the FTC describes it)',
            'The record it leaves',
            'When it is acceptable',
          ],
          rows: [
            [
              'Cash',
              'The FTC describes one rescue: mailed cash that has not yet been delivered may be intercepted by the Postal Inspection Service. Cash handed over in person has no route back',
              'Only a receipt, and the person writes it',
              'Rarely. Only in person, after every check above, against a signed receipt',
            ],
            [
              'Wire transfer',
              'The FTC says to report it to the wire transfer company right away and ask for a refund, but the money might be gone already. It also says wiring money is the same as sending cash',
              'A bank record of the transfer, to an account you cannot vet',
              'Not with anyone you have not met and checked',
            ],
            [
              'Gift card or cryptocurrency',
              'The FTC says crypto payments do not have the same legal protections as credit and debit cards, and a gift card issuer may or may not refund you',
              'Almost nothing you can use',
              'Never for a sublet. The FTC lists insisting on crypto as a sign of a scam',
            ],
            [
              'Payment app (Venmo, Cash App, PayPal and similar)',
              'The FTC says to report it to the app and ask for a reversal and a refund, and it does not promise one',
              "A transaction history with the payee's name and a note you write",
              'Only after every check above, to the person named on the sublease, with a note that says what it is for',
            ],
            [
              'Personal check',
              'The FTC pages do not describe how to reverse a check you wrote',
              'A paper trail: payee, date, memo line and your bank statement',
              'After every check above, made out to the name on the sublease, with the purpose in the memo. Never deposit a check someone sends you and send money back',
            ],
            [
              'Debit or credit card',
              'The FTC says to report it to the card issuer or bank right away and ask for a refund. Its legal protection covers unauthorized use of your card, which is not the same as a payment you were tricked into making',
              'A statement with the merchant or payee',
              'Best record of the lot, when the person can take one',
            ],
          ],
        },
      },
      {
        heading: 'How should the deposit and first month be documented?',
        paragraphs: [
          'Treat the paperwork as part of the payment. The record is what lets you prove what you paid, to whom and for what, and it is what you will lean on when the deposit comes back. Your lease and your sublease decide the terms, so ask the landlord or a lawyer what a clause means rather than guessing.',
          'The security deposits guide covers move-in photos and getting a deposit returned. Here is the paperwork for the payment itself:',
        ],
        bullets: [
          'Pay the deposit and the first month as two payments, each with its own note naming the sublet address and what the money is for',
          'Get a written receipt with the date, the amount, who paid, who received it, what it covers, who holds the deposit and when and how it comes back',
          'Make sure the amounts on the receipt match the signed sublease',
          'Keep screenshots of the listing, the messages and the payment confirmation in one folder',
          'Never pay a deposit and then ask for the sublease later',
        ],
      },
      {
        heading: 'What should you do if money already went to a scammer?',
        paragraphs: [
          'Stop paying right away, even if the person has a new reason to ask for more. Then work through the list below, and keep every screenshot and receipt. Recovery is not promised on any method, so move quickly and ask plainly.',
          "The FTC's steps depend on how you paid. For a card, call the issuer or your bank. For a wire, call the wire transfer company. For a gift card, call the issuer and keep the card and receipt. For crypto, contact the exchange or ATM operator. For a payment app, report it inside the app. For mailed cash, call the Postal Inspection Service at once.",
        ],
        bullets: [
          'Contact the company you paid with, tell them it was fraud and ask them to reverse the payment',
          'Report the scam to the FTC at ReportFraud on the FTC site',
          'Report the listing to the website or group where you found it',
          'Tell your local police and your state attorney general',
          'Warn the group or friends who might see the same listing',
        ],
      },
      {
        heading: 'Where should you go from here?',
        paragraphs: [
          'Read the Wroomly safety page for what the blue check and listing screening do and do not prove, then browse current sublets and run every one through the checklist above before any money moves.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is it safe to pay a sublet deposit with Zelle or Venmo?',
        answer:
          'Only after you have seen the place, confirmed the person holds the lease and signed a sublease, and only to the name on that sublease. The FTC says money sent through a payment app is hard to get back. With a stranger, or before a viewing, the answer is no.',
      },
      {
        question: 'Can you get money back from Venmo if a sublet was fake?',
        answer:
          'Maybe, but nothing guarantees it. The FTC says to report the payment to the app right away, ask for a reversal and a refund, and report the scam to the FTC. Move fast, keep screenshots of the listing and messages, and do not count on the money returning.',
      },
      {
        question: 'Should you ever pay for a sublet in cash?',
        answer:
          "Rarely. Cash handed over in person leaves no record unless you insist on a signed receipt, and the FTC describes no route to get it back. If it happens at all, do it in person after you have seen the place, checked the landlord's approval and signed the sublease.",
      },
      {
        question: 'What receipt should you get for a sublet deposit?',
        answer:
          'A written receipt showing the date, amount, who paid, who received it, what it covers, who holds the deposit and when and how it comes back. The amounts should match the signed sublease. Keep it with your payment confirmation and move-in photos in one folder.',
      },
    ],
    links: [
      { label: 'Avoiding sublet scams', href: '/guides/how-to-avoid-sublet-scams-ann-arbor' },
      { label: 'Security deposits for sublets', href: '/guides/security-deposits-ann-arbor-sublets' },
      { label: 'Verify an Ann Arbor landlord', href: '/guides/how-to-verify-an-ann-arbor-landlord' },
      { label: 'Where to find a sublet', href: '/guides/where-to-find-a-sublet-umich' },
      { label: 'Ann Arbor rent prices', href: '/guides/ann-arbor-rent-prices' },
      { label: 'Wroomly safety page', href: '/safety' },
      { label: 'Browse current sublets', href: '/listings' },
      { label: 'FTC guide to rental listing scams', href: 'https://consumer.ftc.gov/articles/rental-listing-scams' },
      { label: 'FTC steps if you were scammed, by payment method', href: 'https://consumer.ftc.gov/articles/what-do-if-you-were-scammed' },
      { label: 'FTC advice on payment app scams', href: 'https://consumer.ftc.gov/articles/mobile-payment-apps-how-avoid-scam-when-you-use-one' },
    ],
  },
  {
    slug: 'find-a-roommate-umich-off-campus',
    title: 'How to find a roommate at UMich, and check them before you sign together',
    seoTitle: 'Find a Roommate at the University of Michigan',
    description:
      'How to find a roommate at the University of Michigan: where students look, the questions to ask, how to check a stranger, and what to settle before you sign.',
    excerpt:
      'Where Ann Arbor students find roommates, the questions that decide whether you can live together, and the order to check, agree and sign in.',
    published: '2026-11-03',
    updated: '2026-11-03',
    readingMinutes: 6,
    sections: [
      {
        heading: 'Where do UMich students find roommates?',
        paragraphs: [
          'Start with people you already know. Friends from class, your lab or department, student groups and your current housemates are the lowest risk source, because someone can vouch for them. Ask around before you post anywhere.',
          "After that, strangers come from three places. The university's off campus housing site lets you find a roommate or a sublease through a portal that asks for a U-M sign in. Group chats and social media groups for your class, program or student org are where a lot of student to student matches happen. Roommate boards and listing sites let almost anyone post a profile, so treat a match there as an introduction, not a reference.",
          'Wroomly is independent and not run by the university. Browse current places on the listings page, where students who signed in with a umich Google account carry a blue check. The check shows a university Google login and nothing more, so it is a place to start a conversation, not a reason to skip the steps below.',
        ],
      },
      {
        heading: 'What should you ask before you decide?',
        paragraphs: [
          'Finding the person is the easy half. The harder half is learning whether you can live together, and a few direct questions settle most of it. Ask them in your first real conversation, before anyone falls in love with a floor plan.',
          'Choose on how someone lives, not who they are: their schedule, budget, habits and house rules. Nothing else belongs in the decision.',
          'Here are the questions that decide it, and which answers are deal breakers:',
        ],
        table: {
          caption: 'First conversation questions for a potential roommate, and which answers should end the search',
          columns: [
            'Topic',
            'Ask',
            'Deal breaker if',
          ],
          rows: [
            [
              'Schedule',
              'When do you usually sleep, study and have people over? Do you work early or late?',
              'Your sleep schedules collide and neither of you can adjust',
            ],
            [
              'Rent ceiling',
              'What is the most you can pay each month, including utilities?',
              'Their ceiling is well below the places you can both stand to live in',
            ],
            [
              'Paying on time',
              'How do you pay your share, and what happens if you are ever late?',
              'They get vague, or say money is never a problem so there is no need to plan',
            ],
            [
              'Guests',
              'How often do you have people over, and do overnight guests need a heads up?',
              'Your answers are far apart and neither wants to compromise',
            ],
            [
              'Cleaning',
              'What does clean mean to you, and how do you want to handle shared spaces and shared supplies?',
              'One of you wants a chore plan and the other will not discuss one',
            ],
            [
              'Quiet hours',
              'When do you need quiet, and how do you feel about noise and parties?',
              'You need quiet on school nights and they host most nights',
            ],
            [
              'Summer plans',
              'Will you stay through the summer, sublet, or leave? Are you open to a sublet?',
              'One of you needs the lease to run all year and the other will be gone',
            ],
          ],
        },
      },
      {
        heading: 'How do you check a stranger who is also looking for a roommate?',
        paragraphs: [
          'Treat a stranger the way you would treat a stranger offering you a place: friendly, and verified. Scammers copy real listings, swap in their own contact details and rush you to decide, and a fake roommate post uses the same moves.',
          'Run these checks in order, and stop if any one of them goes wrong:',
        ],
        bullets: [
          'Talk first in writing, then get on a video call before you meet or commit to anything',
          'Ask for a mutual contact, a friend, a former housemate or someone from your program, and actually message that person',
          'Meet in a public place or bring a friend the first time you meet in person',
          'Search their name along with the address of the place and the management company; an owner name that does not match is a warning sign',
          'Keep your Social Security number, ID photos, bank details and paystubs to yourself; a prospective roommate has no reason to ask for them',
          'Walk away from pressure to decide today or to send a deposit before you have seen the place',
        ],
      },
      {
        heading: 'When is it safe to commit to a lease together?',
        paragraphs: [
          "Money and signatures come last. The university's off campus guide says to never send money before seeing the property in person, and the FTC warns that wire transfers, gift cards and cryptocurrency work like cash and are usually impossible to recover.",
          'Here is the order that keeps you safe, from first message to signing:',
          "Read how the lease is set up before you sign. The university's guide describes an individual lease as one where you rent a bedroom and share common areas, and a joint and several lease as one where each tenant can be held responsible for the full amount, not just their share. What that means for you depends on your lease, so ask the landlord, and a lawyer if you are unsure.",
        ],
        bullets: [
          'First message, then a written back and forth about schedule, budget and habits',
          'A video call, then a meeting in person',
          'A walk through the actual place together, with the doors open and the kitchen and bathroom seen',
          'A written agreement between roommates on quiet hours, guests, cleaning, how rent and bills are split and what happens when someone pays late, plus summer plans',
          'Confirmation from the landlord or leasing office, through contact details you found yourself, of who is on the lease and how rent is collected',
          'Read the lease together before anyone signs, then sign and pay through a method that leaves a record',
        ],
      },
      {
        heading: "What if you find a room in someone else's place instead?",
        paragraphs: [
          'Joining a place that already has a lease changes the questions. Find out whose name is on the lease, whether the landlord knows about you and approves of you living there, and whether you would be a subtenant or a tenant on the lease. Leases commonly say something about subletting and extra occupants, so read it, ask the landlord, and get anything that matters in writing.',
          'The roommate checks above still apply, plus one: confirm that the person offering the room actually holds the lease. Search the address, contact the landlord or leasing office yourself, and never pay a deposit to hold a room you have not seen.',
        ],
      },
      {
        heading: 'Where should you start today?',
        paragraphs: [
          "Message two people you already know, then check the university's off campus housing site if you have a U-M login. Browse current places on Wroomly to get a feel for what exists and what it costs to share, and save a search so new places come to you. When someone looks promising, start with the question list and the video call, and keep money for last.",
        ],
      },
    ],
    faqs: [
      {
        question: 'Where can I find a roommate at the University of Michigan?',
        answer:
          "Start with friends, classmates and student groups. Then try the university's off campus housing site, which has a roommate and sublease search behind a U-M sign in, plus class and program group chats. Roommate boards and listings let almost anyone post, so verify strangers by video call and a mutual contact before committing.",
      },
      {
        question: 'Is it safe to live with a roommate you found online?',
        answer:
          'It can be, if you check before you commit. Talk in writing, get on a video call, ask for a mutual contact, and meet in public. Do not send money before seeing the place, and never pay by wire, gift card or cryptocurrency. A profile is not proof of who someone is, so verify first.',
      },
      {
        question: 'Should I pick a friend or a stranger as a roommate?',
        answer:
          'Either can work, and neither is automatic. A friend knows you but may not share your habits around money, cleaning and guests. A stranger starts from nothing and needs more checking. Judge both the same way: schedule, budget, habits and house rules, and put your agreement in writing.',
      },
      {
        question: 'When should I start looking for roommates for next year?',
        answer:
          "Start as soon as you know which term you need, because Ann Arbor's market moves early and many students commit to a lease for the following fall during the autumn before. Wroomly's timeline guide walks through the usual rhythm. If you miss that window, sublets and relets stay active through spring and summer.",
      },
    ],
    links: [
      { label: 'First apartment checklist', href: '/guides/first-apartment-checklist-ann-arbor' },
      { label: 'Avoiding sublet scams', href: '/guides/how-to-avoid-sublet-scams-ann-arbor' },
      { label: 'Where to find a sublet', href: '/guides/where-to-find-a-sublet-umich' },
      { label: 'UMich off campus housing timeline', href: '/guides/umich-off-campus-housing-timeline' },
      { label: 'Browse current places', href: '/listings' },
      { label: 'Safety on Wroomly', href: '/safety' },
      { label: 'U-M Dean of Students guide to living on your own', href: 'https://deanofstudents.umich.edu/student-programs/beyond-the-diag/off-campus-living-guide/living-on-your-own/' },
      { label: 'FTC guide to rental listing scams', href: 'https://consumer.ftc.gov/articles/rental-listing-scams' },
      { label: 'Report a scam to the FTC', href: 'https://reportfraud.ftc.gov/' },
    ],
  },
  {
    slug: 'individual-lease-vs-joint-lease-ann-arbor',
    title: 'Individual lease vs joint lease in Ann Arbor, side by side',
    seoTitle: 'Individual vs Joint Lease in Ann Arbor',
    description:
      'Individual lease vs joint lease in Ann Arbor: what each commonly means for a missed payment, damage, a roommate leaving early and a sublet, and what to ask first.',
    excerpt:
      'The lease type decides who is on the hook when a roommate stops paying or leaves. Here is how the two compare in four real situations, and what to confirm before you sign.',
    published: '2026-11-03',
    updated: '2026-11-03',
    readingMinutes: 6,
    sections: [
      {
        heading: 'What is the difference between an individual lease and a joint lease?',
        paragraphs: [
          'Half the confusion is vocabulary, so sort it first. On an individual lease, each roommate signs for their own bedroom plus a share of the common areas. On a joint lease, everyone signs one lease for the whole unit. Same address, very different answer to the question: whose problem is it when someone stops paying?',
          "The university's off campus living guide describes an individual lease this way: you rent a bedroom and share common areas, you are usually responsible for your own rent, and you may still be charged for damage to the common areas. Joint leases usually come with joint and several liability, which is the next section.",
          'Everything here describes what leases commonly say. Yours may say something different, so the lease itself, your landlord, the city or a lawyer has the final word.',
        ],
      },
      {
        heading: 'What does joint and several liability mean for you?',
        paragraphs: [
          "Short version: on a joint and several lease, the landlord can ask any one tenant for the whole amount, not just that person's share. The university's off campus living guide puts it as each tenant being held responsible for the full amount of rent or damages, not only their own portion.",
          'Say four of you split a house and one roommate stops paying. Under this kind of clause, the landlord is commonly allowed to look to you for the missing share. Whether you can then collect it back from your roommate is a separate matter between the two of you.',
          'Look for the words joint and several, jointly and severally, or each tenant is liable for all obligations. If you cannot find them, ask the landlord directly and get the answer in writing.',
        ],
      },
      {
        heading: 'What happens if a roommate stops paying or moves out?',
        paragraphs: [
          'Run both lease types through four situations and the pattern shows up fast. An individual lease tends to wall each person off from the others. A joint lease ties the whole group together. Neither is better by default: it depends on how well you know your roommates and how much risk you can carry.',
          'Every cell below says what the arrangement commonly means, not what your lease says. Use it as a list of things to check.',
        ],
        table: {
          caption: 'Individual lease vs joint lease in four situations, with what each commonly means',
          columns: [
            'Situation',
            'Individual lease',
            'Joint lease',
          ],
          rows: [
            [
              'A roommate misses a payment',
              "Commonly, each tenant owes only their own rent, so a missed payment is that roommate's problem. Confirm that wording in the lease.",
              'Commonly, the landlord can ask any tenant for the full rent, not just a share. Confirm the joint and several wording in the lease.',
            ],
            [
              'A shared room or common area gets damaged',
              'Commonly, you owe for damage you cause, and common areas can still be charged to the group. Ask how the lease splits them.',
              'Commonly, every tenant can be held responsible for the full amount of damage, even if someone else caused it. Check the damage clause.',
            ],
            [
              'A roommate leaves early',
              'Commonly, your lease is unaffected, and the landlord finds or approves a replacement for that bedroom. Ask who picks the new person.',
              'Commonly, the lease keeps running and the remaining tenants stay responsible unless the landlord agrees to a change. Ask what the landlord requires.',
            ],
            [
              'A roommate wants to sublet',
              'Commonly, one bedroom is sublet and the original tenant often stays responsible to the landlord. Check the sublet clause and get written approval.',
              'Commonly, the other tenants have to agree, and the original tenant often stays responsible to the landlord. Check the sublet clause and get written approval.',
            ],
          ],
        },
      },
      {
        heading: 'How does each type work with a sublet?',
        paragraphs: [
          "Subletting is where lease type bites hardest. The university's off campus living guide says that in a sublease, the original tenant often remains responsible to the landlord. It also says that if you plan to sublet, you should check your lease for restrictions and make sure everyone in the unit agrees.",
          "On a joint lease, that agreement matters more, because the person you bring in becomes a housemate for everyone on the lease. On an individual lease, one bedroom changes hands, but the landlord's written approval is still the thing to get. A few leases prohibit subletting outright.",
          "If you want to hand the whole lease to someone, that is a lease takeover, which works differently from a sublet. The same guide notes that after a completed transfer you generally are not responsible any more, but only the landlord's paperwork makes that true. Our sublet vs relet guide untangles the two words.",
        ],
        bullets: [
          'Sublet: you stay on the lease and usually stay answerable to the landlord',
          "Lease takeover: the new person replaces you on the lease, with the landlord's sign off",
          'Either way: get approval in writing before anyone moves in',
        ],
      },
      {
        heading: 'Which questions should you ask the landlord before you sign?',
        paragraphs: [
          'Ask these before you sign, and keep the answers in an email so you have a record. A good landlord or leasing office answers them without fuss.',
          "If you are still hunting for a place, you can browse current places on Wroomly and ask these questions about any lease you are handed. For anything about your rights, Michigan Legal Help keeps a free housing section that includes tenant's rights and leases, and a lawyer can read your actual lease.",
        ],
        bullets: [
          'Is this an individual lease or a joint lease, and where does the lease say so?',
          'Does the lease say joint and several, and what does it say if one tenant stops paying?',
          'If a roommate leaves, who finds the replacement, and does the landlord have to approve them?',
          'Can I sublet or hand off my lease, and what is the process, fee and deadline?',
          'Who is charged for damage in shared rooms, and how is it split?',
          'Is the rent the same on an individual lease and a joint lease for this unit?',
          'Are all roommates listed on every document, including the deposit receipt?',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is it better to have an individual lease or a joint lease?',
        answer:
          'Neither is better by default. An individual lease commonly limits you to your own rent and bedroom, while a joint lease ties all tenants together, often with joint and several liability. Pick based on how well you know your roommates and how much risk you can carry, then confirm what the lease actually says.',
      },
      {
        question: 'What does joint and several mean on an apartment lease?',
        answer:
          "It commonly means the landlord can ask any one tenant for the full rent or damages, not just that tenant's share. The university's off campus living guide describes it this way. Look for the wording in your lease, and ask the landlord or a lawyer if it is unclear.",
      },
      {
        question: 'Can I leave a joint lease if my roommate stays?',
        answer:
          'That depends on your lease and your landlord. Commonly, you stay responsible until the landlord agrees to a change, a sublet usually leaves you answerable, and a takeover needs written approval. Ask the landlord what the lease allows, and see Michigan Legal Help or a lawyer for your rights.',
      },
      {
        question: 'Can a landlord charge more for individual leases?',
        answer:
          'Landlords set their own pricing, and the lease or the leasing office is the only source for it. Ask for the monthly rent under both lease types for the same unit, in writing, and compare. We do not quote a difference here because it varies by building.',
      },
    ],
    links: [
      { label: 'Sublet vs relet vs lease takeover', href: '/guides/sublet-vs-relet-lease-takeover' },
      { label: 'First apartment checklist', href: '/guides/first-apartment-checklist-ann-arbor' },
      { label: 'How to sublet your apartment', href: '/guides/how-to-sublet-your-apartment-at-university-of-michigan' },
      { label: 'Browse current places', href: '/listings' },
      { label: 'Off campus living guide: living on your own', href: 'https://deanofstudents.umich.edu/student-programs/beyond-the-diag/off-campus-living-guide/living-on-your-own/' },
      { label: 'Michigan Legal Help: housing', href: 'https://michiganlegalhelp.org/self-help-tools/housing' },
    ],
  },
  {
    slug: 'roommate-agreement-checklist-off-campus',
    title: 'A roommate agreement checklist for an off campus house or apartment',
    seoTitle: 'Roommate Agreement for Off Campus Housing',
    description:
      'A printable roommate agreement checklist for off campus housing in Ann Arbor: rent and utilities, house rules, and what to settle about leaving early or subletting.',
    excerpt:
      'Fill in the blanks together: the money, the house rules and the exit plan every off campus household needs, kept next to your lease.',
    published: '2026-11-03',
    updated: '2026-11-03',
    readingMinutes: 5,
    sections: [
      {
        heading: 'Why does an off campus household need a roommate agreement?',
        paragraphs: [
          "Because you share a lease and a bank balance, not just a room. In a dorm the worst case is a noisy hallway. In an off campus house or apartment, one late share of the rent or one roommate who leaves in March becomes everyone's problem. A roommate agreement is the set of house rules you write for yourselves, and it sits next to the lease. It does not replace the lease, and your landlord is not part of it.",
          "Even when everyone is on the lease, the lease rarely says who buys the trash bags, whose name is on the internet account, or what happens to a bedroom in July. The University of Michigan's Dean of Students tells students living off campus to sit down with their roommates before signing and agree on quiet hours, cleaning and how to split costs. That page also tells you to decide early how payments will be made and to keep records. The checklist below turns that advice into blanks you can fill in together.",
          'Print this, grab a pen, and fill one blank per line. Write down the answer everyone can live with, not the one the loudest person wants.',
        ],
      },
      {
        heading: 'Which money items belong in it?',
        paragraphs: [
          'Money first, because money is where friendships bend. Your lease sets what the household owes the landlord. Read it before you fill anything in, because many leases make each tenant responsible for the full rent, not just a share, and your landlord can tell you how yours works. The agreement covers what happens between the roommates.',
          'Fill in each blank:',
        ],
        bullets: [
          'Monthly rent share for each person: ______',
          'Who collects the shares and pays the landlord, and by what day of the month: ______',
          'How shares get paid to that person (bank transfer, payment app, check): ______',
          'What happens if a share is late, and how many days before the others speak up: ______',
          'Whose name is on each utility account (electric, gas, water, internet): ______',
          'How each utility bill gets split, and the day everyone else pays the account holder: ______',
          'How you handle a winter heating bill that runs high: ______',
          'Who buys shared supplies like soap and trash bags, and how you settle up: ______',
          'How the security deposit was paid and how any deduction for damage gets shared: ______',
        ],
      },
      {
        heading: 'Which house rules prevent the most arguments?',
        paragraphs: [
          'Small daily stuff causes more fights than big money stuff, mostly because nobody said it out loud. Pick numbers and times, not vibes. Clean enough is a fight waiting to happen. Dishes washed within a day is a rule.',
          'Fill in each blank:',
        ],
        bullets: [
          'Cleaning: who does the kitchen, bathrooms, living room and trash, and how often: ______',
          'Quiet hours on weeknights and weekends, including exam weeks: ______',
          'Guests: how much notice for overnight guests, and how many nights in a row is too many: ______',
          'Shared items: what is fair game and what is off limits (food, kitchen gear, speakers, the TV): ______',
          'Parking, bikes and storage: who gets which space: ______',
          'Smoking, vaping, pets and alcohol in the common areas: ______',
          'Winter chores such as shoveling the walk, if the lease leaves it to the tenants: ______',
          'How you raise a problem (a house meeting, a group chat, a monthly check in): ______',
        ],
      },
      {
        heading: 'What should it say about leaving early or subletting?',
        paragraphs: [
          'This is the section a dorm era checklist skips, and it is the one that matters most off campus. Someone will get an internship, go abroad for a semester or graduate in December. Decide how that works while nobody is leaving.',
          'Start with the lease. Many Ann Arbor leases allow subletting only with written landlord approval, and some prohibit it. The Dean of Students page says to check your lease for restrictions and make sure everyone in the unit agrees, and that the original tenant often remains responsible to the landlord. Your landlord can tell you how your lease handles all of this. For a lease dispute or a question about what you are owed, the Housing section of Michigan Legal Help is a place to start looking for free legal information, and a lawyer can answer what a general guide cannot.',
          'Fill in each blank:',
        ],
        bullets: [
          'How much notice a roommate gives before moving out: ______',
          "Who covers that person's share until someone takes the room: ______",
          'Who finds a replacement, and how the others get a say before anyone signs: ______',
          'Whether a roommate may sublet their bedroom in summer, and who must approve in writing: ______',
          'Who talks to the landlord about any change to the lease or the people on it: ______',
          'How a leaving roommate hands back keys, clears out and settles bills: ______',
          'How summer is handled if some roommates stay and some go: ______',
        ],
      },
      {
        heading: 'How do you keep it from gathering dust?',
        paragraphs: [
          'Write it before anyone moves in, or in the first week at the latest. Money topics go easiest while everyone still likes each other and nobody has missed a payment. If you already live together, do it this weekend. A late agreement beats none.',
          'Keep it short enough to read in five minutes, have every roommate sign or reply yes in the group chat, and store a copy next to the lease. Put a date on your calendar to review it, once in September and again around winter break. When someone new joins through a sublet, hand them the page first. Browse current places on Wroomly and bring this checklist to the first conversation. Wroomly is independent of the university, and a blue check on a profile shows only a umich Google sign in.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Do I need a roommate agreement if we are all on the lease?',
        answer:
          'Yes, it is still worth writing. The lease covers what the household owes the landlord. It rarely says who pays which utility, how cleaning works, or what happens when one person leaves in March. A short agreement fills those gaps. Keep it next to the lease, and read the lease first.',
      },
      {
        question: 'What should a roommate agreement say about utilities?',
        answer:
          'Settle four things: whose name is on each account, how each bill gets split, who pays the company, and the day everyone else pays that person. Add what happens when a bill runs late or the winter heating bill jumps. Your lease should say who is responsible for utilities, so check it first.',
      },
      {
        question: 'Is a roommate agreement legally binding?',
        answer:
          'It is house rules the roommates write for themselves, and it sits next to the lease rather than replacing it. Your landlord is not part of it. Whether anyone could enforce one is a question for a lawyer, and the lease still governs what you owe the landlord. Treat it as a way to avoid fights.',
      },
      {
        question: 'When should roommates write the agreement?',
        answer:
          'Before anyone moves in, or in the first week at the latest. Money topics are easiest to settle while everyone still gets along and nobody has missed a payment. If you already live together, do it this weekend and add a review date for the fall and for winter break.',
      },
    ],
    links: [
      { label: 'Your first Ann Arbor apartment checklist', href: '/guides/first-apartment-checklist-ann-arbor' },
      { label: 'Security deposits for sublets', href: '/guides/security-deposits-ann-arbor-sublets' },
      { label: 'Where to find a sublet', href: '/guides/where-to-find-a-sublet-umich' },
      { label: 'Browse current places', href: '/listings' },
      { label: 'UMich Dean of Students off campus living guide', href: 'https://deanofstudents.umich.edu/student-programs/beyond-the-diag/off-campus-living-guide/living-on-your-own/' },
      { label: 'Michigan Legal Help housing information', href: 'https://michiganlegalhelp.org/self-help-tools/housing' },
    ],
  },
  {
    slug: 'split-rent-with-roommates-different-bedrooms',
    title: 'How to split rent when the bedrooms are different sizes',
    seoTitle: 'Split Rent With Different Size Bedrooms',
    description:
      'Split rent with roommates when bedrooms differ: a shared share for common space, a share by bedroom size, a worked three bedroom example, and a one line fairness test.',
    excerpt:
      'An equal split rarely feels fair when one bedroom is huge and another is a closet. Split the rent in two layers, check it, and write it down.',
    published: '2026-11-03',
    updated: '2026-11-03',
    readingMinutes: 6,
    sections: [
      {
        heading: 'Why is an equal split not always fair?',
        paragraphs: [
          'An equal split is the easiest math and the easiest argument. Three people, one rent, divide by three. It works when the bedrooms are close to the same. It stops working the day one roommate has the big room with the window seat and another has a room that barely fits a desk.',
          'The fix is not to haggle over every square foot. Split the rent in two layers: one share for the parts of the home everyone uses equally, and one share for the bedrooms, priced by size and features. Then test the result and write it down. The rest of this guide walks through that, with numbers you can swap for your own.',
          'One scope note: this is about dividing the money among roommates. What your lease says about who owes the landlord is a separate question, covered near the end.',
        ],
      },
      {
        heading: 'How do you split by bedroom size?',
        paragraphs: [
          'Start with the total monthly rent on the lease, then work in four steps. Do them on paper or in a shared note before anyone signs.',
          'Pick the split between the two layers first. Half and half is a good starting point: half of the rent covers the kitchen, living room, hallways and any shared bathroom, which everyone uses the same, and half is the bedroom pool. If your common space is a tiny galley kitchen and a closet of a living room, move more weight to the bedrooms. If the common space is the best part of the place, move more weight to it. Agree on the number out loud.',
        ],
        bullets: [
          'Step 1: Write the total monthly rent, and the share you give to common space (for example 50 percent).',
          'Step 2: Divide the common space share equally by the number of roommates. Everyone pays this part.',
          'Step 3: Measure each bedroom, length times width, in the same way for every room. Add the bedroom sizes together, then divide each room by the total to get its percentage of the bedroom pool.',
          "Step 4: Multiply the bedroom pool by each percentage, then add the equal common space share. That is each person's monthly rent.",
        ],
      },
      {
        heading: 'What does the math look like for a three bedroom?',
        paragraphs: [
          "Here is a worked example. A three bedroom in Ann Arbor has a median asking rent of $3,000 a month across 24 active listings, per Wroomly's live rent prices guide (https://wroomly.app/guides/ann-arbor-rent-prices), computed 2026-11-03. That is a market median, not your rent, so use it only to follow the math and swap in the number from your own lease.",
          'The bedroom sizes below (150, 120 and 110 square feet) are made up for the example. They are blanks for you to fill in with your own measurements. The split is half common space, half bedrooms: $1,500 shared three ways is $500 each, and the other $1,500 is divided by bedroom size.',
          "Fill in the same columns with your own numbers: bedroom size, that room's share of the bedroom total, its piece of the bedroom pool, the equal common space share, and the monthly total.",
        ],
        table: {
          caption: 'Worked example: $3,000 three bedroom rent, half common space and half bedroom size (bedroom sizes are made up, fill in your own)',
          columns: [
            'Roommate',
            'Bedroom size (sq ft)',
            'Share of bedroom total',
            'Bedroom pool share',
            'Common space share',
            'Monthly rent',
            'Share of total rent',
          ],
          rows: [
            [
              'Roommate A (example)',
              '150',
              '39.5%',
              '$592',
              '$500',
              '$1,092',
              '36.4%',
            ],
            [
              'Roommate B (example)',
              '120',
              '31.6%',
              '$474',
              '$500',
              '$974',
              '32.5%',
            ],
            [
              'Roommate C (example)',
              '110',
              '28.9%',
              '$434',
              '$500',
              '$934',
              '31.1%',
            ],
            [
              'Total (example)',
              '380',
              '100%',
              '$1,500',
              '$1,500',
              '$3,000',
              '100%',
            ],
          ],
        },
      },
      {
        heading: 'What about a private bathroom, a bigger closet or a parking spot?',
        paragraphs: [
          'Square footage does not capture everything. A room with its own bathroom, a walk in closet, a balcony door or a spot in the driveway is worth more than the same size room without them. A room with no window, or one you walk through to get to another room, is worth less.',
          'Handle these as a flat dollar adjustment you agree on, not a new formula. Add or subtract it after the bedroom math, then spread the opposite amount across the other roommates so the total still matches the rent. A parking spot is the simplest case: if only one person uses it, that person pays for it.',
          'Pick adjustments you could explain to a stranger by looking at the room. Features of the room and the lease, never anything about the person who takes it.',
        ],
      },
      {
        heading: 'How do you test that the split feels fair?',
        paragraphs: [
          'Numbers can be correct and still feel wrong. Run one test before you lock it in:',
          'Would you swap bedrooms with either roommate at the price they would pay for it? If everyone says no, the split holds. If someone says yes, that room is priced too low or yours is priced too high, so move a few dollars and ask again.',
          'Decide who picks rooms before you see the prices: lowest price first, a draw, or the order people joined the lease. Rooms get assigned by that agreed rule, so nobody has to defend why one person got the big one.',
        ],
      },
      {
        heading: 'How do you write it down and handle utilities?',
        paragraphs: [
          "Write the split down the day you agree, with the date and everyone's initials or a reply of agreed in a shared chat. A one page note is enough: the total rent, the percentage or dollar amount for each person, the adjustments, who pays the landlord, and what happens if someone is late.",
          "The university's off campus living guide, which is published by the university and separate from Wroomly, suggests deciding early how costs will be split and how and when payments are made. It also suggests keeping records of who pays what, especially when an account is in one person's name. Do both.",
          'For utilities, the simple default is an equal split, because the kitchen, the lights and the heat in the common rooms serve everyone. If one person works from home all day or runs a space heater, talk about it before the first bill, not after. Whoever holds the account fronts the money, and everyone else pays them back by a set day each month.',
        ],
      },
      {
        heading: 'What if a roommate moves out mid lease?',
        paragraphs: [
          "Nothing in your split changes what the landlord can ask for. Some Ann Arbor leases are joint and several, which commonly means each tenant can be held responsible for the full rent and not just their share. The university's off campus guide describes this, and Michigan Legal Help says that when roommates are all on a lease, a private agreement to split the rent does not limit what the landlord can demand from each of them.",
          "So treat your split as a deal among friends that the lease sits on top of. Before you sign, ask the landlord how a roommate can leave or be replaced, and what approval and paperwork that takes. If a roommate stops paying, read your lease first, then talk to your landlord, the university's Student Legal Services if you are a student there, or a lawyer. This guide cannot tell you what your lease means or what you are owed.",
          'In your written split, add one line for this case: how much notice a leaving roommate gives, who finds the replacement, and who covers the share in the gap.',
        ],
      },
      {
        heading: 'Where do you go from here?',
        paragraphs: [
          'Measure the rooms this week, run the four steps, and send the table to your roommates before anyone puts a name on a lease. If you are still comparing places, you can compare current shared places on Wroomly and run the same math on any three bedroom you like.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How do you split rent fairly with different size bedrooms?',
        answer:
          "Split it in two layers. Half the rent covers shared space and is divided equally, and the other half is divided by each bedroom's share of the total bedroom square footage. Add the two amounts for each person, adjust for features like a private bathroom, and write the result down before anyone signs.",
      },
      {
        question: 'Should the roommate with the bigger room pay more?',
        answer:
          'Usually yes, because a bigger room is worth more to the person who has it. A common way to do it is to price bedrooms by their share of the total bedroom square footage, and split the shared space equally. Agree on room features like a bathroom or closet up front.',
      },
      {
        question: 'Should utilities be split evenly?',
        answer:
          'Evenly is the simple default, because everyone uses the kitchen, lights and heat in the shared rooms. If one person uses far more, such as working from home all day, talk about it before the first bill. Whoever holds the account fronts the money, and everyone pays them back by a set day.',
      },
      {
        question: 'What if a roommate moves out mid lease?',
        answer:
          'Your split among roommates does not change what the landlord can ask. Some leases make each tenant responsible for the full rent, so read yours, ask the landlord in writing how a roommate can leave or be replaced, and get advice from the landlord, a campus legal service or a lawyer. Add the process to your written split.',
      },
    ],
    links: [
      { label: 'Ann Arbor rent prices (live)', href: '/guides/ann-arbor-rent-prices' },
      { label: 'How to price your sublet', href: '/guides/how-to-price-your-sublet' },
      { label: 'Roommate agreement checklist', href: '/guides/roommate-agreement-checklist-off-campus' },
      { label: 'Compare current shared places', href: '/listings' },
      { label: 'Off campus living guide: living on your own', href: 'https://deanofstudents.umich.edu/student-programs/beyond-the-diag/off-campus-living-guide/living-on-your-own/' },
      { label: 'Michigan Legal Help: problems with a roommate', href: 'https://michiganlegalhelp.org/node/14993' },
    ],
  },
  {
    slug: 'sublet-apartment-while-studying-abroad',
    title: 'How to sublet your Ann Arbor apartment while you study abroad',
    seoTitle: 'Sublet Your Apartment While Studying Abroad',
    description:
      'How to sublet your apartment while studying abroad: a countdown from three months before you leave to the return handover, with who holds each task.',
    excerpt:
      'A semester abroad is a fixed gap with a known return date. Here is the checklist for subletting your Ann Arbor place, from the lease check to the key handover.',
    published: '2026-11-03',
    updated: '2026-11-03',
    readingMinutes: 7,
    sections: [
      {
        heading: 'Can you sublet your place while you are abroad?',
        paragraphs: [
          'Usually, yes, if your landlord and your roommates agree. A semester abroad is the easiest sublet to plan, because you know the day you leave and the day you come back. It is also the easiest to leave half done, because you will be on another continent when something goes wrong.',
          "Most Ann Arbor leases allow subletting but require written landlord approval, and some charge a small re-let fee. A few prohibit it outright. If yours does, ask the landlord whether they will make an exception for a semester abroad, and get the answer in writing. The university's Dean of Students office gives the same advice for any sublease: make sure your landlord and roommates agree in writing.",
          'Work backwards from your departure date. The checklist below puts the whole job on a calendar and shows who holds each task.',
        ],
      },
      {
        heading: 'What do you need to check before you list it?',
        paragraphs: [
          'Start three months before you leave. Winter semester sublets post mostly in November and early December, so a student heading out in January is already on the clock by fall.',
          'Here is the countdown, with the person who holds each task:',
        ],
        table: {
          caption: 'Countdown from three months before departure to the return handover, with who holds each task',
          columns: [
            'When',
            'Task',
            'Who holds it',
          ],
          rows: [
            [
              'Three months out',
              'Read your lease for the subletting clause, re-let fee and notice terms',
              'You',
            ],
            [
              'Three months out',
              'Ask your roommates if they are fine with a stranger in your room, and tell them your dates',
              'You and roommates',
            ],
            [
              'Three months out',
              'Ask the landlord for their sublet process and form, and keep the reply',
              'You and landlord',
            ],
            [
              'Two months out',
              'Write the listing with exact dates, rent, utilities and what stays in the room',
              'You',
            ],
            [
              'Two months out',
              'Meet or video call every serious applicant, with a roommate on the call if you can',
              'You and roommates',
            ],
            [
              'One month out',
              'Sign a written sublease, send a copy to the landlord, and agree how rent and deposit move',
              'You and subletter',
            ],
            [
              'One month out',
              'Photograph the room and common areas, and agree on a list of what is left',
              'You and subletter',
            ],
            [
              'Two weeks out',
              'Hand over keys and codes, and write down who to call for what',
              'You, subletter and landlord',
            ],
            [
              'While you are away',
              'Answer messages, forward anything the landlord sends, and check that rent arrived',
              'You',
            ],
            [
              'While you are away',
              'Report repairs to the landlord and keep the shared spaces in order',
              'Subletter and roommates',
            ],
            [
              'Two weeks before you return',
              'Confirm the move-out date, the key return and a walkthrough',
              'You and subletter',
            ],
            [
              'Return day',
              'Walk the room together against the photos, collect keys and settle the deposit',
              'You and subletter',
            ],
          ],
        },
      },
      {
        heading: 'What should the lease and the sublease say?',
        paragraphs: [
          'Your lease is the document to read, not a summary of one. Leases commonly say whether subletting is allowed, whether the landlord must approve it in writing, and whether you stay on the hook for rent and damage while someone else lives there. Plenty of leases say you do, and the person on the lease is the one the landlord calls. If a clause is unclear, ask your landlord, or ask the city or a lawyer if the stakes are high. This guide describes what leases commonly say. It is not legal advice.',
          "Put the money terms in writing too. The Dean of Students office says to put exactly how rent and utilities will be split in writing and to use the official sublease contract template on the university's off campus housing site.",
        ],
      },
      {
        heading: 'Who handles problems while you are away?',
        paragraphs: [
          'Decide this before you board the plane, because a leaking sink does not wait for your time zone. Four people each have a job:',
        ],
        bullets: [
          'You: stay reachable. Pick a messaging app, tell your subletter when you are awake, and check it daily.',
          'Roommates: they live there, so they see problems first. Ask them to tell the subletter and the landlord, and to message you if something is serious.',
          'The landlord: repairs and notices go through them. Give your subletter the leasing office contact and ask the landlord to copy you on anything about the unit.',
          'The subletter: pays on time, reports damage fast and follows the house rules your roommates already have.',
        ],
      },
      {
        heading: 'How should money move?',
        paragraphs: [
          'Write the plan down in one message that all four of you can see. If rent stops or a repair is ignored, that message is the first thing you will want. Money is where the plan breaks most often. Pick one payment method that leaves a record, agree on the due date, and set a reminder for that date.',
          'Never take payment by wire transfer, gift card or cryptocurrency: the FTC says these work like cash and are usually very hard to get back. Payment apps are not much safer with someone you have not met, and the FTC explains how to act fast if something goes wrong.',
        ],
      },
      {
        heading: 'Should you sublet to someone you have not met?',
        paragraphs: [
          'Not yet. Meet the person, in person if they are in town and on a live video call if they are not. Ask for a reference you can actually call, and see if your roommates would be fine living with them. The same screening that works on a stranger works on a friend of a friend, so do it for both.',
          "The university's Dean of Students office puts one rule bluntly: never send money before seeing the property in person. It is written for renters, and the flip side is just as true. Do not hand over keys to a person you have not met, and do not accept a deposit from someone who cannot show who they are.",
          "If a stranger offers to pay the full semester up front by a cashier's check or a wire, stop. The FTC lists wire transfers, gift cards and cryptocurrency as major scam signals. On Wroomly, students who sign in with their umich Google account carry a blue check. That tells you a university Google login was used, and nothing more, so you still meet them and still put it in writing.",
        ],
      },
      {
        heading: 'What should you leave, lock up or take with you?',
        paragraphs: [
          'Decide what stays before you list, and put it in the listing. A furnished room rents faster, but anything you leave is something you are trusting a stranger with.',
        ],
        bullets: [
          'Take with you: passport and documents, anything you would be upset to lose, and anything with sentimental value.',
          "Lock up or store: valuables, a bike, and anything too bulky to carry. A locked closet, a roommate's offer to hold something, or a storage unit all work, as long as the subletter knows what is off limits.",
          'Leave in the room: the bed, desk and basic furniture, and kitchen items you are fine sharing.',
          'Photograph first: take timestamped photos of every wall, appliance and piece of furniture before the subletter arrives.',
        ],
      },
      {
        heading: 'What about the deposit and the shared stuff?',
        paragraphs: [
          'Check your renters insurance policy for what it covers when someone else lives in your room. Some policies treat a subletter differently, so ask your insurer, and ask whether the subletter should have their own policy.',
          'Write a short list of the shared stuff: wifi password, trash and recycling days, how the heat works and who pays for what. It saves ten messages a week. Winter is the hard part, so tell the subletter whose job it is to clear the sidewalk and where to park overnight.',
          'The security deposit is the piece people forget until the end. Your landlord holds the deposit on the lease, and that usually does not change because you sublet. Decide with your subletter whether they pay you a separate deposit, how big it is, and what it covers, and write it into the sublease. The photos you took before they arrived are what settle the question on return day.',
        ],
      },
      {
        heading: 'How do you hand the place back when you return?',
        paragraphs: [
          'Plan the handover as carefully as you planned the start. Two weeks before you land, confirm the move-out date with your subletter, and agree on where the keys go and when. If your flight is delayed, a roommate can take them.',
          'On return day, walk the room together with the photos you took before you left. Check the walls, floors, appliances and furniture, note anything new, and settle the deposit while you are both standing there. Then tell the landlord the sublet is over and send them a short note so the record is clean.',
          'If the subletter wants to stay on, that is a new conversation with the landlord, not a favor you can grant. Do not agree to extend until the landlord has said yes in writing.',
        ],
      },
      {
        heading: 'Where should you start today?',
        paragraphs: [
          "Open your lease, find the subletting clause, and email your landlord asking for their sublet process. Then message your roommates your dates. Once you have those two answers, list your place free or browse who else is looking right now, and use the table above to keep every task in someone's hands. Wroomly is independent and not affiliated with the University of Michigan.",
        ],
      },
    ],
    faqs: [
      {
        question: 'Can I sublet my apartment while studying abroad?',
        answer:
          'Usually, if your lease and your landlord allow it. Most Ann Arbor leases allow subletting with written landlord approval, some charge a small re-let fee, and a few prohibit it outright. Read your lease, ask your landlord for their sublet process, and tell your roommates your dates before you list.',
      },
      {
        question: 'Do I stay responsible for the lease while I am away?',
        answer:
          'Commonly, yes. Many leases keep the original tenant on the hook for rent and damage even when a subletter lives there, so the landlord still looks to you. Check what your lease says, ask your landlord to confirm in writing, and ask a lawyer if the stakes are high.',
      },
      {
        question: 'Who should I leave in charge of my sublet while I am abroad?',
        answer:
          'Nobody takes charge alone. You stay reachable, roommates spot problems first, the landlord handles repairs and notices, and the subletter pays on time and reports damage promptly. Write the plan in one message all four can see, with the leasing office contact and your time zone in it.',
      },
      {
        question: 'Should I sublet to someone I have not met?',
        answer:
          'Not before you meet them, in person or on a live video call. Ask for a reference you can call, check that your roommates are fine with them, and never take payment by wire, gift card or cryptocurrency. Put the dates, rent and deposit in a written sublease first.',
      },
    ],
    links: [
      { label: 'Winter semester sublets', href: '/guides/winter-semester-sublets-ann-arbor' },
      { label: 'How to sublet at U-M', href: '/guides/how-to-sublet-your-apartment-at-university-of-michigan' },
      { label: 'Avoiding sublet scams', href: '/guides/how-to-avoid-sublet-scams-ann-arbor' },
      { label: 'Security deposits on sublets', href: '/guides/security-deposits-ann-arbor-sublets' },
      { label: 'List your place free', href: '/list-place' },
      { label: 'Browse current sublets', href: '/listings' },
      { label: 'Dean of Students on finding housing and subleases', href: 'https://deanofstudents.umich.edu/student-programs/beyond-the-diag/finding-housing-roommates/' },
      { label: 'FTC guide to rental listing scams', href: 'https://consumer.ftc.gov/articles/rental-listing-scams' },
      { label: 'FTC advice on payment app scams', href: 'https://consumer.ftc.gov/articles/mobile-payment-apps-how-avoid-scam-when-you-use-one' },
    ],
  },
  {
    slug: 'do-you-need-a-car-umich-off-campus',
    title: 'Do you need a car if you live off campus at UMich?',
    seoTitle: 'Do You Need a Car Living Off Campus at UMich?',
    description:
      'Do you need a car living off campus at UMich? Five yes or no questions about your week land on no car, car share or own a car, plus what to ask about parking.',
    excerpt:
      'A UMich week runs on buses, feet and bikes more often than you would guess. Answer five questions about your own week to land on no car, an occasional car share, or owning one.',
    published: '2026-11-03',
    updated: '2026-11-03',
    readingMinutes: 7,
    sections: [
      {
        heading: 'Can you get through a UMich week without a car?',
        paragraphs: [
          'Often, yes. Whether you can depends on your week, not on the neighborhood name. Campus runs its own bus system, and a student with an active U-M yellow MCard rides TheRide city buses free through the MRide program. Between feet, a bike and buses, a lot of students never park anywhere.',
          'A car earns its keep in a few places: groceries in bulk, a job or placement off the bus lines, and trips out of town. Sort your own week into those buckets before you decide, because the answer for a North Campus engineering student with a lab kit is not the answer for an LSA student a few blocks from the Diag.',
          "Wroomly is independent and not run by the university, so use the university's transit pages for current routes and rules. The links at the bottom of this guide point to them.",
        ],
      },
      {
        heading: 'Which parts of the week are hardest without one?',
        paragraphs: [
          'Three things come up again and again: groceries, anything that runs on a schedule the buses do not, and leaving town.',
          "Groceries are the big one. Students without cars shop at stores on city bus lines. A U-M student life guide to grocery shopping without a car lists Aldi off Route 31 from the Blake Transit Center, Trader Joe's off Routes 4 and 104 along Washtenaw Avenue, and Kroger in the North Campus area. The catch is carrying it all back: a full cart does not fit in one bus ride and one backpack, so plan smaller, more frequent trips.",
          'Schedules matter next. Campus routes run on their own calendar. Bursley-Baits, the Diag-to-Diag Express, the Northwood Express and the Oxford Shuttle run only in the fall and winter terms, the two express routes run on class days only, and Northwood has weekend gaps in spring and summer. If your job, practice or placement starts early or ends late, look at the bus map for those exact hours before you count on it.',
          'Leaving town is the third. Detroit Metro Airport sits outside Ann Arbor, so a flight home or a weekend away usually means a ride, a shuttle, a rental or a friend. TheRide lists an airport service page on its site; check it for what is running now.',
        ],
      },
      {
        heading: 'Five questions that decide it',
        paragraphs: [
          'Answer yes or no to each, about the semester you are actually signing a lease for. Count the yeses.',
          'This is a rule of thumb for your own planning, not a rule about any area or any kind of person.',
        ],
        bullets: [
          'Do you have a regular commitment that the buses do not reach or do not serve at that hour, such as an off campus job, a clinical or field placement, or an early or late shift?',
          'Do you need to haul gear every week, such as an instrument, lab or studio equipment, or sports kit?',
          'Would a weekly grocery trip by bus, carrying it all back, be a dealbreaker for you?',
          'Do you leave Ann Arbor by road more than about once a month?',
          'Does your front door sit well beyond a comfortable walk or bike ride from both a bus stop and a grocery store?',
        ],
        table: {
          caption: 'What your count of yes answers points to, and what to ask the landlord for each outcome',
          columns: [
            'Yes answers',
            'Where you land',
            'What it looks like',
            'Lease and parking question to ask',
          ],
          rows: [
            [
              '0',
              'No car',
              'Walk, bike and ride buses; groceries in small bus trips; rides or rentals for the occasional trip out',
              'Ask whether bike storage is secure and covered, and whether you can opt out of a parking charge if one is bundled into rent',
            ],
            [
              '1 or 2',
              'Occasional car share',
              'No car of your own; borrow or rent one for the big grocery run, a move or a trip home',
              'Ask where visitors and rental cars can park, and whether there is a guest parking limit',
            ],
            [
              '3 to 5',
              'Own a car',
              'A car parked at your place most days, used for work, gear or distance',
              'Ask whether parking is assigned, what it costs per month, whether it is in the lease or a separate agreement, and what happens in snow removal',
            ],
          ],
        },
      },
      {
        heading: 'What changes in winter?',
        paragraphs: [
          "Everything takes longer. Walking to a bus stop in snow is slower, and so is waiting for a bus. Buses run on the university and city calendars, so check service alerts on TheRide's site and the campus bus tracker rather than trusting last year's memory.",
          'Owning a car in winter has its own chores: clearing it after a storm, moving it for plows if your building asks, and finding a spot. If you do not have a car, the winter question is mostly about what you can carry and how far you walk to a stop. Look at your route in the dark and in the cold before you sign.',
        ],
      },
      {
        heading: 'What do you check about parking before you sign a lease?',
        paragraphs: [
          "Campus parking and apartment parking are two different systems. The university's parking permits cover university lots, and they are not the same thing as a space at your building. Check the university's parking pages for permits and the lease for your apartment.",
          'Leases commonly handle parking in one of a few ways: a space included in rent, an assigned space for an extra monthly charge, a first come lot with no guarantee, or street parking with city rules. Which one you have is a question for the lease and the landlord, not something to assume from the listing photos. If you are not sure what a clause means, ask the landlord or the leasing office, and check with the city or a lawyer for anything beyond what the lease says.',
        ],
        bullets: [
          'Is a parking space included in the rent, or is it an extra charge?',
          'Is the space assigned, or first come?',
          'Is parking written into the lease itself or into a separate agreement?',
          'Is there a guest or visitor spot?',
          'Who clears the lot in snow, and when do cars have to be moved?',
          'If you will not have a car, can you skip a parking charge?',
        ],
      },
      {
        heading: 'When does a car share or an occasional rental beat owning?',
        paragraphs: [
          "If your count landed on one or two yeses, a car you do not own is often the cleaner answer. The university's car sharing page says Zipcar membership is open to members of the campus community and lists vehicles in lots across the Ann Arbor campus. It does not list prices, so check the current rates before you count on it.",
          'The trade is simple. Owning means a car that is always there and a parking space that is always a cost, plus insurance and upkeep. Sharing or renting means planning ahead and paying per use, with nothing sitting unused in a lot. If you expect to need a car less than a handful of times a month, sharing usually wins on hassle. If you need one every week, owning does.',
          "Browse places near the bus lines on Wroomly's listings, filter by dates, and check each listing's parking details with the poster or the landlord before you commit.",
        ],
      },
    ],
    faqs: [
      {
        question: 'Do UMich students need a car off campus?',
        answer:
          'Many do not. Campus buses, city buses, walking and biking cover most daily needs near campus, and active U-M students can ride TheRide free with a yellow MCard. A car helps with bulk groceries, trips out of town, and jobs or placements off the bus lines. Count your own week before deciding.',
      },
      {
        question: 'Can I get groceries in Ann Arbor without a car?',
        answer:
          "Yes, with planning. A U-M student life guide lists Aldi, Trader Joe's and Kroger reachable by city bus, so you can shop without a car. The trade is carrying everything back, so most students shop in smaller, more frequent trips instead of one big weekly run.",
      },
      {
        question: 'Is parking included in Ann Arbor student apartments?',
        answer:
          'Sometimes. Leases commonly include a space in rent, charge extra for an assigned space, offer a first come lot, or leave you to street parking. It varies by building, so ask the landlord what the lease says about parking, what it costs, and whether you can decline it.',
      },
      {
        question: 'How do I get to the airport without a car?',
        answer:
          "Detroit Metro Airport sits outside Ann Arbor, so plan a shuttle, a ride, a rental or a lift from a friend. TheRide's website lists an airport service page, so check it for what is currently running before you book a flight home.",
      },
    ],
    links: [
      { label: 'Best neighborhoods for UMich students', href: '/guides/best-neighborhoods-for-umich-students' },
      { label: 'First apartment checklist', href: '/guides/first-apartment-checklist-ann-arbor' },
      { label: 'Central Campus places', href: '/ann-arbor/central-campus' },
      { label: 'Browse places near campus', href: '/listings' },
      { label: 'U-M campus bus routes and schedules', href: 'https://ltp.umich.edu/campus-transit/routes-and-schedules/' },
      { label: 'U-M MRide free city bus rides', href: 'https://ltp.umich.edu/transportation-alternatives/mride/' },
      { label: 'TheRide Ann Arbor bus system', href: 'https://www.theride.org/' },
    ],
  },
  {
    slug: 'off-campus-housing-near-north-campus-umich',
    title: 'Living near North Campus, and how to choose where to rent',
    seoTitle: 'Off Campus Housing Near North Campus',
    description:
      'Choosing off campus housing near North Campus? Pick by commute mode first: walk, campus bus or car. A decision table, bus facts, parking checks and when to look.',
    excerpt:
      'Pick North Campus housing by how you will get to class or lab first, then by lease length. A decision table, the campus bus facts and what to check before you sign.',
    published: '2026-11-04',
    updated: '2026-11-04',
    readingMinutes: 7,
    sections: [
      {
        heading: 'Who is better off living near North Campus than Central?',
        paragraphs: [
          'Start with where your classes or lab are, not with the listing photos. North Campus is where Engineering, Music, Theatre & Dance, and Art & Design have their buildings, so a schedule built around those buildings is the clearest reason to look up there instead of near Central.',
          'If your week splits between both campuses, the choice gets less obvious. Living near one means a bus or a long bike ride to the other, every day you have class there. Write down which days you are on North and which on Central before you compare a single apartment.',
          "Wroomly's North Campus page covers the area's basics and the sublets posted there right now. This guide is the decision layer: how to pick a spot by how you will get to class, what to check before you sign, and when to look.",
        ],
      },
      {
        heading: 'How do walking, the bus and driving change where you should look?',
        paragraphs: [
          'Pick your commute mode first, then let it set your search area. The three modes below lead to different places, different checks and different questions for the landlord.',
          'This is a rule of thumb for your own planning, not a statement about any area or any kind of person.',
        ],
        table: {
          caption:
            'Decision rule: commute mode, where to look, what to check, and what to ask the landlord',
          columns: [
            'Commute mode',
            'Where to look',
            'What to check',
            'Ask the landlord',
          ],
          rows: [
            [
              'Walk or bike',
              "Close enough to your building that you would do it in rain and snow. Measure the route on a map, not the listing's description.",
              'The actual route in the dark and after snow. Where you can lock a bike. Whether the walk crosses a road with no crosswalk.',
              'Is bike storage covered and secure? Is the path plowed or salted, and by whom?',
            ],
            [
              'Campus bus',
              'Near a stop on the route that reaches your building, with the stop a short walk from the door. Compare Bursley-Baits, Northwood and Commuter North, which serve different parts of North Campus.',
              'Which terms and hours the route runs, how far you walk to the stop, and the last bus time for your latest class or lab.',
              'Is there a stop at the complex or a short walk away? Does any bus route change in summer?',
            ],
            [
              'Drive',
              'A place with parking that is part of the deal, not an afterthought. Then check the campus lot you would use.',
              'Campus permits and apartment parking are separate. Which permit type you are eligible for, and where it is valid.',
              'Is parking included, assigned, or first come? Is it in the lease or a separate agreement? Who clears the lot in snow?',
            ],
          ],
        },
      },
      {
        heading: 'What do the buses actually do for a North Campus renter?',
        paragraphs: [
          "The university runs its own buses between North and Central Campus, and its rider guide says they are open and free to the general public with no ID required. Routes, hours and terms change, so read the route page for the semester you are signing for rather than trusting last year's memory.",
          "Here is what the university's route pages show for the routes that serve North Campus. Bursley-Baits links the Central Campus Transit Center with Bursley Hall and Vera Baits Houses. It runs every day in the fall and winter terms only, and on weekdays it starts in the early morning and runs until the small hours, with buses more frequent in the daytime than late at night. Northwood serves the Northwood housing areas and runs every day all year except university holidays, with weekend gaps in spring and summer. In fall and winter on weekdays, the route page lists a first bus before 7 am and the most frequent service through the daytime and evening.",
          'Commuter North runs from Crisler Center to Glazier Way, connecting South, Central and Medical Campus with North Campus. The route page lists a first weekday departure early in the morning, the most frequent service through the day, and less frequent service in the evening and overnight. Northwood Express runs weekdays only, on class days in fall and winter, with a limited schedule.',
          'Two practical limits are worth knowing. Bicycles are not allowed on any university bus, so a bike commute cannot be switched to a bus ride halfway through. And the bus tracking app, Magic Bus, shows real-time arrivals, though the Bursley-Baits page says that route cannot currently be tracked there.',
          'The city system, TheRide, is separate from the campus buses and has its own fares and trip planner. Check its site for the route you would use.',
        ],
      },
      {
        heading: 'What does housing near North Campus cost right now?',
        paragraphs: [
          "Compare per listing, not per neighborhood. Wroomly's live rent page did not have a North Campus row in its median rent by neighborhood table on 2026-11-04, so there is no North Campus median to quote, and this guide does not make one up.",
          'For a reference point, the same table shows Central Campus at a median asking rent of $1,600/mo across 23 active listings, per the live rent page at /guides/ann-arbor-rent-prices, read on 2026-11-04. That is a comparison anchor, not a North Campus price. Open the live rent page for current figures and the neighborhoods that are listed.',
          "On housing type, Wroomly's neighborhood page describes North Campus housing as mostly apartment complexes and newer builds, anchored by the Northwood and Bursley areas. When you compare two places, compare what rent includes: parking, utilities, furniture and lease length move the monthly number more than the zip code does.",
        ],
      },
      {
        heading: 'What should you check about parking, buses and winter?',
        paragraphs: [
          "Parking comes in two systems. University permits cover university lots, and your apartment's parking is a separate matter handled in the lease. The university's permit page lists student permit types: Student Orange is for juniors, seniors and graduate students and is valid in the North Campus lots, and Student Yellow is valid in Orange or Yellow lots on North, Central and other campuses with some exceptions. Student Storage is open to all students on a first come, first served basis. Permits are bought online and linked to a license plate. The page does not list prices, so check the university's annual costs page before you count on one.",
          "Winter changes the math. During fall and winter terms, many campus and residence hall routes run until 2 or 3 am, according to the university's rider guide, and SafeRide runs from 8 pm to 2 am on class days with a valid MCard. That helps late nights. It does not shorten the walk from your door to the stop, so walk the exact route before you sign, in the dark if you can.",
        ],
        bullets: [
          'How far is the nearest bus stop from the front door, and which route stops there?',
          'What time does the last bus run on the days you have class or lab?',
          'Is a parking space included in rent, and if not, what does it cost per month?',
          'Which campus permit type would you be eligible for, and is it valid in the lot you would use?',
          'Who plows and salts the walkways, and how soon after a storm?',
          'Where does the bike go, and is it covered?',
        ],
      },
      {
        heading: 'When should you look, and is a sublet a good way to try North Campus?',
        paragraphs: [
          "Ann Arbor leases for the following fall start signing in the fall, so the time to look for next year is now. Wroomly's housing timeline guide walks through the calendar month by month. If you are not sure the area suits your commute, a shorter stay lets you find out for one term before you commit to twelve months.",
          "A sublet is the cleanest trial. You ride the actual bus at your actual class times, check the real winter walk, and learn whether you miss the density of Central Campus. Winter semester and summer sublets post as people leave for internships, co-ops and study abroad. Read the sublet's terms, ask the landlord whether approval is needed, and send any question about what a lease clause means to the landlord, the city or a lawyer.",
        ],
      },
      {
        heading: 'What are the common trade-offs?',
        paragraphs: [
          'No option wins on everything. These are the trade-offs that come up most often when a renter weighs a place near North Campus against one near Central.',
        ],
        bullets: [
          'A short walk to class versus a bus ride to Central for anything outside North Campus.',
          'Parking that comes with the place versus a place without parking that you will not need if you ride the bus.',
          'A longer lease that locks in a spot versus a short term sublet that lets you test the commute.',
          'A lower rent that comes with a longer commute versus a higher rent for a place that is closer.',
          'Bus schedules that stop in the summer versus a year-round route.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is it better to live near North Campus or Central Campus?',
        answer:
          'It depends on where your classes or lab are. North Campus holds Engineering, Music, Theatre & Dance, and Art & Design, so living near it cuts that commute. If your week splits between campuses, compare the bus times for both before you choose, and consider a short sublet first.',
      },
      {
        question: 'Can you get between North Campus and Central Campus without a car?',
        answer:
          'Yes. The university runs buses between the two campuses, including Bursley-Baits, Northwood and Commuter North. Its rider guide says they are open and free with no ID required. Routes, terms and hours change by semester, so check the route page for the term you are signing for.',
      },
      {
        question: 'Is housing cheaper near North Campus?',
        answer:
          'Its table had no North Campus median, so there is no North Campus figure to quote. The live rent page at /guides/ann-arbor-rent-prices, read on 2026-11-04, showed Central Campus at a $1,600 median asking rent across 23 listings. Compare individual listings, including parking, utilities and lease length, rather than assuming either area is cheaper.',
      },
      {
        question: 'Are there summer sublets near North Campus?',
        answer:
          "Sometimes. Summer sublets post as people leave for internships, co-ops and study abroad, usually from late winter into spring. Wroomly's North Campus page shows what is listed now. Note that Bursley-Baits runs only in fall and winter, and Northwood has weekend gaps in summer.",
      },
    ],
    links: [
      { label: 'North Campus sublets and housing on Wroomly', href: '/ann-arbor/north-campus' },
      { label: 'Do you need a car if you live off campus at UMich?', href: '/guides/do-you-need-a-car-umich-off-campus' },
      { label: 'UMich off-campus housing timeline', href: '/guides/umich-off-campus-housing-timeline' },
      { label: 'Live Ann Arbor rent prices', href: '/guides/ann-arbor-rent-prices' },
      { label: 'Best neighborhoods for UMich students', href: '/guides/best-neighborhoods-for-umich-students' },
      { label: 'Grad student housing in Ann Arbor', href: '/guides/grad-student-housing-ann-arbor' },
      { label: 'Browse places near campus', href: '/listings' },
      { label: 'U-M campus bus routes and schedules', href: 'https://ltp.umich.edu/campus-transit/routes-and-schedules/' },
      { label: 'U-M student permit parking', href: 'https://ltp.umich.edu/parking/permit-parking/' },
      { label: 'TheRide Ann Arbor bus fares', href: 'https://www.theride.org/fares-passes/fares' },
    ],
  },
  {
    slug: 'sublet-your-room-with-roommates-staying',
    title: 'How to sublet your room when your roommates are staying',
    seoTitle: 'How to Sublet Your Room With Roommates',
    description:
      'Subletting your room while roommates stay is a household decision. Check your lease, agree on money and house rules, then list. Includes a roommate agreement checklist.',
    excerpt:
      'Your roommates will live with whoever takes your room. Here is the order that works: lease and landlord first, roommates second, a fair pick, and a written checklist before move in.',
    published: '2026-11-04',
    updated: '2026-11-04',
    readingMinutes: 6,
    sections: [
      {
        heading: 'What do your lease and your landlord say about subletting a room?',
        paragraphs: [
          'Start with the paper, not the roommates. Pull up your lease and look for the subletting or assignment clause, then ask your landlord or the leasing office how they handle a sublet of one room in a shared unit. Some leases need written approval, some charge a re-let fee, and a few prohibit subletting outright.',
          'Roommates are a separate question from the landlord. Whether your roommates have a formal say depends on how the lease is written, so read it and ask. If you are not sure what a clause means, ask the landlord, and talk to a lawyer for anything beyond that. Wroomly does not give legal advice, and nothing in this guide tells you what your lease means.',
          'Michigan has a state law on rental agreements, the Truth in Renting Act. It is linked at the bottom as a reference. Read it yourself or ask someone qualified, because a summary here would not be safe to lean on.',
          'Whatever the answers are, get them in writing before you list. An email from the landlord is better than a memory of a hallway chat.',
        ],
      },
      {
        heading: 'How do you bring your roommates in before you list?',
        paragraphs: [
          'Treat it as a household decision, because it is one. Your roommates will share a kitchen, a bathroom and a thermostat with whoever takes your room. Tell them first, before the listing goes up and before anyone has toured.',
          "The U-M Dean of Students page on finding housing and roommates tells students to get the landlord and roommates to agree to a sublease in writing, and to never rely on a handshake. It also points to a sublease contract template on the university's off campus housing site. Wroomly is independent and not run by the university, so use that page for the current template.",
          'In that first conversation, cover four things: your dates, what you plan to charge, how you want to pick someone, and what is a dealbreaker for them. Ask what they want. Do not announce what you decided.',
        ],
      },
      {
        heading: 'How do you split rent, utilities and the deposit with a subletter?',
        paragraphs: [
          'Decide the split before you meet anyone, so there are no surprises later. Your rent is a number you know. What the subletter pays is a separate number, and the how to price your sublet guide walks through setting it. Rent figures change week to week, so check the live Ann Arbor rent page rather than a number from a blog.',
          "Utilities are where roommate sublets go sideways. List every shared bill: electric, gas, water, internet, trash. For each one, decide whether it is split evenly, included in the subletter's rent, or billed by actual use, and who is the name on the account. Tell prospective subletters which bills are on top of rent so they can budget.",
          'The deposit has two layers. Your landlord may hold a deposit in your name already, and you may want a separate deposit from your subletter to cover damage or a missed payment. Write down the amount, who holds it and when it goes back. Put payments through a trackable method and never send money before seeing the room, as the how to pay for a sublet safely guide explains.',
          'Remember that you commonly stay on the lease. If the subletter stops paying, your name is still the one the landlord knows, so ask your landlord what their process is and put your plan for that in writing too.',
        ],
      },
      {
        heading: 'How do you choose a subletter fairly with your roommates?',
        paragraphs: [
          'Pick by the things that affect the household: dates, rent, references and house rules. Agree on that short list with your roommates before you read a single message, and use the same list for every candidate.',
          'Keep it fair: never choose, screen or turn someone down based on race, religion, sex, family status, disability, national origin or any other protected class. Do not word a listing that way either. If a question is not about dates, money, references or house rules, leave it out.',
          'A good process is simple. Ask each candidate for their dates and a reference, hold a short video call or meet in public, and then let your roommates meet the top choice before you commit. Your roommates can say they are comfortable or not, and they can raise house rule concerns. Ask your landlord whether they run their own approval on top of yours.',
          'Verified UMich students on Wroomly carry a blue check, which shows a student verified with their university email. It is a trust signal and not a guarantee, so still check references and see the place in person.',
        ],
      },
      {
        heading: 'What goes in writing before move in?',
        paragraphs: [
          'Write it down while everyone is still friendly. A one page roommate agreement with the subletter, signed by you and your roommates, beats a group chat nobody can find in March. Use the checklist below as a starting point and adjust it to your house.',
          "This checklist is a planning aid and not a legal form. For the sublease itself, use the landlord's form or the university's template, and read your own lease.",
          'List your room free on Wroomly once your roommates and landlord are on board.',
        ],
        table: {
          caption:
            'Roommate agreement checklist for a room sublet',
          columns: [
            'Topic',
            'What to decide',
            'Write down',
          ],
          rows: [
            [
              'Shared cost split',
              'Which bills are shared, who holds each account, how the subletter pays their part',
              'Each bill, the split, the due date and the payment method',
            ],
            [
              'House rules',
              'Guests, quiet hours, cleaning, kitchen use, smoking, pets, parking',
              'The rules your household already follows, in plain words',
            ],
            [
              'Keys',
              'How many keys or fobs, who hands them over, what happens if one is lost',
              'Number of keys and who is responsible for each',
            ],
            [
              'Who the subletter contacts',
              'Who they message about rent, repairs, the landlord and house issues',
              "One named person for money, one for the house, and the landlord's contact",
            ],
            [
              'Move out walkthrough',
              'Condition of the room at move in and move out, who walks through, when',
              'Dated photos at both ends and the day of the walkthrough',
            ],
          ],
        },
      },
    ],
    faqs: [
      {
        question: 'Do my roommates have to agree to my sublet?',
        answer:
          'It depends on your lease and your landlord, so read the lease and ask the landlord. Even where roommates have no formal say, they share the home with your subletter, so tell them first. The U-M Dean of Students page suggests getting landlord and roommate agreement in writing.',
      },
      {
        question: 'Who pays utilities when I sublet my room?',
        answer:
          'Decide it with your roommates before you list. For each shared bill, choose whether the subletter pays an even share, a flat amount included in rent, or actual use, and who holds the account. Tell candidates which bills come on top of rent so they can budget.',
      },
      {
        question: 'Can my roommates help pick my subletter?',
        answer:
          'Yes, and it usually goes better when they do. Agree on a short list first: dates, rent, references and house rules. Use it for every candidate, then let your roommates meet the top choice. Never choose anyone based on a protected class such as race, religion, sex or disability.',
      },
      {
        question: 'What if my subletter stops paying?',
        answer:
          'You commonly remain the tenant the landlord knows, so ask your landlord what their process is before it happens. Keep a written agreement with the subletter, track every payment, and hold a deposit if you agreed to one. For anything about your rights, ask a lawyer.',
      },
    ],
    links: [
      { label: 'How to sublet your apartment at UMich', href: '/guides/how-to-sublet-your-apartment-at-university-of-michigan' },
      { label: 'How to price your sublet', href: '/guides/how-to-price-your-sublet' },
      { label: 'Sublet vs relet vs lease takeover', href: '/guides/sublet-vs-relet-lease-takeover' },
      { label: 'Roommate agreement checklist', href: '/guides/roommate-agreement-checklist-off-campus' },
      { label: 'How to pay for a sublet safely', href: '/guides/how-to-pay-for-a-sublet-safely' },
      { label: 'List your room free', href: '/list-place' },
      { label: 'U-M Dean of Students: finding housing and roommates', href: 'https://deanofstudents.umich.edu/student-programs/beyond-the-diag/finding-housing-roommates/' },
      { label: 'Michigan Truth in Renting Act (reference)', href: 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-Act-454-of-1978' },
    ],
  },
  {
    slug: 'cost-of-living-ann-arbor-student',
    title: 'What it costs to live in Ann Arbor as a UMich student, line by line',
    seoTitle: 'Cost of Living in Ann Arbor as a Student',
    description:
      'What does it cost to live in Ann Arbor as a student? Build a monthly budget from live median asking rents, then fill in every other line yourself with a source beside it.',
    excerpt:
      'Rent is the one line you can price today. Start from live median asking rents, then fill in utilities, food, transport and the costs students forget, each with a source.',
    published: '2026-11-04',
    updated: '2026-11-04',
    readingMinutes: 5,
    sections: [
      {
        heading: 'What does rent cost right now?',
        paragraphs: [
          "Rent is the biggest line and the only one with a live number behind it. Wroomly publishes median asking rents for active sublets, and they move, so read them on the day you budget. These were read on 2026-11-04 from Wroomly's own rent page, which covered 152 active listings that day.",
          'A median asking rent is the price on the listing for the whole place, not your share of it. If the place has three bedrooms and three people, you will divide it yourself.',
        ],
        bullets: [
          'Studio: $1,450 median asking rent, 9 active listings (Wroomly rent page, read 2026-11-04).',
          '1 bedroom: $1,500 median asking rent, 55 active listings (Wroomly rent page, read 2026-11-04).',
          '2 bedrooms: $2,000 median asking rent, 31 active listings (Wroomly rent page, read 2026-11-04).',
          '3 bedrooms: $3,000 median asking rent, 24 active listings (Wroomly rent page, read 2026-11-04).',
          '4+ bedrooms: $4,250 median asking rent, 30 active listings (Wroomly rent page, read 2026-11-04).',
          'Furnished: $1,900 median asking rent, 82 active listings (Wroomly rent page, read 2026-11-04).',
          'Unfurnished: $1,817 median asking rent, 70 active listings (Wroomly rent page, read 2026-11-04).',
        ],
      },
      {
        heading: 'What else belongs in a monthly student budget?',
        paragraphs: [
          'Rent is the start, not the total. The university describes cost of attendance as a set of estimated student budgets: tuition and fees, living expenses for housing and food, books and course materials, transportation, and miscellaneous personal expenses such as phone bills and student insurance. Use those same categories as the skeleton of your own sheet.',
          "Every category below is one you fill in yourself, because the right number depends on your lease, your kitchen and your week. This guide prints no figure for them. Open the university's cost of attendance page to compare your totals against its categories, and treat its estimates as a yardstick, not as your bill.",
        ],
        bullets: [
          'Utilities: electric, heat, water and trash, if the lease does not cover them.',
          'Internet and phone.',
          'Groceries and eating out.',
          'Transportation: buses, a bike, a car share, or a car.',
          'Books, supplies and course materials.',
          'Renters insurance.',
        ],
      },
      {
        heading: 'How does a sublet or a shared room change the total?',
        paragraphs: [
          'Three things change: the divisor, the length, and what is included.',
          'The divisor first. Take the median for your bedroom count and divide it by the people on the lease, then check the listing to see if rooms are priced separately. The listing, not the median, is what you will actually pay.',
          'Length next. A sublet runs for the months the poster is away, often shorter than a twelve month lease, so multiply by the months you hold the place, not by twelve. A furnished sublet also saves the one time cost of buying a desk and a bed.',
          "Then what is included. Some sublets bundle utilities or internet into rent, others do not. Ask, and write the answer in your sheet beside the line it replaces. Wroomly's guide on how to price a sublet covers how posters decide what to include.",
        ],
      },
      {
        heading: 'Which costs do students forget?',
        paragraphs: [
          'The ones that do not arrive monthly. Put them in the sheet anyway and divide by the months you will live there.',
        ],
        bullets: [
          'The security deposit and any move in fees, which come before the first month feels like a month.',
          'Furniture and kitchen basics for an unfurnished place.',
          'Winter heat, if it is not in the rent. Ask the landlord for a typical winter bill.',
          'Renters insurance, which some landlords ask for.',
          'Parking, if you bring a car, and whether it is in the lease or a separate agreement.',
          'Trips home, and the move out at the end of the lease.',
        ],
      },
      {
        heading: 'How do you build your own budget?',
        paragraphs: [
          'Copy the table below into a spreadsheet. The housing lines already carry a figure and a source. Every other line is blank on purpose: type your number, and type where it came from in the last column. A line with no source is a guess, so either find one or mark it as a guess.',
          "Then do the sum in three passes. First, rent for the place you are actually looking at, divided by the people on the lease. Second, the monthly lines you filled in. Third, the one time costs, spread across the months you will stay. Compare the result with the university's cost of attendance categories, and adjust the lines that look off.",
        ],
        table: {
          caption:
            'A worked monthly budget with a source on every line. Housing lines are read from the live rent page, every other line is yours to fill in.',
          columns: [
            'Line',
            'Amount',
            'Source and date',
          ],
          rows: [
            [
              'Studio rent',
              '$1,450 median asking rent (9 active listings)',
              'Wroomly rent page, read 2026-11-04, 152 active listings overall',
            ],
            [
              '1 bedroom rent',
              '$1,500 median asking rent (55 active listings)',
              'Wroomly rent page, read 2026-11-04, 152 active listings overall',
            ],
            [
              '2 bedroom rent',
              '$2,000 median asking rent (31 active listings)',
              'Wroomly rent page, read 2026-11-04, 152 active listings overall',
            ],
            [
              '3 bedroom rent',
              '$3,000 median asking rent (24 active listings)',
              'Wroomly rent page, read 2026-11-04, 152 active listings overall',
            ],
            [
              '4+ bedroom rent',
              '$4,250 median asking rent (30 active listings)',
              'Wroomly rent page, read 2026-11-04, 152 active listings overall',
            ],
            [
              'Furnished place',
              '$1,900 median asking rent (82 active listings)',
              'Wroomly rent page, read 2026-11-04, 152 active listings overall',
            ],
            [
              'Unfurnished place',
              '$1,817 median asking rent (70 active listings)',
              'Wroomly rent page, read 2026-11-04, 152 active listings overall',
            ],
            [
              'Your share of rent',
              'Fill in: the median for your bedroom count, divided by the people on the lease',
              'Your own division, plus what the listing says',
            ],
            [
              'Utilities (electric, heat, water, trash)',
              'Fill in',
              'Ask the landlord what the lease includes and for a typical winter bill',
            ],
            [
              'Internet',
              'Fill in',
              "The provider's current price for your address",
            ],
            [
              'Groceries and eating out',
              'Fill in',
              'Your own receipts for a few weeks',
            ],
            [
              'Transportation',
              'Fill in',
              'TheRide fares page or the MRide page if you hold a yellow MCard',
            ],
            [
              'Books, supplies and course materials',
              'Fill in',
              "Your syllabi and the university's cost of attendance page",
            ],
            [
              'Phone and personal costs',
              'Fill in',
              'Your own bills',
            ],
            [
              'Renters insurance',
              'Fill in',
              'A quote from the insurer you pick',
            ],
            [
              'One time costs (deposit, move in, furniture)',
              'Fill in',
              'Your lease and the listing',
            ],
          ],
        },
      },
      {
        heading: 'Where do you compare places once the budget is set?',
        paragraphs: [
          "Once you have a ceiling per month, filter by it. Browse current sublets on Wroomly's listings, check each one against your sheet, and look at neighborhood pages for walk time and transit before you decide that a cheaper place is cheaper overall. Verified UMich students carry a blue check on Wroomly, which shows a verified student and nothing more, so check every listing as you would any other.",
        ],
      },
    ],
    faqs: [
      {
        question: 'How much does it cost to live in Ann Arbor as a student each month?',
        answer:
          "It depends on your share of rent and what the lease includes. Read the current median asking rent for your bedroom count from Wroomly's live rent page, divide it by the people on your lease, then add utilities, food, transport and personal costs from your own bills.",
      },
      {
        question: 'Is Ann Arbor expensive for students?',
        answer:
          "Rent is the line that decides it, and it moves with bedroom count and furnishing. Check Wroomly's live rent page on the day you budget, compare a shared room with a whole place, and then price the non rent lines yourself so the total is built from your own week.",
      },
      {
        question: 'Are utilities included in Ann Arbor rent?',
        answer:
          'Sometimes. Some leases and sublets bundle utilities or internet into rent and others do not. The lease and the listing say which, so ask the landlord or poster, and ask for a typical winter bill if heat is not included.',
      },
      {
        question: 'How can you lower your living costs near UMich?',
        answer:
          "Share a place and split rent, compare a furnished sublet with buying furniture, and check the bus options before paying for a car. Active U-M students with a yellow MCard ride TheRide city buses free through MRide, according to the university's transportation page.",
      },
    ],
    links: [
      { label: 'Ann Arbor rent prices, live data', href: '/guides/ann-arbor-rent-prices' },
      { label: 'How to price your sublet', href: '/guides/how-to-price-your-sublet' },
      { label: 'Best neighborhoods for UMich students', href: '/guides/best-neighborhoods-for-umich-students' },
      { label: 'Browse places near campus', href: '/listings' },
      { label: 'U-M Office of Financial Aid cost of attendance', href: 'https://finaid.umich.edu/cost-of-attendance/' },
      { label: 'U-M MRide free city bus rides', href: 'https://ltp.umich.edu/transportation-alternatives/mride/' },
      { label: 'TheRide Ann Arbor fares', href: 'https://www.theride.org/fares-passes/fares' },
    ],
  },
  {
    slug: 'fall-semester-sublet-ann-arbor',
    title: 'Can you sublet for just the fall semester at UMich?',
    seoTitle: 'Fall Semester Sublet in Ann Arbor at UMich',
    description:
      'Fall only sublets in Ann Arbor exist but are scarce. Who lists September to December places, when they post, what to try if none fits, and how to stay safe.',
    excerpt:
      'A fall only sublet in Ann Arbor is possible but rare. Here is who lists a September to December place, when it appears, and the fallbacks if none fits.',
    published: '2026-11-04',
    updated: '2026-11-04',
    readingMinutes: 5,
    sections: [
      {
        heading: 'Can you get a fall only sublet in Ann Arbor?',
        paragraphs: [
          "Yes, but they are scarce. Fall only places exist, and they come from a handful of students, not a flood of listings. Ann Arbor's market is built around August move-ins and year long leases, so a place that opens for just September to December is the exception. Plan for patience, more than one channel and a backup.",
          "The numbers on Wroomly show the shape of it. Among the 151 current listings with usable dates, 114 open in August, 17 in July, 3 in October, 2 in September, 2 in November and 1 in December, and the median advertised term is 12 months, per Wroomly's live rent data guide (/guides/ann-arbor-rent-prices) at the time of writing. Those are move in months, not term lengths, so not every September start ends in December. Still, the start of fall is thin.",
        ],
      },
      {
        heading: 'Who lists a place for just September to December?',
        paragraphs: [
          'Fall only places open up when someone with a lease is away for the semester. That is a short list of people, and knowing who they are tells you where to ask.',
          'Here is who lists a fall only place, when they usually post, and where to look for each:',
        ],
        table: {
          caption:
            'Who lists a fall only sublet in Ann Arbor, when they usually post, and where to look',
          columns: [
            'Who lists',
            'Why the place opens up',
            'When they usually post',
            'Where to look',
          ],
          rows: [
            [
              'Students on a fall study abroad term',
              'They hold a lease but are away until winter',
              'Late spring or summer, once the program is confirmed',
              'Program and department lists, classmates, a saved search on Wroomly',
            ],
            [
              'Students on a fall co-op or internship',
              'The placement is somewhere else for the semester',
              'Summer, once the placement is locked in',
              'Co-op and internship groups, word of mouth, a saved search',
            ],
            [
              'Landlords and property managers with a gap',
              'A unit sits empty between longer leases',
              'Whenever the gap appears, so ask early',
              'The leasing office, asked directly',
            ],
            [
              'Anyone whose plans changed after signing',
              'A plan fell through or a job started',
              'Any time, often close to move in',
              'A saved search and the Facebook housing groups',
            ],
          ],
        },
      },
      {
        heading: 'When do fall only sublets appear?',
        paragraphs: [
          'Later than you want. Fall only places tend to show up once summer starts, when co-op and study abroad plans are confirmed, and the stragglers come right up to move in. Winter sublets are a different wave: they post mostly in November and early December.',
          'That timing is why a saved search beats refreshing. Set one on Wroomly with a September start and check it weekly from spring. Ask your program office and your friends at the same time, because the best fall only places often never get posted publicly. The university also holds housing fairs in the fall and winter semesters, which are worth a look for leads, according to the Dean of Students office.',
        ],
      },
      {
        heading: 'What are the fallbacks if none fits?',
        paragraphs: [
          'If nothing lines up with your dates, you still have moves. Work down this list:',
        ],
        bullets: [
          'Ask landlords directly for a four month term. Many listings ask for eight or twelve months, but some landlords will agree to a shorter stay if you ask',
          'Take a place that starts a bit earlier or ends a bit later, and keep the extra weeks short. Ask the landlord in writing what happens to the unused time',
          "Widen the map. Sublet asking rents run lower in some neighborhoods: among current Wroomly listings the median is $1,600 in Central Campus and $1,505 in South University, per Wroomly's live rent data guide (/guides/ann-arbor-rent-prices). Check the neighborhood pages for distance and transit",
          "Bridge with a short stay, such as a friend's couch or a short term rental, then move into a winter sublet in January",
          'Read your own lease before you hand off a longer place. Many Ann Arbor leases require written landlord approval to sublet, so ask before you list or take one',
        ],
      },
      {
        heading: 'How do you keep a fall sublet safe and in writing?',
        paragraphs: [
          'Scarcity makes people rush, and rushing is what rental scams rely on. Slow down. Scammers copy photos and descriptions from real listings, swap in their own contact details and repost them, and the Federal Trade Commission says wire transfers, gift cards and cryptocurrency work like sending cash, so the money is usually gone for good. The Dean of Students office gives the same basic rule: never send money before seeing the property in person.',
          'A blue check on Wroomly shows that a person signed in with a umich Google account at some point, and nothing more. It does not confirm the person holds the lease or that the place is as described, and Wroomly never handles payments. Keep the conversation on the platform until you trust the person, so there is a record.',
          'Before you pay anything, get these in writing:',
        ],
        bullets: [
          'The exact start and end dates, with the move out date after the last day of your term',
          'The monthly rent, the deposit and who holds it, and which utilities are included',
          "The landlord's approval of the sublet, in writing, and the approval of any roommates in the place",
          "A sublease contract, not a handshake. The university's off campus housing site offers a sublease template",
          'A payment method that leaves a record tied to the person you are paying',
        ],
      },
    ],
    faqs: [
      {
        question: 'Are fall only sublets common at UMich?',
        answer:
          "No, they are scarce. Ann Arbor's market runs on August move-ins and year long leases, and at the time of writing only 2 of 151 current Wroomly listings with usable dates open in September, per the live rent data guide. The few that appear usually come from students away for a fall study abroad term, co-op or internship.",
      },
      {
        question: 'When should you start looking for a fall sublet?',
        answer:
          'Start in spring and keep checking through summer. Fall only places tend to post once study abroad and co-op plans are confirmed, and some appear close to move in. Set a saved search with a September start date so a new post reaches you the day it appears, and ask your program office too.',
      },
      {
        question: 'Can you find a lease shorter than a year in Ann Arbor?',
        answer:
          'Sometimes. Many listings ask for an eight or twelve month lease, but some landlords will agree to about four months if you ask them directly. Ask before you assume, get the dates and rent in writing, and read the lease terms yourself or ask the landlord what they allow.',
      },
      {
        question: 'Are fall sublets priced differently from summer sublets?',
        answer:
          "Expect less room to negotiate. Wroomly's live rent data guide notes that summer sublets often price below what the same unit costs on a year long lease, because supply floods a quiet town. Fall has far fewer places, so compare the monthly rent with similar current listings and do not pay extra just because time is short.",
      },
    ],
    links: [
      { label: 'Winter semester sublets', href: '/guides/winter-semester-sublets-ann-arbor' },
      { label: 'UMich off campus housing timeline', href: '/guides/umich-off-campus-housing-timeline' },
      { label: 'Summer sublet guide', href: '/guides/summer-sublets-in-ann-arbor-student-guide' },
      { label: 'Live rent data', href: '/guides/ann-arbor-rent-prices' },
      { label: 'Avoiding sublet scams', href: '/guides/how-to-avoid-sublet-scams-ann-arbor' },
      { label: 'Browse fall dates', href: '/listings' },
      { label: 'Dean of Students guide to finding housing and roommates', href: 'https://deanofstudents.umich.edu/student-programs/beyond-the-diag/finding-housing-roommates/' },
      { label: 'FTC guide to rental listing scams', href: 'https://consumer.ftc.gov/articles/rental-listing-scams' },
    ],
  },
]

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find(g => g.slug === slug)
}
