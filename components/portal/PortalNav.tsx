"use client";

// Consistent navigation for every /portal/* page. Replaces the old bare
// "Main site"-only header so members can move between the dashboard, flex
// space, and their activity history without bouncing through the homepage.
//
// Adaptive: on the pre-auth pages (login, set-password, magic-link confirm,
// existing-member signup) there's no member yet, so we show just the brand +
// a link back to the main site. Once signed in, the full nav appears.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, CalendarClock, Receipt, LogOut, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const NAV_LINKS = [
  { href: '/portal', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/portal/flex-space', label: 'Flex Space', icon: CalendarClock, exact: false },
  { href: '/portal/activity', label: 'My Activity', icon: Receipt, exact: false },
];

// Pages shown before a member is authenticated — keep the chrome minimal.
const PRE_AUTH_PREFIXES = [
  '/portal/login',
  '/portal/set-password',
  '/portal/auth',
  '/portal/existing-member',
  '/portal/cancel-onboarding',
];

export default function PortalNav() {
  const router = useRouter();
  const pathname = usePathname() || '';
  const [email, setEmail] = useState<string | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.session?.user?.email ?? null);
      setAuthLoaded(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
      setAuthLoaded(true);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/portal/login');
  };

  const isPreAuthPage = PRE_AUTH_PREFIXES.some((p) => pathname.startsWith(p));
  // Show the full nav only when signed in and not on a pre-auth page.
  const showFullNav = authLoaded && Boolean(email) && !isPreAuthPage;

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="border-b bg-bone sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link href={showFullNav ? '/portal' : '/'} className="font-semibold text-ink whitespace-nowrap">
          Merritt Workspace <span className="text-ink-60 font-normal">· Member Portal</span>
        </Link>

        {showFullNav ? (
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            {NAV_LINKS.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                    active
                      ? 'bg-burnt-orange-50 text-burnt-orange-700'
                      : 'text-gray-600 hover:text-burnt-orange-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
            <a
              href="/"
              className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-ink-60 hover:text-ink hover:bg-linen transition whitespace-nowrap"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden lg:inline">Main site</span>
            </a>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-ink-60 hover:text-accent-deep hover:bg-linen transition whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </nav>
        ) : (
          <a href="/" className="text-sm text-ink-60 hover:text-ink whitespace-nowrap">
            Main site
          </a>
        )}
      </div>
    </header>
  );
}
