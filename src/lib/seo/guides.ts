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
  // Optional internal links rendered after the article body — this is how
  // hub guides (neighborhoods, buildings) pass link equity to the landing
  // pages they describe.
  links?: { label: string; href: string }[]
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
  {
    slug: 'best-neighborhoods-for-umich-students',
    title: 'The best Ann Arbor neighborhoods for UMich students, compared',
    description:
      'Central Campus vs. South U vs. Kerrytown and beyond — an honest comparison of every Ann Arbor neighborhood for University of Michigan students, by walk time, vibe, and value.',
    excerpt:
      'Eleven neighborhoods, one honest comparison: where to live based on your program, budget, and how much quiet you actually want.',
    updated: '2026-07-07',
    readingMinutes: 7,
    sections: [
      {
        heading: 'Start with your campus, not the neighborhood',
        paragraphs: [
          "The single biggest housing mistake at Michigan is optimizing for the wrong campus. If you're in Engineering, Music, or Art & Design, your classes are on North Campus — living on the South U strip means a bus commute every day, in both directions, in a Michigan winter. If you're in LSA or Ross, it's the reverse.",
          'So before comparing neighborhoods, answer one question: where are your 9ams? Then pick from the neighborhoods that serve that answer.',
        ],
      },
      {
        heading: 'The walk-to-class core: Central Campus and South University',
        paragraphs: [
          "Central Campus and South University are the classic student zones — the shortest walks, the highest rents, and the fastest-moving sublets. South U adds the restaurant-and-nightlife strip and most of the luxury high-rises (Landmark, Six11, Arbor Blu, Vic Village); Central Campus proper is more older houses and mid-rises mixed with a few towers.",
          "Pick these if being fifteen minutes from bed to lecture is worth paying for. Skip them if you're sensitive to noise or price.",
        ],
      },
      {
        heading: 'The character belt: Kerrytown, Downtown, Old West Side',
        paragraphs: [
          'Kerrytown gives you the Farmers Market, brick sidewalks, and a calmer walk to class. Downtown puts you on Main Street with the best food in the city and a short walk east to campus. The Old West Side is the historic district — leafy, quiet, and popular with grad students who want Ann Arbor to feel like a town instead of a campus.',
          'These three trade a few minutes of commute for a much better place to actually live. Rents vary: downtown high-rises cost real money, while a room in a Kerrytown or Old West Side house can beat the campus core.',
        ],
      },
      {
        heading: 'The value ring: Burns Park, Water Hill, Eberwhite, Lower Town, Pittsfield',
        paragraphs: [
          "Burns Park is calm and close — a favorite of professors, families, and upperclassmen. Water Hill is artsy and more affordable, a bike ride northwest. Eberwhite is quiet mid-century residential on the west side. Lower Town sits across the river by the medical campus, handy for health-sciences programs. And Pittsfield, south of the city, is where you get real square footage, parking, and lower rent — with a car or a bus ride as the price.",
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
          'Sublet supply follows the twelve-month-lease buildings, so Central Campus, South U, and Downtown produce the most listings — especially in summer. The character and value neighborhoods list fewer places, but they linger longer and price gentler. Every Wroomly listing is posted by a verified @umich.edu student, whichever neighborhood you pick.',
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
          'Generally, prices fall as you move away from Central Campus. Water Hill, Eberwhite, and Pittsfield Township typically offer the lowest rents — Pittsfield trades walkability for space and parking, while Water Hill keeps you within biking distance. Rooms in shared houses beat high-rise studios everywhere.',
      },
      {
        question: 'Where should engineering students live at UMich?',
        answer:
          'Near North Campus, where Engineering classes actually meet — the Courtyards area and Northwood corridor are the classic picks, and Lower Town works too. Living on the South U strip means commuting by bus across town every day, which gets old fast in winter.',
      },
    ],
  },
  {
    slug: 'umich-off-campus-housing-timeline',
    title: 'The UMich off-campus housing timeline: when to look, sign, and sublet',
    description:
      "Ann Arbor's leasing calendar is famously early. Here's the month-by-month timeline for finding UMich off-campus housing — and where sublets fit when you missed the wave.",
    excerpt:
      "Ann Arbor leases sign absurdly early. The month-by-month calendar — and what to do if you've already missed the wave.",
    updated: '2026-07-07',
    readingMinutes: 5,
    sections: [
      {
        heading: 'Why Ann Arbor leases so early',
        paragraphs: [
          "Ann Arbor's off-campus market is famous for how early it moves: prime houses and high-rise units for next fall start leasing in the fall of the year before. Students sign twelve-month leases nearly a year out, often before they know their internship, co-op, or study-abroad plans. That early cycle is stressful — and it's also exactly why the sublet market exists at the scale it does.",
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
          "If it's spring and everything decent is 'leased for next year,' you haven't failed — you've just moved from the lease market to the sublet-and-relet market, and it's bigger than it looks. Every early signer whose plans changed is now looking for someone exactly like you. Transfer students, grad students arriving mid-year, and anyone with a plot twist lives on this market.",
          'The mechanics differ slightly: a sublet keeps the original tenant on the lease, while a relet (or lease takeover) replaces them entirely with the landlord\'s approval. Either way, the inventory is real apartments in the same buildings that "sold out" months earlier.',
        ],
      },
      {
        heading: 'Play the calendar, not against it',
        paragraphs: [
          "Subletting your place out? List in February or March, before the market floods in April. Looking for a place? Set a saved search early and let the email do the refreshing. And if you're signing a twelve-month lease knowing you'll be gone all summer, budget for the reality that summer sublets recover only part of your rent — that's the market-wide norm, not a failure of your listing.",
        ],
      },
    ],
    links: [
      { label: 'Summer sublet guide', href: '/guides/summer-sublets-in-ann-arbor-student-guide' },
      { label: 'Live rent data', href: '/guides/ann-arbor-rent-prices' },
      { label: 'Browse buildings', href: '/buildings' },
    ],
    faqs: [
      {
        question: 'When should I sign a lease for next year at UMich?',
        answer:
          "Ann Arbor's leasing season for the following fall starts in the fall — the most-wanted houses and buildings begin signing in September through November, nearly a year ahead. If you want a specific building or house, engage early; if you miss the wave, the sublet and relet market picks up the slack.",
      },
      {
        question: 'Is it too late to find UMich housing in the spring or summer?',
        answer:
          'No — you\'ve just shifted from the lease market to the sublet market. Students whose internship, co-op, or study-abroad plans changed are actively looking for people to take their rooms, often at below the original rent. Relets and lease takeovers also open up in "sold out" buildings.',
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
    description:
      'The difference between subletting, reletting, and a lease takeover in Ann Arbor — who stays on the lease, who holds the risk, and which fits your situation.',
    excerpt:
      "Three words everyone uses interchangeably that mean legally different things. Who's on the lease, who holds the risk, and which to pick.",
    updated: '2026-07-07',
    readingMinutes: 4,
    sections: [
      {
        heading: 'The three arrangements, defined',
        paragraphs: [
          "A sublet means the original tenant stays on the lease and rents the place to you — you pay them, they (usually) keep paying the landlord, and they remain responsible to the landlord for the unit. A relet or lease takeover (formally, a lease assignment) means you replace the original tenant on the lease entirely: the landlord approves you, and from then on you're their tenant, not the departing student's.",
          "People use all three words loosely — most 'sublets' posted in spring for the summer are true sublets, while most 'someone take my lease!' posts are relets.",
        ],
      },
      {
        heading: 'Who holds the risk',
        paragraphs: [
          "In a sublet, the original tenant carries the risk in both directions: if you trash the place, the landlord comes after them; if they stop forwarding your rent to the landlord, the eviction lands on the unit anyway. That's why written sublease agreements and traceable payments matter so much.",
          "In a relet, risk transfers cleanly to you — your name, your deposit, your relationship with the landlord. That's better for long stays, and it's why landlords usually charge a fee and vet you like any new applicant.",
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
          'Whichever route: get it in writing. A sublet needs a sublease agreement (dates, rent, deposit, utilities, condition) plus the landlord\'s written consent. A relet needs the landlord\'s assignment paperwork. On Wroomly, both sides are @umich.edu-verified students, which removes the who-am-I-dealing-with problem — the paperwork removes the rest.',
        ],
      },
    ],
    links: [
      { label: 'How to sublet your apartment', href: '/guides/how-to-sublet-your-apartment-at-university-of-michigan' },
      { label: 'Security deposits', href: '/guides/security-deposits-ann-arbor-sublets' },
      { label: 'Housing timeline', href: '/guides/umich-off-campus-housing-timeline' },
    ],
    faqs: [
      {
        question: 'What is the difference between a sublet and a lease takeover?',
        answer:
          'In a sublet, the original tenant stays on the lease and rents the unit to you; they remain responsible to the landlord. In a lease takeover (relet or assignment), you replace them on the lease entirely with landlord approval, becoming the landlord\'s direct tenant with your own deposit and obligations.',
      },
      {
        question: 'Is a sublet or a relet better for a summer stay?',
        answer:
          'A sublet. For a May-to-August stay, a sublet is faster, more flexible, and doesn\'t require transferring the lease. Relets make sense when you\'re staying through the end of the lease term or want to renew the unit in your own name afterward.',
      },
      {
        question: 'Does the landlord need to approve a sublet in Ann Arbor?',
        answer:
          'Almost always — most Ann Arbor leases allow subletting only with written landlord approval, and some charge a fee. A relet or assignment always requires the landlord, since the lease itself changes hands. Get the approval in writing before money moves in either arrangement.',
      },
    ],
  },
  {
    slug: 'international-student-housing-guide-umich',
    title: 'Housing at UMich as an international student: renting from abroad, safely',
    description:
      'How international students at the University of Michigan find housing from abroad — timing, documents, avoiding sight-unseen scams, and why verified sublets beat Facebook groups.',
    excerpt:
      "Signing a lease from another continent, sight-unseen, in a market you've never set foot in. Here's how to do it without getting burned.",
    updated: '2026-07-07',
    readingMinutes: 6,
    sections: [
      {
        heading: 'The core problem: renting sight-unseen',
        paragraphs: [
          "Most international students arrange Ann Arbor housing before ever visiting Ann Arbor. That means every scam pattern in student housing — fake listings, stolen photos, deposits wired to people who don't exist — hits international students hardest, because 'come see the place first' isn't an option from Shanghai or Mumbai.",
          'The fix is not more caution in the abstract; it\'s process: verify the person, verify the place, and keep the money traceable.',
        ],
      },
      {
        heading: 'Verify the person before the place',
        paragraphs: [
          "A listing is only as real as the human behind it. Insist on a live video call — not a pre-recorded video — where the person walks the actual apartment and shows the street outside. On Wroomly, every account is verified with an @umich.edu email before it can list or message, so the person on the other end is a named, real University of Michigan student. That single check removes most of the fraud you'd face in open Facebook groups.",
        ],
      },
      {
        heading: 'Timing and paperwork from abroad',
        paragraphs: [
          'The Ann Arbor lease market moves nearly a year early, but the sublet market moves on your schedule — spring for fall arrivals, November for January arrivals. Sublets also solve the paperwork problem: full leases often want a US credit history, a guarantor, or several months of rent upfront; a sublet from a student typically just needs the agreement, the deposit, and first month.',
        ],
        bullets: [
          'Start looking 2–4 months before arrival; set a saved search',
          'Ask for a live video walkthrough, always',
          'Expect: written agreement, deposit (≤1.5 months under Michigan law), first month',
          'Never pay by wire, gift card, or crypto — use a traceable method',
          'Get the sublease and landlord consent in writing before sending anything',
        ],
      },
      {
        heading: 'Furnished matters more than you think',
        paragraphs: [
          "Arriving with two suitcases means an unfurnished apartment is an immediate several-hundred-dollar furniture problem with no car to solve it. Furnished sublets — the norm in the big student buildings — let you land, unpack, and start classes. Filter for furnished and weigh a modest premium against the true cost of furnishing from zero.",
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
          'Most arrange it from abroad: university housing if they get it, otherwise sublets and leases found online. Sublets from verified students are the safest off-campus route sight-unseen — on Wroomly every lister is @umich.edu-verified. Start two to four months before arrival and always do a live video walkthrough.',
      },
      {
        question: 'How can I avoid housing scams when renting from abroad?',
        answer:
          'Verify the person, not just the listing: insist on a live video call where they walk the apartment, use a platform that verifies identity, and never pay by wire, gift card, or crypto. Get the written agreement and the landlord\'s sublet consent before any money moves.',
      },
      {
        question: 'Do I need a US credit history to rent in Ann Arbor?',
        answer:
          'For a full lease, often yes — landlords may ask for a US guarantor, credit history, or months of rent upfront. Sublets sidestep most of that: you typically need only the written sublease, the security deposit (capped at 1.5 months\' rent in Michigan), and first month\'s rent.',
      },
    ],
  },
  {
    slug: 'grad-student-housing-ann-arbor',
    title: 'Grad student housing in Ann Arbor: quieter, closer to your lab, saner',
    description:
      'Where University of Michigan grad students actually live — the quiet neighborhoods, medical-campus logistics, 12-month realities, and how sublets fit a defense-date life.',
    excerpt:
      'You want quiet, a reasonable commute to your lab, and neighbors who sleep at night. The grad-student map of Ann Arbor.',
    updated: '2026-07-07',
    readingMinutes: 5,
    sections: [
      {
        heading: 'The grad-student map is different',
        paragraphs: [
          "The undergrad housing map — South U high-rises, Central Campus houses — optimizes for walk-to-lecture and social density. Grad life optimizes differently: quiet, month-to-month sanity, and proximity to a lab, library, or hospital you'll visit seven days a week. That points at a different set of neighborhoods: Kerrytown, the Old West Side, Burns Park, Water Hill, and Lower Town.",
          'Kerrytown and Burns Park put you a walkable mile from Central Campus without the undergrad noise. The Old West Side and Water Hill add value and character. Lower Town is the sleeper pick for Michigan Medicine — across the river from the hospital, with river trails at your door.',
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
          "Grad timelines are jagged: a semester of fieldwork, a summer internship at a company, a postdoc starting in March. Twelve-month leases handle that badly; sublets handle it perfectly, on both sides. Arriving mid-year for a program that starts in January? The winter sublet wave — December grads, spring study-abroad — is your market.",
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
          'A great-looking room in a house two blocks from South U is not quiet in September, no matter what the listing says. If silence matters, prioritize the neighborhood over the unit — the Old West Side at midnight and the South U strip at midnight are different planets. Check the address on a map before you commit, and ask directly how many undergrads share the house.',
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
          'The classic grad neighborhoods are Kerrytown, the Old West Side, Burns Park, and Water Hill — quiet, characterful, and a walk or short bike from Central Campus. Michigan Medicine students favor Lower Town, directly across the river from the hospital. Rooms in shared houses offer the best value.',
      },
      {
        question: 'Should a grad student sign a 12-month lease or sublet?',
        answer:
          'If your year includes fieldwork, a summer internship, or a mid-year start, sublets fit better — they flex around academic timelines that leases punish. If you\'re settled for multiple years, a lease in a quiet neighborhood wins on cost. Many grad students do one sublet year first, then sign where they actually want to live.',
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
    description:
      'How to find (or fill) a January–April sublet at the University of Michigan — who leaves mid-year, when winter listings post, and how to price a spring semester.',
    excerpt:
      'Everyone writes about summer. But December graduations and spring study-abroad create a real January market — here\'s how it works.',
    updated: '2026-07-07',
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
          'Winter sublets post mostly in November and early December, as fall plans finalize and graduation dates lock in. If you need a January place, start looking at Thanksgiving; if you\'re filling a room, list before finals — once campus empties in mid-December, attention (and your applicant pool) leaves with it.',
        ],
      },
      {
        heading: 'Pricing a winter sublet',
        paragraphs: [
          'Winter sublets hold value better than summer ones — the renter is there for classes, campus is full, and the discount pressure of an empty summer town is absent. At-rent or slightly below is normal for a furnished room near campus in January. The exception is a lease running through August: the summer tail drags the average, so many people split pricing — one rate through April, a lower one for the summer months.',
        ],
      },
      {
        heading: 'Winter-specific things to actually check',
        paragraphs: ['A few things that don\'t matter in a July walkthrough but matter a lot in January:'],
        bullets: [
          'Heat: included in rent or on you? Ask for a typical winter utility bill',
          'Walk or bus route to campus — a "12-minute walk" is different at -10°C',
          'Furnished, always — nobody moves a couch in a snowstorm',
          'Snow removal: whose job is the sidewalk (city fines the address, not the absent tenant)',
          'Parking: overnight winter parking rules differ street to street',
        ],
      },
    ],
    links: [
      { label: 'Summer sublet guide', href: '/guides/summer-sublets-in-ann-arbor-student-guide' },
      { label: 'Housing timeline', href: '/guides/umich-off-campus-housing-timeline' },
      { label: 'Live rent data', href: '/guides/ann-arbor-rent-prices' },
    ],
    faqs: [
      {
        question: 'Can I find a sublet in Ann Arbor for winter semester?',
        answer:
          'Yes — December graduations, spring study-abroad, and January co-op rotations create a real mid-year market. Winter sublets post mostly in November and early December for January move-in. Start looking around Thanksgiving; furnished rooms near campus go first.',
      },
      {
        question: 'How much does a winter sublet cost compared to summer?',
        answer:
          'More. Winter sublets hold close to full rent because campus is full and the renter is there for classes — at-rent or slightly below is typical for a furnished room near campus. Summer sublets discount much more steeply because supply floods an empty town.',
      },
      {
        question: 'When should I list my room for a January sublet?',
        answer:
          'Before finals. Winter demand peaks in November and early December as transfer students, returning study-abroad students, and January arrivals lock in housing. Once campus empties mid-December, your applicant pool leaves too — listing in early November beats listing in late December.',
      },
    ],
  },
  {
    slug: 'how-to-price-your-sublet',
    title: 'How to price your Ann Arbor sublet (without leaving it empty)',
    description:
      'A practical pricing method for UMich sublets: anchor on live comparables, adjust for furniture and walk time, and understand why an empty room is the real loss.',
    excerpt:
      'The math nobody does: every month your room sits empty costs more than the discount that would have filled it.',
    updated: '2026-07-07',
    readingMinutes: 5,
    sections: [
      {
        heading: 'Start from the only number that matters',
        paragraphs: [
          "Your rent is not your price. The market doesn't know or care what you pay — it cares what comparable rooms ask right now. Start from live comparables: same bedroom count, same furnished status, similar walk to campus. Wroomly's live rent-price data shows the current median by size and neighborhood, computed from active listings — anchor there, not on your lease.",
        ],
      },
      {
        heading: 'The empty-room math',
        paragraphs: [
          'Here\'s the calculation that should drive every pricing decision. Say you pay $1,200 and insist on $1,200 while the market clears at $1,000. If holding out costs you one extra empty month over a four-month summer, you collected $3,600 instead of $4,000 — your "full price" strategy lost $400. An empty room at any price is the most expensive option you have.',
          'Price to fill within two weeks. If you\'re getting messages but no commitments, you\'re close — sweeten with a utility inclusion. If you\'re getting silence, you\'re not close — cut meaningfully, not $25 at a time.',
        ],
      },
      {
        heading: 'The adjustments that actually move price',
        paragraphs: ['From the comparable baseline, adjust for the things renters actually pay for:'],
        bullets: [
          'Furnished: the single biggest premium — most sublet seekers arrive without furniture',
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
          'State the rent, the deposit, and what utilities are included, in the listing. Vague pricing ("DM for details") reads as a red flag in a market trained on scams. And if your lease runs past your sublet dates, decide up front whether the dates flex — "May–August, dates flexible" fills faster than a rigid window.',
        ],
      },
    ],
    links: [
      { label: 'Live rent data', href: '/guides/ann-arbor-rent-prices' },
      { label: 'How to sublet your apartment', href: '/guides/how-to-sublet-your-apartment-at-university-of-michigan' },
      { label: 'Summer sublet guide', href: '/guides/summer-sublets-in-ann-arbor-student-guide' },
    ],
    faqs: [
      {
        question: 'How much should I charge for my sublet in Ann Arbor?',
        answer:
          'Anchor on live comparables — same bedroom count, furnished status, and walk time — not on what you pay. Summer sublets typically ask at or below the original rent; winter sublets hold near full rent. Price to fill within two weeks: an empty month costs more than any realistic discount.',
      },
      {
        question: 'Why is my sublet not getting any responses?',
        answer:
          'Usually price or photos. If you get messages but no commitments, you\'re close — add included utilities or flex the dates. If you get silence, cut the price meaningfully rather than $25 at a time, and check that your photos are real daylight shots of the actual room.',
      },
      {
        question: 'Should I include utilities in my sublet price?',
        answer:
          'Including utilities and stating it as a number ("rent $950, ~$60/mo utilities included") makes a listing easier to compare and more trustworthy. For a summer sublet the simplicity usually wins you more than the utility cost — and it removes a whole category of move-out disputes.',
      },
    ],
  },
  {
    slug: 'first-apartment-checklist-ann-arbor',
    title: 'Your first Ann Arbor apartment: the move-in checklist',
    description:
      'Everything to check and set up when moving into your first UMich apartment or sublet — condition photos, utilities, renters insurance, and the Ann Arbor-specific details.',
    excerpt:
      'The unglamorous 90 minutes of move-in day that saves your deposit, your Wi-Fi, and your relationship with your roommates.',
    updated: '2026-07-07',
    readingMinutes: 5,
    sections: [
      {
        heading: 'Hour one: document everything',
        paragraphs: [
          "Before a single box opens, walk every room with your phone. Photos and a slow video of walls, floors, appliances, window seals, and any existing damage — timestamped by your camera automatically. Send the damage list to your landlord or the tenant you're subletting from the same day, in writing. This is the entire deposit game, played in twenty minutes.",
        ],
        bullets: [
          'Photo + video every room, closet, and appliance',
          'Test every burner, the oven, the disposal, all faucets (hot water pressure!)',
          'Flush toilets, run the shower, check under sinks for leaks',
          'Note existing damage in a written message to the other party — same day',
          'Locate the breaker panel and water shutoff',
        ],
      },
      {
        heading: 'Utilities and internet',
        paragraphs: [
          "Ask what's already on and in whose name. In a sublet, utilities usually stay in the original tenant's name and you reimburse — get the arrangement (and a typical monthly amount) in writing. In your own lease, set up electric/gas and internet a few days before move-in; installation slots around late August in Ann Arbor book out as every student in the city calls at once.",
        ],
      },
      {
        heading: 'Renters insurance: cheap, usually worth it',
        paragraphs: [
          "A renters policy typically costs on the order of $10–20 a month and covers your laptop, bike, and belongings against theft and damage — plus liability if your overflowing tub ruins the unit below. Some Ann Arbor leases outright require it. For the price of two coffees a month, it's one of the few pieces of adult paperwork that's actually a good deal.",
        ],
      },
      {
        heading: 'The Ann Arbor-specific details',
        paragraphs: ['A few local realities that surprise first-time renters:'],
        bullets: [
          'Bikes get stolen — register yours with the university and use a U-lock',
          'Football Saturdays transform parking and noise near the stadium — know your game-day parking rules',
          'Winter is real: confirm whose job snow shoveling is, and where overnight winter parking is allowed',
          'Move-in/move-out weekends jam every elevator and truck rental in town — book early',
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
          'Some Ann Arbor leases require it, and it\'s usually worth having anyway: for roughly $10–20 a month it covers your laptop, bike, and belongings against theft and damage, plus liability. In a sublet, ask whether the original tenant\'s policy covers the unit — it typically doesn\'t cover your stuff.',
      },
      {
        question: 'How should roommates split utilities in a sublet?',
        answer:
          'Keep utilities in the original account-holder\'s name and reimburse a stated monthly amount, agreed in writing before move-in. Ask for a typical winter bill — heat in a Michigan January is the number that surprises people. Even splits by headcount are the norm unless rooms differ wildly.',
      },
    ],
  },
]

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find(g => g.slug === slug)
}
