"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Dashboard is handled by the dedicated Home button so it doesn't also live
// in the section tabs (keeps "go home" conceptually separate from "switch
// sections").
const NAV = [
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

  const onDashboard = pathname === '/admin/dashboard';

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <Link
        href="/admin/dashboard"
        className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition border ${
          onDashboard
            ? 'bg-gray-900 text-white border-gray-900'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
        aria-label="Back to dashboard home"
      >
        <HomeIcon />
        Home
      </Link>
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

function HomeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-6h-2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}
