// SEO: real product FAQs, marked up as FAQPage JSON-LD on /guides.
// Answers are plain text (no markup) so they're valid in the schema.

export const FAQS: { question: string; answer: string }[] = [
  {
    question: 'Who can use Wroomly?',
    answer:
      'Wroomly is for University of Michigan students. Every account is verified with an @umich.edu email address before you can list a place or send an inquiry, so you know everyone on the platform is a real U of M student.',
  },
  {
    question: 'How does Wroomly keep payments safe?',
    answer:
      'Payments run through Stripe. When you book a sublet, your first month plus any deposit is collected through Wroomly and routed to the host through Stripe Connect — there is no wiring cash to a stranger. The host only gets connected to payouts after verifying their identity with Stripe.',
  },
  {
    question: 'What does Wroomly cost?',
    answer:
      'Listing your place is free. When a booking happens, the renter pays a 5% service fee plus card processing on top of the rent. The host receives the full rent they listed. There are no monthly fees and no cost to browse.',
  },
  {
    question: 'Does Wroomly handle every month of rent?',
    answer:
      'Wroomly collects the first month plus deposit at booking. After that, you arrange the remaining monthly rent directly with your host. This keeps the first, riskiest payment protected while letting you settle into a normal landlord-tenant rhythm afterward.',
  },
  {
    question: 'How do I get my security deposit back?',
    answer:
      'Document the place with timestamped photos when you move in and again when you move out, and get the deposit terms in writing before you pay. Under Michigan law, a deposit must be returned (or an itemized list of damages sent) within 30 days of the lease ending.',
  },
  {
    question: 'Is subletting allowed on my lease?',
    answer:
      'Most Ann Arbor leases allow subletting but require written landlord approval, and some charge a small fee. Always check your lease and get approval in writing before you sublet your place.',
  },
]
