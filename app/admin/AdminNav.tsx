"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/applications', label: 'Applications' },
  { href: '/admin/members', label: 'Members' },
  { href: '/admin/documents', label: 'Documents' },
  { href: '/admin/access-codes', label: 'Access codes' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Hide nav on the sign-in page itself.
  if (pathname === '/admin') return null;

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/admin');
  }

  return (
    <div className="flex items-center gap-6">
      <nav className="flex gap-1 text-sm">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-md transition ${
                active
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={signOut}
        className="text-xs text-gray-500 hover:text-gray-900 border border-gray-300 rounded px-2 py-1"
      >
        Sign out
      </button>
    </div>
  );
}
