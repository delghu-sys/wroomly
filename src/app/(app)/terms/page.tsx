import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The agreement between you and Wroomly governing your use of the platform.',
}

const EFFECTIVE_DATE = 'May 12, 2026'

export default function TermsPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 prose prose-neutral prose-sm sm:prose-base">
      <header className="not-prose mb-10">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted font-medium mb-3">
          Legal
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink">
          Terms of Service
        </h1>
        <p className="text-ink-muted mt-3">
          Effective date: {EFFECTIVE_DATE}
        </p>
      </header>

      <section>
        <p>
          These Terms of Service (the &ldquo;<strong>Terms</strong>&rdquo;) form a
          binding agreement between you (&ldquo;<strong>you</strong>,&rdquo;
          &ldquo;<strong>your</strong>,&rdquo; or &ldquo;<strong>User</strong>&rdquo;)
          and Wroomly (&ldquo;<strong>Wroomly</strong>,&rdquo;
          &ldquo;<strong>we</strong>,&rdquo; &ldquo;<strong>our</strong>,&rdquo; or
          &ldquo;<strong>us</strong>&rdquo;) governing your access to and use of the
          Wroomly website, mobile applications, and related services
          (collectively, the &ldquo;<strong>Service</strong>&rdquo;). By creating an
          account, posting a listing, sending an inquiry, or otherwise using the
          Service, you confirm that you have read, understood, and agreed to these
          Terms and to our <Link href="/privacy">Privacy Policy</Link>. If you do
          not agree, you may not use the Service.
        </p>
      </section>

      <h2>1. Nature of the Service; Wroomly is Not a Party to Rentals</h2>
      <p>
        Wroomly is a neutral online venue that allows verified
        university-affiliated users (&ldquo;<strong>Suppliers</strong>&rdquo;) to
        list housing for sublet, swap, or short-term rental, and that allows other
        university-affiliated users (&ldquo;<strong>Consumers</strong>&rdquo;) to
        discover and inquire about those listings. <strong>Wroomly is not a
        landlord, tenant, broker, real-estate agent, property manager, leasing
        agent, or party to any rental, sublease, swap, license, or other
        arrangement between Users.</strong> Any agreement entered into between a
        Supplier and a Consumer is a private agreement strictly between those
        Users, and Wroomly has no obligations or liability under or in
        connection with that agreement.
      </p>

      <h2>2. Eligibility &amp; Accounts</h2>
      <ul>
        <li>
          You must be at least eighteen (18) years old to use the Service.
          Suppliers must hold a valid &ldquo;@umich.edu&rdquo; email
          address. Consumers may register with any valid email address.
        </li>
        <li>
          You agree to provide accurate, current, and complete information when
          registering, and to keep that information up to date. You are responsible
          for all activity that occurs under your account and for safeguarding your
          password.
        </li>
        <li>
          We may refuse, suspend, or terminate any account, in our sole discretion,
          for any reason or no reason, with or without notice.
        </li>
      </ul>

      <h2>
        3. Sublets, Swaps, and Lease Compliance — Supplier Representations &amp; Assumption of Risk
      </h2>
      <p>
        If you post a Listing as a Supplier, you represent and warrant, on each
        occasion you post or update a Listing and on each occasion you accept an
        inquiry, that:
      </p>
      <ol>
        <li>
          You have the full legal right, power, and authority to sublet, swap,
          assign, license, or otherwise grant occupancy of the property described
          in the Listing for the dates, scope, and terms you have published;
        </li>
        <li>
          Your sublet, swap, or rental of the property is permitted under your
          lease, deed, condominium documents, homeowners&rsquo; association rules,
          mortgage, insurance policies, applicable local zoning and short-term
          rental ordinances, and all other applicable laws and contracts, and where
          required you have obtained your landlord&rsquo;s, property
          manager&rsquo;s, association&rsquo;s, or other necessary written consent;
        </li>
        <li>
          The Listing is accurate in all material respects and the photographs
          depict the actual property being offered;
        </li>
        <li>
          You will collect, remit, and report any applicable taxes (including but
          not limited to occupancy, lodging, sales, or use taxes); and
        </li>
        <li>
          You will comply with all applicable fair-housing, anti-discrimination,
          tenant-screening, and consumer-protection laws.
        </li>
      </ol>
      <p>
        <strong>
          Wroomly does not verify whether a Supplier&rsquo;s lease, landlord,
          condominium association, mortgage, or local law permits the sublet or
          swap being offered, and Wroomly assumes no responsibility whatsoever
          for doing so. Wroomly expressly disclaims any and all liability arising
          from or related to unauthorized subletting, assignment, or occupancy.
        </strong>{' '}
        Suppliers are solely responsible for confirming that each posting and each
        transaction is lawful and permitted, and Suppliers bear all consequences if
        a posting or transaction was not in fact permitted, including without
        limitation eviction, lease termination, fines, penalties, damages, claims
        by landlords or co-tenants, refund obligations to Consumers, loss of
        deposit, or liability to the Consumer or third parties.
      </p>
      <p>
        <strong>
          By listing a property on Wroomly, Suppliers acknowledge and agree
          that they have independently determined that their sublet, swap, or
          rental is permitted under all applicable agreements and laws, and that
          Wroomly bears no responsibility or liability if it is not. Suppliers
          agree to indemnify and hold harmless Wroomly for any claim, loss,
          damage, fine, penalty, or expense (including reasonable attorneys&rsquo;
          fees) arising from a listing that was not authorized by the
          Supplier&rsquo;s landlord, property manager, condominium association,
          or applicable law.
        </strong>
      </p>
      <p>
        Consumers acknowledge that a Supplier&rsquo;s sublet may be canceled or
        interrupted by a landlord, association, or governmental authority, and that
        Wroomly is not liable for any such cancellation or interruption.
        Consumers are encouraged to independently verify the Supplier&rsquo;s
        authority to sublet before entering into any agreement.
      </p>

      <h2>4. Consumer Responsibilities</h2>
      <p>
        Consumers are responsible for independently verifying any Supplier and
        Listing before paying any money, signing any document, or relying on any
        statement. We strongly encourage Consumers to (a) tour the property in
        person or via live video, (b) review the Supplier&rsquo;s underlying lease
        and obtain written confirmation from the Supplier&rsquo;s landlord that the
        sublet is authorized, (c) execute a written sublease or occupancy
        agreement, and (d) carry renters&rsquo; or guest insurance. Failure to take
        these steps is at the Consumer&rsquo;s sole risk.
      </p>

      <h2>5. Prohibited Conduct</h2>
      <p>You agree that you will not, and will not assist anyone else to:</p>
      <ul>
        <li>
          Post any Listing that is inaccurate, misleading, fraudulent, or that you
          do not have the legal right to offer;
        </li>
        <li>
          Use the Service to discriminate against any person on the basis of race,
          color, religion, national origin, ancestry, sex, gender, gender identity
          or expression, sexual orientation, age, marital or familial status,
          disability, military or veteran status, source of income, or any other
          characteristic protected by applicable law;
        </li>
        <li>
          Circumvent the Service to evade fees, taxes, or platform rules
          (including by directing Users to transact off-platform after being
          introduced through the Service);
        </li>
        <li>
          Harass, threaten, defame, impersonate, or stalk any other User;
        </li>
        <li>
          Upload viruses, malware, scraping bots, or attempt to compromise the
          security, integrity, or availability of the Service;
        </li>
        <li>
          Use the Service for any illegal purpose or in violation of any local,
          state, federal, or international law.
        </li>
      </ul>

      <h2>6. User Content; License to Wroomly</h2>
      <p>
        You retain ownership of the text, photographs, videos, and other materials
        you submit to the Service (&ldquo;<strong>User Content</strong>&rdquo;). By
        submitting User Content, you grant Wroomly a worldwide, royalty-free,
        sublicensable, transferable, non-exclusive license to host, store,
        reproduce, modify, create derivative works of, publicly display, publicly
        perform, and distribute that User Content solely to operate, improve,
        promote, and provide the Service. You represent and warrant that you own
        or have obtained all rights necessary to grant this license and that your
        User Content does not infringe or violate the rights of any third party.
      </p>

      <h2>7. Fees, Payments, and Taxes</h2>
      <p>
        Where the Service facilitates payments (for example, through a third-party
        processor such as Stripe), each User authorizes Wroomly and its
        processors to charge their designated payment method for the amounts shown
        at checkout, including any platform fee, deposit, rent, refund, or
        adjustment. Suppliers are solely responsible for setting prices, issuing
        refunds where appropriate, and complying with tax obligations. Disputed
        charges should first be raised with the other User, and may then be
        escalated to Wroomly, but final resolution of any underlying rental
        dispute is between the Supplier and Consumer.
      </p>

      <h2>8. Reviews &amp; Moderation</h2>
      <p>
        We may, but are not obligated to, review, screen, or moderate Listings,
        reviews, messages, or other User Content, including through automated
        tools. We may remove or refuse to publish any content, at any time, for
        any reason. Reviews must reflect the reviewer&rsquo;s honest, first-hand
        experience and must not contain prohibited content. We are not responsible
        for the accuracy of reviews.
      </p>

      <h2>9. Intellectual Property</h2>
      <p>
        The Service, including its design, logos, trademarks, service marks,
        trade names (&ldquo;Wroomly,&rdquo; the &ldquo;W&rdquo; logo mark),
        and all software, text, graphics, and other content provided by
        Wroomly (collectively, &ldquo;<strong>Wroomly Content</strong>&rdquo;),
        are owned by or licensed to Wroomly and are protected by copyright,
        trademark, and other intellectual property laws. You may not copy,
        modify, distribute, sell, or lease any part of the Wroomly Content,
        nor may you reverse engineer or attempt to extract the source code of
        our software, unless applicable laws prohibit these restrictions or you
        have our written permission.
      </p>

      <h2>10. Privacy &amp; Data</h2>
      <p>
        Our collection, use, and sharing of personal information is described
        in our <Link href="/privacy">Privacy Policy</Link>, which is
        incorporated into these Terms by reference. By using the Service, you
        consent to the collection and use of information as described therein.
      </p>

      <h2>11. Disclaimer of Warranties</h2>
      <p className="uppercase text-xs leading-relaxed tracking-wide">
        The Service and all content available through it are provided
        &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of
        any kind, whether express, implied, statutory, or otherwise. To the maximum
        extent permitted by law, Wroomly disclaims all warranties, including
        any warranty of merchantability, fitness for a particular purpose,
        non-infringement, title, accuracy, completeness, quiet enjoyment, or
        habitability. Wroomly does not warrant that any listing is legal,
        permitted, available, accurate, or safe; that any User is who they claim
        to be; that any Supplier holds the right to sublet or swap; or that the
        Service will be uninterrupted, secure, or error-free. You use the Service
        at your own risk.
      </p>

      <h2>12. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, in no event will Wroomly, its
        affiliates, officers, directors, employees, agents, contractors, licensors,
        or suppliers be liable to you or any third party for any indirect,
        incidental, special, exemplary, consequential, or punitive damages,
        including without limitation damages for loss of profits, revenue, data,
        goodwill, use, or other intangible losses, arising out of or in connection
        with these Terms, the Service, any Listing, any agreement between Users,
        or any inability to use the Service, even if we have been advised of the
        possibility of such damages.
      </p>
      <p>
        Without limiting the foregoing, Wroomly shall have no liability
        whatsoever for any damages, losses, costs, fines, penalties, eviction
        proceedings, lease terminations, or other adverse consequences suffered
        by any User arising from or related to (a) a Supplier&rsquo;s failure to
        obtain authorization to sublet, swap, or otherwise transfer occupancy of
        a property; (b) a landlord&rsquo;s, property manager&rsquo;s, or
        condominium association&rsquo;s decision to prohibit, cancel, or
        terminate a sublet or swap; or (c) any violation of a lease, contract,
        ordinance, or law by any User.
      </p>
      <p>
        To the maximum extent permitted by law, Wroomly&rsquo;s aggregate
        liability arising out of or relating to these Terms or the Service will
        not exceed the greater of (i) the total fees you paid to Wroomly
        directly (excluding amounts paid to or received from another User) in the
        twelve (12) months preceding the event giving rise to the claim, or
        (ii) one hundred U.S. dollars (US $100).
      </p>
      <p>
        Some jurisdictions do not allow the exclusion of certain warranties or
        the limitation of certain damages. In such jurisdictions, the foregoing
        limitations apply only to the maximum extent permitted by applicable law.
      </p>

      <h2>13. Indemnification</h2>
      <p>
        You agree to defend, indemnify, and hold harmless Wroomly and its
        affiliates, officers, directors, employees, agents, contractors,
        licensors, and suppliers from and against any and all claims, liabilities,
        damages, losses, judgments, fines, penalties, settlements, costs, and
        expenses (including reasonable attorneys&rsquo; fees) arising out of or
        related to: (a) your User Content; (b) your use of, or misuse of, the
        Service; (c) your breach of these Terms or any representation or warranty
        you make in them; (d) any agreement you enter into with another User; (e)
        any claim by your landlord, property manager, condominium association,
        co-tenant, neighbor, or governmental authority that your sublet, swap, or
        listing was not permitted; and (f) your violation of any law or the rights
        of any third party.
      </p>

      <h2>14. Termination</h2>
      <p>
        You may stop using the Service at any time. We may suspend or terminate
        your access to the Service, remove or hide your Listings or other content,
        and disable your account, at any time, with or without notice and with or
        without cause. Sections that by their nature should survive termination
        (including Sections 1, 3, 6&ndash;13, and 15&ndash;17) will survive.
      </p>

      <h2>15. Dispute Resolution; Governing Law; Venue</h2>
      <p>
        These Terms and any dispute arising out of or relating to them or the
        Service are governed by the laws of the State of Michigan, without regard
        to its conflict-of-laws principles. You and Wroomly agree that the
        exclusive jurisdiction and venue for any dispute that is not subject to
        binding arbitration will lie in the state or federal courts located in
        Washtenaw County, Michigan, and each party irrevocably consents to the
        personal jurisdiction of those courts.
      </p>
      <p>
        Before filing a lawsuit, the parties agree to attempt in good faith to
        resolve any dispute informally for at least thirty (30) days after written
        notice. The parties may agree in writing to submit any unresolved dispute
        to binding arbitration on the rules of a mutually acceptable arbitral
        body, in which case the arbitrator&rsquo;s decision will be final and
        enforceable as a court judgment. <strong>You and Wroomly agree that
        any claim will be brought solely in an individual capacity and not as a
        plaintiff or class member in any purported class, collective, or
        representative action.</strong>
      </p>

      <h2>16. Changes to the Service or Terms</h2>
      <p>
        We may modify the Service or these Terms at any time. If we make a
        material change to the Terms, we will provide notice through the Service
        or by email and will update the &ldquo;Effective date&rdquo; above.
        Continued use of the Service after the effective date of any change
        constitutes your acceptance of the updated Terms. If you do not agree to
        the updated Terms, your sole remedy is to stop using the Service and to
        close your account.
      </p>

      <h2>17. Miscellaneous</h2>
      <ul>
        <li>
          <strong>Entire agreement.</strong> These Terms, together with the
          Privacy Policy and any other policies referenced in them, constitute the
          entire agreement between you and Wroomly regarding the Service and
          supersede all prior agreements on that subject.
        </li>
        <li>
          <strong>Severability.</strong> If any provision of these Terms is held
          to be invalid or unenforceable, that provision will be enforced to the
          maximum extent permitted, and the remaining provisions will remain in
          full force and effect.
        </li>
        <li>
          <strong>No waiver.</strong> Our failure to enforce any provision will
          not constitute a waiver of that or any other provision.
        </li>
        <li>
          <strong>Assignment.</strong> You may not assign or transfer these Terms
          without our prior written consent. We may assign these Terms freely.
        </li>
        <li>
          <strong>No agency.</strong> No partnership, joint venture, employment, or
          agency relationship is created by these Terms.
        </li>
        <li>
          <strong>Force majeure.</strong> Wroomly shall not be liable for any
          delay or failure in performance resulting from causes beyond its
          reasonable control, including but not limited to acts of God, natural
          disasters, pandemic, war, terrorism, labor disputes, government
          actions, or internet service disruptions.
        </li>
        <li>
          <strong>Contact.</strong> Questions about these Terms may be sent to{' '}
          <a href="mailto:legal@wroomly.com">legal@wroomly.com</a>.
        </li>
      </ul>

      <hr />
      <p className="text-sm text-ink-muted">
        Wroomly is an independent platform and is not affiliated with,
        endorsed by, or sponsored by the University of Michigan or its Board of
        Regents.
      </p>
    </article>
  )
}
