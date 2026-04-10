import { FileText } from 'lucide-react';
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
    <main className="min-h-screen bg-gray-50 pt-16">
      <section className="bg-gradient-to-br from-orange-50 to-orange-100 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Terms &amp; Conditions
          </h1>
          <p className="text-lg text-gray-600">
            Effective 1/1/2024 · Document version {DOCUMENT_VERSION}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            These are the same Terms &amp; Conditions every member signs in the
            Merritt Workspace member portal.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-10">
            <pre className="whitespace-pre-wrap break-words font-sans text-[15px] leading-relaxed text-gray-800">
{TERMS_AND_CONDITIONS_TEXT}
            </pre>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-8 mt-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Questions about these terms?
            </h2>
            <p className="text-gray-700 mb-4">
              Contact Merritt Workspace Management and we&rsquo;ll be happy to help.
            </p>
            <div className="space-y-1 text-gray-700">
              <p><strong>Merritt 23 LLC dba Merritt Workspace</strong></p>
              <p>2246 Irving Street, Denver, CO 80211</p>
              <p className="mt-3">
                <strong>Email:</strong>{' '}
                <a
                  href="mailto:memberservices@merrittworkspace.net"
                  className="text-orange-600 hover:underline"
                >
                  memberservices@merrittworkspace.net
                </a>
              </p>
              <p>
                <strong>Phone:</strong>{' '}
                <a href="tel:720-357-9499" className="text-orange-600 hover:underline">
                  (720) 357-9499
                </a>
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/"
              className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
