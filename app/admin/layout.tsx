import { ReactNode } from 'react';
import Link from 'next/link';
import AdminNav from './AdminNav';

export const metadata = { title: 'Admin | Merritt Workspace' };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/admin/dashboard" className="font-semibold text-gray-900 hover:text-gray-700">
            Merritt Workspace · Admin
          </Link>
          <AdminNav />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
