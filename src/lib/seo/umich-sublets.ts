import { clampMeta, clampTitle } from './meta.ts'

export const UMICH_TITLE = clampTitle('UMich Sublets in Ann Arbor: Verified Students')
export const UMICH_DESCRIPTION = clampMeta(
  'Browse University of Michigan sublets in Ann Arbor, posted by students. Summer and winter terms, with a blue check on verified UMich accounts.',
)

// Plain-text answers, 40-60 words each, self-contained so they can be quoted.
export const UMICH_FAQS = [
  {
    question: 'Can I sublet my apartment as a University of Michigan student?',
    answer:
      'Usually, but check your lease first. In Michigan a tenant generally needs the landlord’s written consent to sublet, either in the lease or in a separate signed document. U-M Student Legal Services advises putting the sublease in writing and keeping a copy, because you stay responsible to your landlord.',
  },
  {
    question: 'What is the best time to find a UMich sublet?',
    answer:
      'Summer sublets (May to August) are the most common, and most are posted from February through April. Winter sublets (January to April) appear from October through January, mostly from students leaving for study abroad or a co-op. Start looking six to eight weeks before you need to move in.',
  },
  {
    question: 'How do I know a sublet is real and not a scam?',
    answer:
      'Be wary of anyone who wants to rent sight unseen, asks for a wire, gift card or crypto, or pushes you off the platform. Tour in person or on video, confirm the person is a U-M student, and put the agreement in writing. On Wroomly, a blue check means the account signed in with a UMich Google account.',
  },
  {
    question: 'What does the blue check on Wroomly mean?',
    answer:
      'The blue check means the person signed in with their University of Michigan Google account, so the address belongs to a real U-M account holder. It is a badge only. It does not mean Wroomly has inspected the place or vouches for the lease, so you should still tour it and get the agreement in writing.',
  },
  {
    question: 'Is it free to list a sublet on Wroomly?',
    answer:
      'Yes. Listing is free. You can paste an existing post from another site and Wroomly turns it into a draft, which only you can edit and publish. Nothing goes live until you confirm it.',
  },
]
