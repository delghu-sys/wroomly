// SEO: original, distinct copy per Ann Arbor neighborhood. Each landing
// page at /ann-arbor/[slug] renders this prose + live Wroomly listings in
// that neighborhood, so the page has real substance (not thin/duplicate).
// Written student-voiced. Keep factual; no claims of U-of-M affiliation.

export interface NeighborhoodContent {
  slug: string
  name: string // must exactly match listings.neighborhood values
  tagline: string
  intro: string[] // paragraphs
  highlights: string[]
  bestFor: string
}

export const NEIGHBORHOOD_CONTENT: NeighborhoodContent[] = [
  {
    slug: 'central-campus',
    name: 'Central Campus',
    tagline: 'Walk-to-class central — the heart of student life.',
    intro: [
      "Central Campus is where most of your classes actually are — the Diag, Mason Hall, the UGLi, Angell Hall. If you want to roll out of bed fifteen minutes before lecture and still make it, this is the spot. It's also where the bulk of UMich's older rental housing sits, so subletting here means competing with a lot of people who want the exact same thing: short walk, central everything.",
      "Expect a mix of converted houses, older apartment buildings, and a handful of newer high-rises. Rents run higher than the edges of town because you're paying for the location. Summer sublets are common here when people leave for internships, study abroad, or just go home — which is exactly what makes it a good place to look on Wroomly.",
    ],
    highlights: [
      'Steps from the Diag, Mason Hall, and the UGLi',
      'Close to State Street and South U food + coffee',
      'Highest demand for summer sublets — book early',
      'Mostly older houses + apartments, some high-rises',
    ],
    bestFor: 'students who want the shortest possible walk to class',
  },
  {
    slug: 'north-campus',
    name: 'North Campus',
    tagline: 'Quieter, greener — home base for engineering, music, and art.',
    intro: [
      "North Campus is its own world. If you're in Engineering, Music, Theatre & Dance, or Art & Design, your classes are up here, and living nearby saves you the bus commute across town. It's calmer and more spread out than Central — more trees, more parking, fewer crowds.",
      "Housing skews toward apartment complexes and newer builds. The Northwood and Bursley areas anchor it. Sublets open up here for the same reasons as everywhere else — co-ops, internships, graduation — and because it's a bit removed, you can sometimes find better value than the Central Campus crush.",
    ],
    highlights: [
      'Home to Engineering, Music, and Art & Design',
      'Quieter and greener than Central Campus',
      'Served by the UMich bus (Bursley–Baits, Northwood routes)',
      'More apartment complexes, often better value',
    ],
    bestFor: 'engineering, music, and art students who want to skip the commute',
  },
  {
    slug: 'south-university',
    name: 'South University',
    tagline: 'Food, nightlife, and high-rises a block from class.',
    intro: [
      "South University — \"South U\" — is the strip of restaurants, bars, and shops just east of Central Campus, plus the dense student housing packed around it. This is peak college-town living: you're a block or two from class and surrounded by places to eat at 1am.",
      "A lot of the newer luxury high-rises (think The Landmark, Zaragon) cluster around here, alongside older apartments. It's lively, sometimes loud, and convenient. Summer sublets in the high-rises are some of the most common listings you'll see — people sign 12-month leases and need to fill the summer.",
    ],
    highlights: [
      'On the South U restaurant + nightlife strip',
      'One block from Central Campus classes',
      'Dense with newer luxury high-rises',
      'Tons of summer sublet supply in big buildings',
    ],
    bestFor: 'students who want food and nightlife at their doorstep',
  },
  {
    slug: 'kerrytown',
    name: 'Kerrytown',
    tagline: 'Farmers market charm just north of downtown.',
    intro: [
      "Kerrytown is the cozy, walkable pocket north of downtown built around the Kerrytown Market & Shops and the Ann Arbor Farmers Market. It's a little more grown-up than the high-rise strips — historic houses, brick sidewalks, good coffee, and the Saturday market.",
      "Housing here is mostly older homes and smaller apartment buildings, so subletting often means a room in a house or a unit in a converted building. It's a short walk to both downtown and Central Campus, which makes it a quietly great location that doesn't feel like a dorm zone.",
    ],
    highlights: [
      'Built around the Farmers Market + Kerrytown Shops',
      'Historic homes and smaller buildings',
      'Walk to downtown and Central Campus',
      'Calmer, more residential feel',
    ],
    bestFor: 'students who want charm and walkability over high-rise amenities',
  },
  {
    slug: 'old-west-side',
    name: 'Old West Side',
    tagline: 'Historic, leafy, and a short bike from campus.',
    intro: [
      "The Old West Side is a designated historic district just west of downtown — tree-lined streets, century-old houses, and a genuinely residential feel. It's popular with grad students, young families, and undergrads who'd rather not live in a party building.",
      "Sublets here are usually rooms in houses or units in smaller multi-family homes. You're a flat bike ride or quick bus from campus, and you trade a few minutes of commute for a much quieter, prettier place to live. Good for anyone who wants Ann Arbor to feel like a town, not just a campus.",
    ],
    highlights: [
      'Historic district with protected old homes',
      'Quiet, residential, tree-lined',
      'Short bike or bus ride to campus',
      'Popular with grad students and upperclassmen',
    ],
    bestFor: 'grad students and anyone craving a quiet, characterful street',
  },
  {
    slug: 'burns-park',
    name: 'Burns Park',
    tagline: 'Family-friendly and calm, just southeast of campus.',
    intro: [
      "Burns Park is one of Ann Arbor's most beloved residential neighborhoods — named for the park at its center, full of well-kept homes, and a favorite of professors and families. For students, it's a quieter alternative that's still close to Central Campus.",
      "Most sublets here are rooms in houses or in-law units, often with more space and a real backyard. It's the kind of place where you'll have neighbors who aren't students, which a lot of people find refreshing after a year in the high-rises.",
    ],
    highlights: [
      'Centered on Burns Park itself',
      'Mostly single-family homes',
      'Walk or short bike to Central Campus',
      'Calm, mixed student-and-family community',
    ],
    bestFor: 'students who want space, quiet, and a real neighborhood',
  },
  {
    slug: 'water-hill',
    name: 'Water Hill',
    tagline: 'Artsy, affordable, and famously friendly.',
    intro: [
      "Water Hill is the neighborhood northwest of downtown known for its annual Water Hill Music Fest, where neighbors play music on their porches. It's artsy, a little funky, and generally more affordable than the campus-adjacent zones.",
      "Housing is mostly older homes, so sublets tend to be rooms or small units. You're a bit further from Central Campus — a solid bike ride or a bus — but you trade that for lower rent and a genuinely warm community vibe.",
    ],
    highlights: [
      'Home of the Water Hill Music Fest',
      'More affordable than campus-adjacent areas',
      'Older homes, room sublets common',
      'Bike or bus to campus',
    ],
    bestFor: 'students prioritizing value and a tight-knit community',
  },
  {
    slug: 'eberwhite',
    name: 'Eberwhite',
    tagline: 'Woodsy and residential on the west side.',
    intro: [
      "Eberwhite, named for its elementary school and the woods beside it, is a quiet west-side neighborhood of mid-century homes and mature trees. It's residential through and through — not a student zone, which is exactly the appeal for some people.",
      "Sublets here are usually rooms in houses. You'll want a bike or the bus for campus, but you get a peaceful, green place to live and rents that beat the high-rises. Good for upperclassmen and grad students who value calm.",
    ],
    highlights: [
      'Next to Eberwhite Woods',
      'Quiet, mid-century residential streets',
      'Bike or bus to campus',
      'Lower rents than campus core',
    ],
    bestFor: 'people who want quiet and green over walk-to-class convenience',
  },
  {
    slug: 'pittsfield',
    name: 'Pittsfield',
    tagline: 'More space and value south of the city.',
    intro: [
      "Pittsfield Township wraps around the south side of Ann Arbor and is where a lot of the larger, more affordable apartment complexes live. If your top priority is square footage, parking, and a lower rent, this is worth a look.",
      "You'll rely on a car or the bus to get to campus — it's not walkable — but the trade is real value and often newer, bigger units. Sublets here suit students with cars, grad students, or anyone who wants an actual apartment over a room in an old house.",
    ],
    highlights: [
      'Larger apartment complexes',
      'More space + parking, lower rent',
      'Car or bus needed for campus',
      'Good for students who drive',
    ],
    bestFor: 'students with a car who want space and value',
  },
  {
    slug: 'downtown',
    name: 'Downtown',
    tagline: 'Restaurants, Main Street, and city energy.',
    intro: [
      "Downtown Ann Arbor centers on Main Street — the best restaurants in town, bars, the State and Michigan theaters, and the kind of walkable city core that makes Ann Arbor feel bigger than it is. Living here puts you in the middle of all of it.",
      "Housing is a mix of newer apartments above the shops and converted historic buildings. It's a short walk or bus to Central Campus. Sublets downtown are great if you want restaurants and culture over a pure campus bubble — and they move fast.",
    ],
    highlights: [
      'On or near Main Street',
      'Best restaurants + nightlife in town',
      'Walk or short bus to Central Campus',
      'Apartments above shops + historic conversions',
    ],
    bestFor: 'students who want city life, not just campus life',
  },
  {
    slug: 'lower-town',
    name: 'Lower Town',
    tagline: 'Between the river and the medical campus.',
    intro: [
      "Lower Town sits across the Huron River just north of downtown, near the medical campus and the Broadway bridge. It's a small, transitional area with a mix of older housing and newer development, and it's especially handy if you're affiliated with Michigan Medicine.",
      "Sublets here are less common than the campus core but can be good value, and you're close to the river trails and a quick hop to both downtown and the hospital. Worth checking if you're in a health-sciences program.",
    ],
    highlights: [
      'Across the river near the medical campus',
      'Close to Huron River trails',
      'Quick access to downtown + Michigan Medicine',
      'Smaller supply, sometimes better value',
    ],
    bestFor: 'med + health-sciences students near the hospital',
  },
]

export function getNeighborhood(slug: string): NeighborhoodContent | undefined {
  return NEIGHBORHOOD_CONTENT.find(n => n.slug === slug)
}
