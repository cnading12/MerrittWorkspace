// app/privacy/page.tsx
import Link from 'next/link';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Privacy Policy | Merritt Workspace',
  description:
    'How Merritt Workspace collects, uses, and protects your personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-bone pt-20">
      <section className="border-b border-clay py-16 md:py-24">
        <div className="mx-auto w-full max-w-3xl px-5 sm:px-8">
          <p className="mw-eyebrow mb-5">Legal</p>
          <h1 className="mw-h2">Privacy Policy</h1>
          <p className="mt-6 text-[15px] text-ink-60">Last updated 1 January 2025</p>
          <p className="mt-6 mw-body">
            How Merritt Workspace collects, uses, discloses and safeguards your
            personal information when you visit the building, use the website,
            or hold a membership.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mw-legal mx-auto w-full max-w-3xl px-5 sm:px-8">
          <h2>Introduction</h2>
          <p>
            Merritt Workspace (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or
            &ldquo;us&rdquo;) operates a coworking space at 2246 Irving Street,
            Denver, CO 80211. We are committed to protecting your privacy and to
            keeping your personal information secure.
          </p>
          <p>
            This policy describes what we collect, why, who else can see it, and
            what you can ask us to do about it.
          </p>

          <h2>Information we collect</h2>
          <h3>Personal information</h3>
          <ul>
            <li><strong>Contact information</strong> — name, email address, phone number, business address</li>
            <li><strong>Account information</strong> — username, password, membership preferences</li>
            <li><strong>Payment information</strong> — card details and billing address, processed securely through Stripe</li>
            <li><strong>Business information</strong> — company name, job title, industry, LinkedIn profile</li>
            <li><strong>Emergency contact</strong> — name, phone number, relationship</li>
            <li><strong>Identification</strong> — photo ID, for building security</li>
          </ul>

          <h3>Usage information</h3>
          <ul>
            <li>Building access logs (entry and exit times)</li>
            <li>Conference room bookings and usage</li>
            <li>Snackshop purchases</li>
            <li>Website usage data (IP address, browser type, pages visited)</li>
            <li>Security camera footage, in common areas only</li>
          </ul>

          <h3>Communications</h3>
          <p>
            When you contact us by email, phone or in person we keep the content
            of those communications and any attachments.
          </p>

          <h2>How we use it</h2>
          <h3>Service delivery</h3>
          <ul>
            <li>Process membership applications and manage accounts</li>
            <li>Provide building access and security</li>
            <li>Process conference room bookings and payments</li>
            <li>Fulfil snackshop orders</li>
            <li>Provide member support</li>
          </ul>

          <h3>Communication</h3>
          <ul>
            <li>Send booking confirmations and receipts</li>
            <li>Notify you about service updates or changes</li>
            <li>Send community event invitations, with your consent</li>
            <li>Respond to your enquiries and requests</li>
          </ul>

          <h3>Business operations</h3>
          <ul>
            <li>Maintain building security and safety</li>
            <li>Prevent fraud and unauthorised access</li>
            <li>Comply with legal obligations</li>
            <li>Improve our services and facilities</li>
            <li>Analyse usage patterns and trends</li>
          </ul>

          <h2>Sharing and disclosure</h2>
          <p>
            We do not sell, rent or trade your personal information. We share it
            only in these circumstances:
          </p>
          <ul>
            <li><strong>Service providers</strong> — Stripe for payments, Google for calendar, Resend for email and Supabase for data storage may access your information in order to provide those services on our behalf.</li>
            <li><strong>Legal requirements</strong> — where required by law, court order or a government authority, or to protect our rights, property or safety.</li>
            <li><strong>Business transfers</strong> — in a merger, acquisition or sale of assets, your information may transfer to the acquiring entity.</li>
            <li><strong>With your consent</strong> — where you have given us explicit permission.</li>
          </ul>

          <h2>Data security</h2>
          <p>
            We use appropriate technical and organisational measures to protect
            your information against unauthorised access, alteration, disclosure
            or destruction:
          </p>
          <ul>
            <li>Encrypted data transmission (SSL/TLS)</li>
            <li>Secure password storage using industry-standard hashing</li>
            <li>Regular security audits and updates</li>
            <li>Access to personal information on a need-to-know basis</li>
            <li>Physical security: access codes, locking offices and security cameras</li>
            <li>PCI-compliant payment processing through Stripe</li>
          </ul>
          <p className="border-l-2 border-clay pl-5 text-[16px]">
            No method of transmission over the internet or electronic storage is
            entirely secure. We work hard to protect your information but cannot
            guarantee absolute security.
          </p>

          <h2>Your rights and choices</h2>
          <ul>
            <li><strong>Access and correction</strong> — request access to your personal information and ask us to correct anything inaccurate.</li>
            <li><strong>Data portability</strong> — request a copy in a structured, commonly used format.</li>
            <li><strong>Deletion</strong> — request deletion, subject to legal retention requirements.</li>
            <li><strong>Marketing communications</strong> — opt out of marketing email by clicking unsubscribe or contacting us.</li>
            <li><strong>Account deactivation</strong> — ask us to deactivate your account at any time.</li>
          </ul>
          <p>
            To exercise any of these, write to{' '}
            <a href="mailto:memberservices@merrittworkspace.net">
              memberservices@merrittworkspace.net
            </a>.
          </p>

          <h2>Data retention</h2>
          <ul>
            <li><strong>Active members</strong> — duration of membership plus seven years for financial records</li>
            <li><strong>Booking records</strong> — seven years, for tax and accounting</li>
            <li><strong>Security footage</strong> — 30 to 90 days, unless needed for an investigation</li>
            <li><strong>Marketing contacts</strong> — until you unsubscribe or ask for deletion</li>
          </ul>

          <h2>Cookies and tracking</h2>
          <ul>
            <li><strong>Essential cookies</strong> — required for the site to work, such as login and cart</li>
            <li><strong>Analytics cookies</strong> — help us understand how visitors use the site</li>
            <li><strong>Preference cookies</strong> — remember your settings</li>
          </ul>
          <p>
            You can control cookies in your browser settings, though disabling
            some will affect how the site works.
          </p>

          <h2>Children&rsquo;s privacy</h2>
          <p>
            Our services are not directed at anyone under 18 and we do not
            knowingly collect information from children. If we learn we have
            collected information from a child without parental consent, we will
            delete it promptly.
          </p>

          <h2>Changes to this policy</h2>
          <p>We may update this policy. We will tell you about material changes by:</p>
          <ul>
            <li>Posting the updated policy here with a new &ldquo;last updated&rdquo; date</li>
            <li>Emailing active members</li>
            <li>Displaying a notice in the building</li>
          </ul>
          <p>
            Continuing to use our services after changes are posted means you
            accept the updated policy.
          </p>

          <h2>Contact us</h2>
          <p>
            Questions, concerns or requests about this policy or our data
            practices:
          </p>
          <div className="space-y-1 text-[16px] text-ink-60">
            <p className="font-semibold text-ink">Merritt Workspace</p>
            <p>2246 Irving Street</p>
            <p>Denver, CO 80211</p>
            <p className="pt-3">
              <a href="mailto:memberservices@merrittworkspace.net">
                memberservices@merrittworkspace.net
              </a>
            </p>
            <p>
              <a href="tel:303-359-8337">(303) 359-8337</a>
            </p>
          </div>

          <div className="mt-16 border-t border-clay pt-10">
            <Link href="/" className="mw-link">
              &larr; Back to home
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
