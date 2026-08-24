import { ReactNode } from 'react';
import Link from 'next/link';
import AdminNav from './AdminNav';

export const metadata = {
  title: 'Admin | Merritt Workspace',
  // Staff screens. Noindexed rather than robots.txt-disallowed for the same
  // reason as the member portal: a blocked crawl means Google never reads the
  // noindex, so a URL it discovers from a link can still surface as a bare
  // result.
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Link
            href="/admin/dashboard"
            className="font-semibold text-gray-900 hover:text-gray-700 flex-shrink-0"
          >
            Merritt Workspace · Admin
          </Link>
          <AdminNav />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
