import Link from 'next/link';
import Footer from '@/components/Footer';
import {
  TERMS_AND_CONDITIONS_TEXT,
  DOCUMENT_VERSION,
} from '@/lib/portal/legal';

export const metadata = {
  title: 'Terms & Conditions | Merritt Workspace',
  description:
    'The official Merritt Workspace Terms & Conditions that apply to every membership.',
};

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-bone pt-20">
      <section className="border-b border-clay py-16 md:py-24">
        <div className="mx-auto w-full max-w-3xl px-5 sm:px-8">
          <p className="mw-eyebrow mb-5">Legal</p>
          <h1 className="mw-h2">Terms &amp; Conditions</h1>
          <p className="mt-6 text-[15px] text-ink-60">
            Effective 1 January 2024 &middot; Document version {DOCUMENT_VERSION}
          </p>
          <p className="mt-2 text-[15px] text-ink-60">
            The same terms every member signs in the member portal.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto w-full max-w-3xl px-5 sm:px-8">
          <pre className="whitespace-pre-wrap break-words font-sans text-[16px] leading-relaxed text-ink-60">
{TERMS_AND_CONDITIONS_TEXT}
          </pre>

          <div className="mt-16 border-t border-clay pt-10">
            <h2 className="mw-h3">Questions about these terms?</h2>
            <p className="mt-4 mw-body">
              Contact Merritt Workspace management and we&rsquo;ll be happy to help.
            </p>
            <div className="mt-6 space-y-1 text-[16px] text-ink-60">
              <p className="font-semibold text-ink">Merritt 23 LLC dba Merritt Workspace</p>
              <p>2246 Irving Street, Denver, CO 80211</p>
              <p className="pt-3">
                <a
                  href="mailto:memberservices@merrittworkspace.net"
                  className="mw-inline-link"
                >
                  memberservices@merrittworkspace.net
                </a>
              </p>
              <p>
                <a href="tel:720-357-9499" className="mw-inline-link">
                  (720) 357-9499
                </a>
              </p>
            </div>
          </div>

          <div className="mt-12">
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
