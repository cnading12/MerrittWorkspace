import { ReactNode } from 'react';
import Link from 'next/link';

export const metadata = { title: 'Admin | Merritt Workspace' };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-semibold text-gray-900">Merritt Workspace · Admin</div>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin/applications" className="text-gray-600 hover:text-gray-900">Applications</Link>
            <Link href="/admin/members" className="text-gray-600 hover:text-gray-900">Members</Link>
            <Link href="/admin/access-codes" className="text-gray-600 hover:text-gray-900">Access codes</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
