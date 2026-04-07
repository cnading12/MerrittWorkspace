import { ReactNode } from 'react';
import Link from 'next/link';
import AdminNav from './AdminNav';

export const metadata = { title: 'Admin | Merritt Workspace' };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2 font-semibold text-gray-900 hover:text-gray-700 flex-shrink-0"
            title="Back to dashboard"
          >
            <span
              aria-hidden
              className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-gray-900 text-white text-sm"
            >
              ⌂
            </span>
            <span className="hidden sm:inline">Merritt Workspace · Admin</span>
          </Link>
          <AdminNav />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
