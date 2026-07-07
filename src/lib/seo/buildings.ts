// SEO: building landing pages at /buildings/[slug] target high-intent
// "sublet at [building]" searches. We deliberately do NOT fabricate
// building-specific facts (addresses, amenities, unit counts). Every fact
// below was verified against the building's own website or public listing
// records (apartments.com, offcampushousing.umich.edu, city records) —
// see the per-building comments. Buildings we could NOT verify keep the
// honest generic fallback (`buildingIntro`) and no fact claims at all.
//
// Rules for editing this file:
//  - Never add an address, amenity, unit count, or year you haven't
//    verified against a primary-ish source.
//  - FAQ answers must be self-contained plain text (~40–60 words) — they
//    are marked up as FAQPage JSON-LD and quoted verbatim by AI engines.
//  - Sublet-policy answers stay generic-but-honest: policies vary and
//    change, so we say "confirm with the leasing office", never "X allows
//    subletting".

import { ANN_ARBOR_RESIDENCES } from '@/lib/constants'

export interface BuildingContent {
  slug: string
  name: string // must match listings.residence_name exactly
  /** Street address — only when verified. Drives the "Where is…" FAQ + schema. */
  address?: string
  /** Former or alternate names the building has leased under. */
  aka?: string
  /** Slug of the /ann-arbor/[slug] neighborhood page this building sits in. */
  neighborhoodSlug?: string
  /** Researched intro paragraphs. Absent → generic buildingIntro fallback. */
  intro?: string[]
  /** Verified quick facts, rendered as a bullet list. */
  facts?: string[]
  /** Building-specific FAQs (FAQPage JSON-LD). */
  faqs?: { question: string; answer: string }[]
  note?: string // legacy optional hand-verified fact slot
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** The one sublet-policy answer we're willing to make — generic and honest. */
function subletFaq(name: string): { question: string; answer: string } {
  return {
    question: `Can I sublet an apartment at ${name}?`,
    answer: `Most large Ann Arbor student buildings allow subletting or relets with written approval from the leasing office, sometimes with a small fee — but policies vary and change, so confirm with ${name}'s office before you list or sign. Sublets at ${name} posted by verified University of Michigan students appear on Wroomly.`,
  }
}

// Researched content, keyed by the exact residence name in
// ANN_ARBOR_RESIDENCES. A name absent here renders the generic fallback.
const DETAILS: Record<string, Omit<BuildingContent, 'slug' | 'name'>> = {
  Verve: {
    address: '721 S Forest Ave, Ann Arbor, MI 48104',
    neighborhoodSlug: 'south-university',
    intro: [
      'Verve is one of the newest student high-rises in Ann Arbor — a 12-story, LEED-certified building at 721 S Forest Ave with 741 beds across 217 units, about a five-minute walk from Central Campus. Units run from studios up to six-bedroom layouts, all fully furnished with in-unit washers and dryers.',
      'The amenity list is the headline: a rooftop pool deck with cabanas, a two-story fitness center, a lobby coffee shop, and even a dog park. That scale is also what makes Verve a steady source of sublets — with hundreds of leases turning over on twelve-month cycles, someone is always leaving for a summer internship or a semester abroad.',
    ],
    facts: [
      '721 S Forest Ave — about a 5-minute walk to Central Campus',
      '12 stories, 741 beds across 217 units, LEED-certified',
      'Studios through 6-bedroom layouts, roughly 430–1,800+ sq ft',
      'Fully furnished, in-unit washer and dryer',
      'Rooftop pool deck with cabanas, two-story fitness center, dog park',
    ],
    faqs: [
      {
        question: 'Where is Verve Ann Arbor located?',
        answer:
          'Verve is at 721 S Forest Ave in Ann Arbor, in the South University area — about a five-minute walk to the University of Michigan Central Campus and a block from the South U restaurant strip.',
      },
      {
        question: 'What floor plans does Verve Ann Arbor have?',
        answer:
          'Verve offers studios through six-bedroom apartments, roughly 430 to over 1,800 square feet, spread across 217 units and 741 beds in a 12-story building. All units come fully furnished with in-unit washers and dryers.',
      },
      subletFaq('Verve'),
    ],
  },

  'Hub on Campus': {
    address: '603 E Huron St, Ann Arbor, MI 48104',
    neighborhoodSlug: 'central-campus',
    intro: [
      'Hub on Campus Ann Arbor sits at 603 E Huron St, on the edge of Central Campus where downtown begins. Units range from efficiencies and studios up to four-bedroom apartments, finished with quartz countertops, and the building offers underground parking — rare for the campus core.',
      "The 15th floor is the draw: an outdoor pool, hot tub, and rooftop deck looking over campus, alongside a yoga studio, gym, sauna, and cold plunge downstairs. Like every big-amenity building on twelve-month leases, Hub generates a steady stream of summer sublets when residents leave for internships — that's what shows up below.",
    ],
    facts: [
      '603 E Huron St — northern edge of Central Campus',
      'Efficiency, studio, 2-, 3-, and 4-bedroom floor plans',
      '15th-floor pool, hot tub, and rooftop deck',
      'Yoga studio, gym, sauna, and cold plunge',
      'Quartz countertops; underground parking',
    ],
    faqs: [
      {
        question: 'Where is Hub on Campus Ann Arbor located?',
        answer:
          'Hub on Campus is at 603 E Huron St in Ann Arbor, on the northern edge of the University of Michigan Central Campus where it meets downtown — a short walk to both the Diag and Main Street.',
      },
      {
        question: 'What amenities does Hub on Campus Ann Arbor have?',
        answer:
          'Hub on Campus features a 15th-floor outdoor pool, hot tub, and rooftop deck, plus a yoga studio, gym, sauna, and cold plunge. Apartments have quartz countertops, and the building offers underground parking — uncommon for the campus core.',
      },
      subletFaq('Hub on Campus'),
    ],
  },

  Six11: {
    address: '611 E University Ave, Ann Arbor, MI 48104',
    neighborhoodSlug: 'south-university',
    intro: [
      'Six11 is a 13-story, 343-bed student high-rise at 611 E University Ave, in the South University area a block from Central Campus. Floor plans run from studios to four-bed/four-bath and five-bed/five-bath layouts — every bedroom with its own bathroom — from about 408 to 1,617 square feet, all furnished with in-unit laundry.',
      'The 13th-floor sky lounge and rooftop terrace with fire pits are the signature amenities. Because Six11 leases by the bedroom on academic-year cycles, summer sublets are a fixture here — when residents head out for internships, their rooms land on Wroomly.',
    ],
    facts: [
      '611 E University Ave — one block from Central Campus',
      '13 stories, 343 beds',
      'Studios, 4-bed/4-bath, and 5-bed/5-bath layouts, 408–1,617 sq ft',
      'Fully furnished, in-unit washer and dryer',
      '13th-floor sky lounge and rooftop terrace with fire pits',
    ],
    faqs: [
      {
        question: 'Where is Six11 Ann Arbor located?',
        answer:
          'Six11 is at 611 E University Ave in Ann Arbor, in the South University area one block from the University of Michigan Central Campus and the Diag.',
      },
      {
        question: 'What floor plans does Six11 have?',
        answer:
          'Six11 offers studios plus four-bed/four-bath and five-bed/five-bath apartments — every bedroom gets a private bathroom — ranging from about 408 to 1,617 square feet across 343 beds. Units come fully furnished with in-unit washers and dryers.',
      },
      subletFaq('Six11'),
    ],
  },

  Landmark: {
    address: '1300 S University Ave, Ann Arbor, MI 48104',
    neighborhoodSlug: 'south-university',
    intro: [
      'Landmark is the 14-story high-rise at 1300 S University Ave, built in 2012 with 172 units at the eastern end of the South U strip. Floor plans span studios through six-bedroom apartments, fully furnished.',
      'Its best-known perk is the 24-hour Academic Success Center — iMacs and free printing — plus a fitness and yoga studio and a hot-tub patio. Landmark has been part of the UMich off-campus rotation long enough that sublets here are routine: residents leave for summers and semesters abroad, and their rooms surface below.',
    ],
    facts: [
      '1300 S University Ave — eastern end of the South U strip',
      '14 stories, 172 units, built in 2012',
      'Studios through 6-bedroom layouts, fully furnished',
      '24-hour Academic Success Center with iMacs and free printing',
      'Fitness and yoga studio; hot-tub patio',
    ],
    faqs: [
      {
        question: 'Where is Landmark Ann Arbor located?',
        answer:
          'Landmark is at 1300 S University Ave in Ann Arbor, at the eastern end of the South University strip, a short walk from the University of Michigan Central Campus.',
      },
      {
        question: 'What amenities does Landmark Ann Arbor have?',
        answer:
          'Landmark offers a 24-hour Academic Success Center with iMacs and free printing, a fitness and yoga studio, and a hot-tub patio. The 2012-built high-rise has 14 stories and 172 fully furnished units, from studios to six-bedroom apartments.',
      },
      subletFaq('Landmark'),
    ],
  },

  'The Standard': {
    address: '425 S Main St, Ann Arbor, MI 48104',
    neighborhoodSlug: 'downtown',
    intro: [
      'The Standard at Ann Arbor sits at 425 S Main St, putting residents on downtown Ann Arbor\'s best restaurant block rather than in the campus bubble — Central Campus is a walk or quick bus east. Floor plans run from studios to four-bedroom apartments, fully furnished with granite countertops and hardwood-style flooring.',
      'Amenities center on an academic lounge with private study rooms, a heated pool, a yoga room, and a fitness center, with high-speed internet, cable, and trash included. Twelve-month leases plus internship season means a reliable crop of summer sublets.',
    ],
    facts: [
      '425 S Main St — on downtown\'s Main Street restaurant strip',
      'Studios through 4-bedroom apartments, fully furnished',
      'Academic lounge with private study rooms; heated pool; yoga room',
      'Granite countertops, hardwood-style flooring',
      'High-speed internet, cable, and trash included',
    ],
    faqs: [
      {
        question: 'Where is The Standard at Ann Arbor located?',
        answer:
          'The Standard at Ann Arbor is at 425 S Main St, on downtown Ann Arbor\'s Main Street — surrounded by the city\'s best restaurants, with the University of Michigan Central Campus a walk or short bus ride east.',
      },
      {
        question: 'Are apartments at The Standard furnished?',
        answer:
          'Yes. The Standard\'s studios through four-bedroom apartments come fully furnished and move-in ready, with granite countertops and hardwood-style flooring. High-speed internet, cable, and trash removal are included in the rent.',
      },
      subletFaq('The Standard'),
    ],
  },

  'Arbor Blu': {
    address: '624 Church St, Ann Arbor, MI 48104',
    aka: 'Sterling ArborBLU',
    neighborhoodSlug: 'south-university',
    intro: [
      'Arbor Blu — officially Sterling ArborBLU — is a 14-story, LEED Silver high-rise at 624 Church St, built in 2015 in the heart of the South University area with 113 units. Floor plans span one to five bedrooms, roughly 483 to 1,675 square feet, tiered by floor: standard apartments on floors 2–7, "Skyline" units on 8–12, and penthouses up top with direct access to the penthouse lounge and rooftop patio.',
      'The Church St address means class, South U food, and the Diag are all within a couple of blocks — location this central is exactly why Arbor Blu sublets get snapped up fast when they post.',
    ],
    facts: [
      '624 Church St — heart of the South University area',
      '14 stories, 113 units, built 2015, LEED Silver certified',
      '1- to 5-bedroom floor plans, about 483–1,675 sq ft',
      'Penthouse lounge and rooftop patio on the top floors',
      'Standard floors 2–7, Skyline floors 8–12, penthouses above',
    ],
    faqs: [
      {
        question: 'Where is Arbor Blu located?',
        answer:
          'Arbor Blu (Sterling ArborBLU) is at 624 Church St in Ann Arbor, in the heart of the South University area — a couple of blocks from the University of Michigan Central Campus and the South U restaurant strip.',
      },
      {
        question: 'What floor plans does Arbor Blu have?',
        answer:
          'Arbor Blu offers one- to five-bedroom apartments from roughly 483 to 1,675 square feet across 113 units. Standard apartments sit on floors 2–7, Skyline units on floors 8–12, and penthouse apartments on the top floor with rooftop patio access.',
      },
      subletFaq('Arbor Blu'),
    ],
  },

  'Foundry Lofts': {
    address: '413 E Huron St, Ann Arbor, MI 48104',
    neighborhoodSlug: 'downtown',
    intro: [
      'Foundry Lofts is the modern-industrial building at 413 E Huron St, built in 2016 with 204 units where downtown meets the north edge of Central Campus. Layouts run from studios to four-bedroom apartments with 9-foot ceilings, exposed-concrete accents, and light wood-tone floors — more loft than dorm.',
      'Furnished units and individual leases make it a classic student building underneath the industrial styling, and that lease structure is why Foundry sublets appear every internship season.',
    ],
    facts: [
      '413 E Huron St — downtown, north edge of Central Campus',
      'Built 2016, 204 units',
      'Studios through 4-bedroom lofts with 9-foot ceilings',
      'Exposed-concrete, modern-industrial finishes',
      'Furnished units and individual leases available',
    ],
    faqs: [
      {
        question: 'Where is Foundry Lofts located?',
        answer:
          'Foundry Lofts is at 413 E Huron St in Ann Arbor, at the corner of Huron and Division where downtown meets the northern edge of the University of Michigan Central Campus.',
      },
      {
        question: 'What are apartments at Foundry Lofts like?',
        answer:
          'Foundry Lofts has 204 units built in 2016, from studios to four-bedroom apartments with a modern-industrial look — 9-foot ceilings, exposed-concrete accents, and light wood-tone flooring. Furnished units and individual leases are available.',
      },
      subletFaq('Foundry Lofts'),
    ],
  },

  'Vic Village North': {
    address: '1107 S University Ave, Ann Arbor, MI 48104',
    neighborhoodSlug: 'south-university',
    intro: [
      'Vic Village North is the newer of the two Vic Village towers, at 1107 S University Ave with 57 units running from two to six bedrooms, roughly 955 to 2,143 square feet — big roommate-group layouts a block from Central Campus.',
      'Residents get rooftop patios with interior lounges, fitness and yoga rooms, and study areas, with amenity access shared across both Vic Village buildings. Group leases here mean group turnover: when a roommate leaves for a co-op, their room shows up as a sublet below.',
    ],
    facts: [
      '1107 S University Ave — on the South U strip',
      '57 units, 2- to 6-bedroom layouts, about 955–2,143 sq ft',
      'Rooftop patios with interior lounges',
      'Fitness and yoga rooms, study areas',
      'Amenity access shared with Vic Village South across the street',
    ],
    faqs: [
      {
        question: 'Where is Vic Village North located?',
        answer:
          'Vic Village North is at 1107 S University Ave in Ann Arbor, on the South University strip a block from the University of Michigan Central Campus. Its sister building, Vic Village South, sits directly across the street.',
      },
      {
        question: 'What floor plans does Vic Village North have?',
        answer:
          'Vic Village North has 57 apartments ranging from two to six bedrooms, roughly 955 to 2,143 square feet — layouts built for roommate groups. Residents share rooftop patios, lounges, fitness and yoga rooms, and study areas across both Vic Village buildings.',
      },
      subletFaq('Vic Village North'),
    ],
  },

  'Vic Village South': {
    address: '1116 S University Ave, Ann Arbor, MI 48104',
    neighborhoodSlug: 'south-university',
    intro: [
      'Vic Village South, at 1116 S University Ave, offers two- through four-bedroom floor plans across the street from its sister tower, Vic Village North. It\'s aimed squarely at UMich roommate groups who want to live steps from campus and the South U strip.',
      'Residents get access to the amenities of both Vic Village buildings — rooftop patios and lounges, fitness and yoga rooms, and study areas. Sublets here trade on pure location: a block to class is the whole pitch, and it works.',
    ],
    facts: [
      '1116 S University Ave — on the South U strip',
      '2- to 4-bedroom floor plans for roommate groups',
      'Amenity access shared with Vic Village North',
      'Rooftop patios with lounges, fitness and yoga rooms, study areas',
    ],
    faqs: [
      {
        question: 'Where is Vic Village South located?',
        answer:
          'Vic Village South is at 1116 S University Ave in Ann Arbor, on the South University strip steps from the University of Michigan Central Campus, directly across from Vic Village North.',
      },
      subletFaq('Vic Village South'),
    ],
  },

  'Z Place': {
    address: '619 E University Ave, Ann Arbor, MI 48104',
    neighborhoodSlug: 'central-campus',
    intro: [
      'Z Place, at 619 E University Ave, rents fully furnished two- through six-bedroom apartments built for roommate groups — private bedrooms with full-size beds and built-in wardrobes around a shared kitchen with stainless appliances and granite counters, plus a full-size in-unit washer and dryer.',
      'It sits within about a ten-minute walk of Central Campus, which keeps demand for its sublets steady whenever a roommate heads off for an internship or a semester away.',
    ],
    facts: [
      '619 E University Ave — about a 10-minute walk to Central Campus',
      '2- to 6-bedroom furnished apartments',
      'Private bedrooms with full-size beds and built-in wardrobes',
      'Stainless appliances, granite countertops, in-unit washer/dryer',
    ],
    faqs: [
      {
        question: 'Where is Z Place located?',
        answer:
          'Z Place is at 619 E University Ave in Ann Arbor, within about a ten-minute walk of the University of Michigan Central Campus.',
      },
      {
        question: 'Are Z Place apartments furnished?',
        answer:
          'Yes. Z Place\'s two- through six-bedroom apartments come fully furnished — private bedrooms with full-size beds and built-in wardrobes, plus a shared kitchen with stainless steel appliances, granite countertops, and a full-size in-unit washer and dryer.',
      },
      subletFaq('Z Place'),
    ],
  },

  '411 Lofts': {
    address: '411 E Washington St, Ann Arbor, MI 48104',
    aka: 'now leasing as Saga Ann Arbor (formerly Sterling 4Eleven, YOUnion)',
    neighborhoodSlug: 'downtown',
    intro: [
      '411 Lofts is the loft-style student building at 411 E Washington St, two blocks from both Central Campus and downtown Ann Arbor. It houses about 342 residents in 96 condo-style lofts — one- to four-bedroom layouts with ten-foot ceilings, granite counters, and individually locking bedroom doors.',
      'The 10th-floor sky lounge packs a fitness center, pool table, and study space, and the building has underground parking with retail at street level. Note the name history: the building has leased as 411 Lofts, Sterling 4Eleven, YOUnion, and currently Saga Ann Arbor — listings for any of those names refer to the same address.',
    ],
    facts: [
      '411 E Washington St — two blocks from Central Campus and downtown',
      '96 condo-style lofts, about 342 residents',
      '1- to 4-bedroom layouts with 10-foot ceilings',
      '10th-floor sky lounge with fitness center, pool table, study space',
      'Same building has leased as Sterling 4Eleven, YOUnion, and Saga',
    ],
    faqs: [
      {
        question: 'Where is 411 Lofts located?',
        answer:
          '411 Lofts is at 411 E Washington St in Ann Arbor, two blocks from the University of Michigan Central Campus and two blocks from downtown. The building currently leases as Saga Ann Arbor and has previously operated as Sterling 4Eleven and YOUnion.',
      },
      subletFaq('411 Lofts'),
    ],
  },

  'Sterling 411 Lofts': {
    address: '411 E Washington St, Ann Arbor, MI 48104',
    aka: 'the Sterling-era name of 411 Lofts — now leasing as Saga Ann Arbor',
    neighborhoodSlug: 'downtown',
    intro: [
      'Sterling 411 Lofts is the name many students still use for the loft building at 411 E Washington St from its years under Sterling management. It\'s the same building that opened as 411 Lofts and currently leases as Saga Ann Arbor — 96 condo-style lofts, two blocks from Central Campus and downtown.',
      'Whatever name is on the lease, the sublets work the same way: one- to four-bedroom lofts with ten-foot ceilings and a 10th-floor sky lounge, posted here by verified UMich students when they leave for a summer or semester.',
    ],
    facts: [
      'Same building as 411 Lofts / Saga — 411 E Washington St',
      '96 condo-style lofts, 1- to 4-bedroom layouts',
      '10-foot ceilings, individually locking bedrooms',
      '10th-floor sky lounge with fitness center and study space',
    ],
    faqs: [
      {
        question: 'Is Sterling 411 Lofts the same as 411 Lofts and Saga?',
        answer:
          'Yes — they are the same building at 411 E Washington St in Ann Arbor. It opened as 411 Lofts, leased as Sterling 4Eleven and later YOUnion, and currently operates as Saga Ann Arbor. Listings under any of those names refer to this address.',
      },
      subletFaq('Sterling 411 Lofts'),
    ],
  },

  Saga: {
    address: '411 E Washington St, Ann Arbor, MI 48104',
    aka: 'formerly YOUnion, Sterling 4Eleven, and 411 Lofts',
    neighborhoodSlug: 'downtown',
    intro: [
      'Saga Ann Arbor is the current name of the student building at 411 E Washington St — built in 2009, previously leased as 411 Lofts, Sterling 4Eleven, and YOUnion. It\'s two blocks from Central Campus in one direction and downtown Ann Arbor in the other.',
      'Apartments run from one-bed/one-bath to four-bed/three-bath, fully furnished, with a 24/7 fitness center, a 24-hour computer lab with study spaces, and complimentary Wi-Fi and Starbucks coffee in the lobby. Twelve-month leases plus that location make Saga sublets a summer staple.',
    ],
    facts: [
      '411 E Washington St — two blocks from Central Campus and downtown',
      'Built 2009; formerly 411 Lofts / Sterling 4Eleven / YOUnion',
      '1-bed/1-bath to 4-bed/3-bath furnished floor plans',
      '24/7 fitness center and 24-hour computer lab',
      'Complimentary Wi-Fi and lobby Starbucks coffee',
    ],
    faqs: [
      {
        question: 'Where is Saga Ann Arbor located?',
        answer:
          'Saga Ann Arbor is at 411 E Washington St, two blocks from the University of Michigan Central Campus and two blocks from downtown. The 2009 building previously leased as 411 Lofts, Sterling 4Eleven, and YOUnion.',
      },
      {
        question: 'What floor plans does Saga Ann Arbor have?',
        answer:
          'Saga offers fully furnished apartments from one-bed/one-bath up to four-bed/three-bath layouts, with private bedrooms. Residents get a 24/7 fitness center, a 24-hour computer lab with study spaces, complimentary Wi-Fi, and Starbucks coffee in the lobby.',
      },
      subletFaq('Saga'),
    ],
  },

  'The Yard': {
    address: '615 S Main St, Ann Arbor, MI 48104',
    neighborhoodSlug: 'downtown',
    intro: [
      'The Yard is the student community at 615 S Main St, directly across from Elbel Field and a short walk from Michigan Stadium and the Main Street restaurant district. Fully furnished floor plans run from studios to five-bedroom apartments, roughly 188 to 1,649 square feet, many with views of the Big House and downtown.',
      'Amenities include a 24-hour fitness center, heated pool, cyber lounge with a print center, group study rooms, reserved garage parking, and a private shuttle to campus — Central Campus is about 0.8 miles, an 18-minute walk, so the shuttle earns its keep in winter.',
    ],
    facts: [
      '615 S Main St — across from Elbel Field, near Michigan Stadium',
      'Studios through 5-bedroom furnished apartments, 188–1,649 sq ft',
      '24-hour fitness center, heated pool, cyber lounge with printing',
      'Reserved garage parking and private shuttle to campus',
      'About 0.8 miles (18-minute walk) to Central Campus',
    ],
    faqs: [
      {
        question: 'Where is The Yard Ann Arbor located?',
        answer:
          'The Yard is at 615 S Main St in Ann Arbor, directly across from Elbel Field and a short walk from Michigan Stadium and the Main Street district. Central Campus is about 0.8 miles away — an 18-minute walk or a ride on the community\'s private shuttle.',
      },
      {
        question: 'Does The Yard have a shuttle to campus?',
        answer:
          'Yes. The Yard runs a private shuttle to the University of Michigan campus, and offers reserved garage parking. On foot, Central Campus is roughly 0.8 miles — about an 18-minute walk from the building.',
      },
      subletFaq('The Yard'),
    ],
  },

  'Tower Plaza': {
    address: '555 E William St, Ann Arbor, MI 48104',
    neighborhoodSlug: 'central-campus',
    intro: [
      'Tower Plaza is the tallest building in Ann Arbor — a 26-story concrete high-rise at 555 E William St that opened in 1969 and converted to individually owned condominiums in 1987. Its 296 units run from roughly 400-square-foot studios to 1,100-square-foot two-bedrooms, a block or two from Central Campus and downtown.',
      'Because every unit has a different owner, rentals and sublets here vary more than in the managed student high-rises — different furniture, terms, and rents unit to unit. A 24/7 concierge staffs the lobby, and the ten-inch masonry walls between units make it one of the quietest addresses this close to campus.',
    ],
    facts: [
      '555 E William St — tallest building in Ann Arbor at 26 stories',
      'Opened 1969; converted to condominiums in 1987',
      '296 individually owned units — studios (~400 sq ft) to 2-bedrooms (~1,100 sq ft)',
      '24/7 concierge in the lobby',
      'Concrete construction with thick masonry walls — notably quiet',
    ],
    faqs: [
      {
        question: 'Where is Tower Plaza located?',
        answer:
          'Tower Plaza is at 555 E William St in Ann Arbor, a block or two from both the University of Michigan Central Campus and downtown. At 26 stories, it is the tallest building in the city.',
      },
      {
        question: 'Is Tower Plaza a student building?',
        answer:
          'Not exactly — Tower Plaza is a condominium building whose 296 units are individually owned, so residents are a mix of students, professionals, and owners. Rentals and sublets vary unit to unit in furniture, terms, and rent, unlike the managed student high-rises nearby.',
      },
      subletFaq('Tower Plaza'),
    ],
  },

  'The Varsity': {
    address: '425 E Washington St, Ann Arbor, MI 48104',
    neighborhoodSlug: 'downtown',
    intro: [
      'The Varsity is a 13-story student high-rise at 425 E Washington St, two blocks from Central Campus on the same stretch as 411 Lofts/Saga. It offers furnished studios, one-, two-, and four-bedroom apartments with fully equipped kitchens, in-unit washers and dryers, and 55-inch TVs in the living rooms.',
      'Upstairs there\'s a sky deck, rooftop terrace, and sky lounge; downstairs a two-story 24-hour fitness and yoga studio and a 24-hour computer lounge with free printing. Controlled access, cameras, and courtesy patrol round out the building.',
    ],
    facts: [
      '425 E Washington St — two blocks from Central Campus',
      '13 stories; furnished studios, 1-, 2-, and 4-bedroom apartments',
      'Sky deck, rooftop terrace, and sky lounge',
      'Two-story 24-hour fitness and yoga studio',
      '24-hour computer lounge with free printing; controlled access',
    ],
    faqs: [
      {
        question: 'Where is The Varsity Ann Arbor located?',
        answer:
          'The Varsity is at 425 E Washington St in Ann Arbor, two blocks from the University of Michigan Central Campus and steps from downtown, on the same block as the Saga (411 Lofts) building.',
      },
      {
        question: 'What amenities does The Varsity have?',
        answer:
          'The Varsity offers a sky deck, rooftop terrace, and sky lounge, a two-story 24-hour fitness and yoga studio, and a 24-hour computer lounge with free printing. Furnished apartments include full kitchens, in-unit washers and dryers, and 55-inch living-room TVs.',
      },
      subletFaq('The Varsity'),
    ],
  },

  Courtyards: {
    address: '1780 Broadway St, Ann Arbor, MI 48105',
    neighborhoodSlug: 'north-campus',
    intro: [
      'The Courtyards, at 1780 Broadway St, is the go-to sublet spot for North Campus: about a six-minute walk to Engineering, Music, and Art & Design, with a roughly ten-minute bus to Central Campus. One- through four-bedroom apartments come fully furnished on individual leases, with a washer and dryer in every unit and internet and HD cable included.',
      'Community amenities include study rooms with free printing, a coffee bar, a game room with pool and foosball, a fitness room, indoor bike storage, 24-hour package lockers, and outdoor grills and a fireplace. Summer research season on North Campus keeps its sublet demand unusually steady.',
    ],
    facts: [
      '1780 Broadway St — about a 6-minute walk to North Campus',
      '1- to 4-bedroom furnished apartments on individual leases',
      'Washer/dryer in every unit; internet and HD cable included',
      'Study rooms with free printing, coffee bar, game room, fitness room',
      'Roughly a 10-minute bus ride to Central Campus',
    ],
    faqs: [
      {
        question: 'Where is The Courtyards Ann Arbor located?',
        answer:
          'The Courtyards is at 1780 Broadway St in Ann Arbor, about a six-minute walk from the University of Michigan North Campus — home of Engineering, Music, and Art & Design — and roughly a ten-minute bus ride from Central Campus.',
      },
      {
        question: 'Are Courtyards apartments furnished?',
        answer:
          'Yes. The Courtyards\' one- through four-bedroom apartments come fully furnished on individual leases, each with an in-unit washer and dryer, and high-speed internet and an HD cable package included in the rent.',
      },
      subletFaq('Courtyards'),
    ],
  },

  'Forest Plaza': {
    address: '715 S Forest Ave, Ann Arbor, MI 48104',
    neighborhoodSlug: 'south-university',
    intro: [
      'Forest Plaza is a vintage 1929 apartment building at 715 S Forest Ave — five stories, 58 units, two blocks east of the Ross School of Business. It\'s the character alternative to the glass high-rises around it: 24 efficiency apartments around 500 square feet and 34 one-bedrooms around 725 square feet.',
      'The building is operated for students, faculty, and staff in higher education, with on-site laundry and both passenger and freight elevators. No pets (service animals excepted). Solo units this close to campus are scarce, so Forest Plaza sublets tend to move quickly.',
    ],
    facts: [
      '715 S Forest Ave — two blocks east of the Ross School of Business',
      'Built 1929; 5 stories, 58 units',
      '24 efficiencies (~500 sq ft) and 34 one-bedrooms (~725 sq ft)',
      'On-site laundry; passenger and freight elevators',
      'No pets (service animals welcome per applicable law)',
    ],
    faqs: [
      {
        question: 'Where is Forest Plaza located?',
        answer:
          'Forest Plaza is at 715 S Forest Ave in Ann Arbor, two blocks east of the University of Michigan\'s Ross School of Business in the South University area.',
      },
      {
        question: 'What kinds of units does Forest Plaza have?',
        answer:
          'Forest Plaza is a 1929 building with 58 units across five stories: 24 efficiency apartments averaging about 500 square feet and 34 one-bedroom apartments around 725 square feet — solo-living layouts that are rare this close to campus.',
      },
      subletFaq('Forest Plaza'),
    ],
  },

  'Ann Arbor City Apartments': {
    address: 'W Washington St & S First St, Ann Arbor, MI 48104',
    neighborhoodSlug: 'downtown',
    intro: [
      'Ann Arbor City Apartments is the Village Green-built community at West Washington and South First streets in downtown Ann Arbor — 155 units rising roughly nine to ten stories, with an attached parking garage. Unlike the campus high-rises, it was designed for young professionals and corporate relocation as much as students.',
      'That mix makes it a good sublet target for grad students, interns, and anyone who wants downtown Ann Arbor — Main Street restaurants, the Blind Pig block, the West Washington corridor — over the undergrad bubble. Central Campus is a walk or short bus east.',
    ],
    facts: [
      'W Washington & S First St — downtown Ann Arbor',
      '155 units, roughly 9–10 stories, built by Village Green',
      'Geared to young professionals and grad students as well as undergrads',
      'Attached parking garage',
      'Steps from Main Street restaurants and nightlife',
    ],
    faqs: [
      {
        question: 'Where is Ann Arbor City Apartments located?',
        answer:
          'Ann Arbor City Apartments is at West Washington and South First streets in downtown Ann Arbor, steps from Main Street\'s restaurants. The University of Michigan Central Campus is a walk or short bus ride east.',
      },
      {
        question: 'Is Ann Arbor City Apartments a student building?',
        answer:
          'Not primarily — the 155-unit Village Green community was designed for young professionals and corporate renters as much as students, which makes it popular with grad students and interns who want downtown Ann Arbor over the campus high-rise scene.',
      },
      subletFaq('Ann Arbor City Apartments'),
    ],
  },

  'The Legacy': {
    address: '616 E Washington St, Ann Arbor, MI 48104',
    neighborhoodSlug: 'downtown',
    intro: [
      'The Legacy at Ann Arbor is one of the newest student communities in town: 521 beds across 253 units at 616 E Washington St, in a 19-story high-rise plus a mid-rise attached to the historic Michigan Theatre. Fully furnished floor plans run from studios to five-bedroom apartments, 775 to 1,548 square feet, with quartz counters, stainless appliances, and in-unit laundry.',
      'More than 9,700 square feet of amenities include a rooftop pool deck, a resident clubroom with outdoor grilling, a gaming lawn with firepit seating, an academic lounge, and a fitness center. It leased out completely ahead of the 2025–26 school year — which is exactly when sublets become the only way in.',
    ],
    facts: [
      '616 E Washington St — adjacent to the Michigan Theatre, steps from campus',
      '19-story high-rise + mid-rise; 253 units, 521 beds',
      'Studios through 5-bedroom furnished apartments, 775–1,548 sq ft',
      'Rooftop pool deck, clubroom with grilling, gaming lawn with firepits',
      'Academic lounge and fitness center; quartz counters, in-unit laundry',
    ],
    faqs: [
      {
        question: 'Where is The Legacy at Ann Arbor located?',
        answer:
          'The Legacy at Ann Arbor is at 616 E Washington St, a 19-story high-rise and attached mid-rise next to the historic Michigan Theatre — immediately adjacent to the University of Michigan Central Campus in downtown Ann Arbor.',
      },
      {
        question: 'What amenities does The Legacy at Ann Arbor have?',
        answer:
          'The Legacy offers more than 9,700 square feet of amenities: a rooftop pool deck, a resident clubroom with outdoor grilling, a gaming lawn with firepit seating, an academic lounge, a fitness center, and bike storage. Apartments come fully furnished with quartz countertops and in-unit laundry.',
      },
      {
        question: 'How do I get a spot at The Legacy if it\'s fully leased?',
        answer:
          'The Legacy leased out completely ahead of the 2025–26 school year, so mid-year the realistic way in is a sublet or relet from a current resident. Sublets at The Legacy posted by verified University of Michigan students appear on Wroomly — save a search to get emailed when one posts.',
      },
    ],
  },
}

// Derive the building list from the same constant the listing form uses,
// so a building added to the picker automatically gets a landing page.
// Researched details are merged in when we have them.
export const BUILDINGS: BuildingContent[] = ANN_ARBOR_RESIDENCES.map(name => ({
  slug: slugify(name),
  name,
  ...(DETAILS[name] ?? {}),
}))

export function getBuilding(slug: string): BuildingContent | undefined {
  return BUILDINGS.find(b => b.slug === slug)
}

/** Buildings with researched content (address verified) — used by the index page. */
export function verifiedBuildings(): BuildingContent[] {
  return BUILDINGS.filter(b => !!b.address)
}

/**
 * Honest, non-fabricated overview paragraphs for a building we have NOT
 * verified facts about. Uses only the name — no invented addresses or
 * amenities. The live listings below add the real unique substance.
 */
export function buildingIntro(name: string): string[] {
  return [
    `${name} is one of the named student apartment communities University of Michigan students search for when they're looking to sublet near campus in Ann Arbor. If someone's leaving ${name} for the summer, a semester abroad, or an internship, this is where their sublet shows up on Wroomly.`,
    `Every listing below is posted by a verified @umich.edu student — so you're not wiring a deposit to a stranger off a Facebook group. If there are no live listings at ${name} right now, save a search and we'll email you the moment one posts.`,
  ]
}

/** FAQs for every building page: researched ones when present, else the honest generic pair. */
export function buildingFaqs(b: BuildingContent): { question: string; answer: string }[] {
  if (b.faqs && b.faqs.length > 0) return b.faqs
  return [
    subletFaq(b.name),
    {
      question: `How do I find a sublet at ${b.name}?`,
      answer: `Check the live listings for ${b.name} on Wroomly — every listing is posted by a University of Michigan student verified with an @umich.edu email. If nothing is live right now, save a search and you'll get an email the moment a ${b.name} sublet posts.`,
    },
  ]
}
