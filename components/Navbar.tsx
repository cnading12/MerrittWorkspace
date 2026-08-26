"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { X, ChevronDown, Phone, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { trackPhoneClick } from '@/lib/gtag';
import { supabase } from '@/lib/supabase';

// Routes whose pages open with a full-bleed photo hero. On these the bar
// starts fully transparent — light marks over the darkened image — and takes
// its solid treatment on scroll. Everywhere else stays solid at all scroll
// positions: a transparent bar over a light page body is unreadable, so
// transparency is opt-in per route, never the default.
//
// A route belongs here only once its page opens with <PageHero> (or the
// homepage's own full-bleed hero). Adding one without that makes its nav
// illegible over a light page body.
const HERO_ROUTES = new Set([
  '/',
  '/about',
  '/membership/cafe',
  '/membership',
  '/membership/dedicated-desk',
  '/membership/private-office',
  '/member-resources/faqs',
  '/member-resources/snackshop',
  '/member-resources/meeting-rooms',
  '/member-resources/flex-space',
  '/contact',
]);

// The same links, order and destinations the bar has always had, lifted into
// data so the mobile drawer can group them under section labels.
const NAV_GROUPS = [
  {
    label: 'Member Resources',
    key: 'member-resources',
    width: 'w-48',
    items: [
      { href: '/member-resources/snackshop', label: 'Snackshop' },
      { href: '/member-resources/meeting-rooms', label: 'Conference Room' },
      { href: '/member-resources/flex-space', label: 'Flex Space' },
      { href: '/member-resources/faqs', label: "FAQ's" },
    ],
  },
  {
    label: 'Membership',
    key: 'membership',
    width: 'w-52',
    items: [
      { href: '/membership', label: 'All Membership Options', featured: true },
      { href: '/membership/cafe', label: 'Café Membership' },
      { href: '/membership/dedicated-desk', label: 'Dedicated Desk' },
      { href: '/membership/private-office', label: 'Private Office' },
    ],
  },
] as const;

const NAV_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
] as const;

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showNav, setShowNav] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  // The drawer renders through a portal; wait for mount so the SSR markup
  // and the first client render agree.
  const [mounted, setMounted] = useState(false);
  const lastScroll = useRef(0);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Track Supabase auth state
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUserEmail(data.session?.user?.email ?? null);
      setAuthLoaded(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
      setAuthLoaded(true);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const closeAllMenus = useCallback(() => {
    setMenuOpen(false);
    setOpenDropdown(null);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    closeAllMenus();
    router.push('/');
  };

  // Lock the page behind the drawer.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Hide on scroll down, reveal on scroll up; solid past 50px.
  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      setScrolled(current > 50);

      if (current <= 0) {
        setShowNav(true);
        lastScroll.current = 0;
        return;
      }
      if (current < lastScroll.current) {
        setShowNav(true);
      } else if (current > lastScroll.current) {
        setShowNav(false);
        setMenuOpen(false);
        setOpenDropdown(null);
      }
      lastScroll.current = current;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Outside click closes dropdowns; Escape closes everything.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  // The public marketing navbar should never appear on authenticated
  // surfaces (admin panel, member portal) — those pages have their own
  // headers, and the public nav's fixed z-50 would otherwise overlay them.
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/portal')) {
    return null;
  }

  const overHero = !!pathname && HERO_ROUTES.has(pathname) && !scrolled && !menuOpen;

  const linkColor = overHero
    ? 'text-bone/85 hover:text-bone'
    : 'text-ink-60 hover:text-ink';
  const barColor = overHero ? 'bg-bone' : 'bg-ink';
  const panelClass = 'bg-bone border border-clay shadow-[0_10px_30px_rgba(26,22,19,0.12)] py-2';
  const itemClass = 'block px-4 py-2 text-ink-60 hover:bg-linen hover:text-ink transition';

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ease-in-out ${
        showNav || menuOpen ? 'translate-y-0' : '-translate-y-full'
      }`}
      style={{ willChange: 'transform' }}
    >
      <div
        className={`w-full transition-all duration-300 ${
          overHero
            ? 'bg-transparent'
            : 'bg-bone/95 backdrop-blur-md shadow-[0_1px_20px_rgba(26,22,19,0.07)] border-b border-clay'
        }`}
      >
        <nav ref={navRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="shrink-0 hover:opacity-80 transition">
              <Image
                src="/images/brand/logo.webp"
                alt="Merritt Workspace Logo"
                width={180}
                height={48}
                className={`h-12 w-auto transition-all duration-300 ${overHero ? 'brightness-0 invert' : ''}`}
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-4 xl:space-x-8">
              {NAV_GROUPS.map((group) => (
                <div key={group.key} className="relative">
                  <button
                    onClick={() => setOpenDropdown((v) => (v === group.key ? null : group.key))}
                    className={`flex items-center whitespace-nowrap transition ${linkColor}`}
                    aria-expanded={openDropdown === group.key}
                    aria-haspopup="true"
                  >
                    {group.label}
                    <ChevronDown
                      className={`ml-1 w-4 h-4 transition-transform ${openDropdown === group.key ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {openDropdown === group.key && (
                    <div className={`absolute top-full left-0 mt-2 ${group.width} ${panelClass}`}>
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`${itemClass} ${'featured' in item && item.featured ? 'font-semibold border-b border-clay' : ''}`}
                          onClick={closeAllMenus}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className={`whitespace-nowrap transition ${linkColor}`}>
                  {link.label}
                </Link>
              ))}

              {/* Phone Number */}
              <a
                href="tel:7203579499"
                onClick={trackPhoneClick}
                className={`flex items-center gap-1 whitespace-nowrap transition ${linkColor}`}
              >
                <Phone className="w-4 h-4" />
                <span className="hidden xl:inline">(720) 357-9499</span>
              </a>

              {/* Auth-aware actions */}
              {authLoaded && userEmail ? (
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown((v) => (v === 'account' ? null : 'account'))}
                    className={`flex items-center gap-2 whitespace-nowrap px-5 py-2.5 text-[15px] font-medium transition ${
                      overHero
                        ? 'bg-bone text-ink hover:bg-white'
                        : 'bg-accent text-white hover:bg-accent-deep'
                    }`}
                    aria-expanded={openDropdown === 'account'}
                    aria-haspopup="true"
                  >
                    <User className="w-4 h-4" />
                    My Portal
                    <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'account' ? 'rotate-180' : ''}`} />
                  </button>

                  {openDropdown === 'account' && (
                    <div className={`absolute top-full right-0 mt-2 w-60 ${panelClass}`}>
                      <div className="px-4 py-2 text-xs text-ink-60 border-b border-clay truncate">
                        {userEmail}
                      </div>
                      <Link href="/portal" className={`flex items-center gap-2 ${itemClass}`} onClick={closeAllMenus}>
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className={`flex items-center gap-2 w-full text-left ${itemClass}`}
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/portal/login"
                    className={`whitespace-nowrap px-5 py-2 text-[15px] font-medium border transition ${
                      overHero
                        ? 'border-bone/60 text-bone hover:bg-bone hover:text-ink'
                        : 'border-ink text-ink hover:bg-ink hover:text-bone'
                    }`}
                  >
                    Member Login
                  </Link>
                  <Link
                    href="/membership/apply"
                    className={`whitespace-nowrap px-6 py-2.5 text-[15px] font-medium transition ${
                      overHero
                        ? 'bg-bone text-ink hover:bg-white'
                        : 'bg-accent text-white hover:bg-accent-deep'
                    }`}
                  >
                    Apply Today
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger — animates into an X */}
            <button
              className={`lg:hidden shrink-0 relative min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors duration-200 [-webkit-tap-highlight-color:transparent] ${
                overHero ? 'text-bone hover:bg-bone/15' : 'text-ink hover:bg-linen'
              }`}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              // The open drawer sits above this button, so it is unreachable
              // by pointer; take it out of the tab order too rather than
              // leaving a focusable control behind an aria-modal dialog.
              tabIndex={menuOpen ? -1 : 0}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <div className="relative w-7 h-6">
                <span className={`absolute top-[4px] left-0 w-7 h-[3px] rounded-full transition-all duration-300 ${barColor} ${menuOpen ? 'rotate-45 top-[11px]' : ''}`} />
                <span className={`absolute top-[11px] left-0 w-7 h-[3px] rounded-full transition-opacity duration-300 ${barColor} ${menuOpen ? 'opacity-0' : 'opacity-100'}`} />
                <span className={`absolute top-[18px] left-0 w-7 h-[3px] rounded-full transition-all duration-300 ${barColor} ${menuOpen ? '-rotate-45 top-[11px]' : ''}`} />
              </div>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile drawer — portalled to <body>. The header is a transformed
          fixed element, so it cannot be the drawer's containing block; the
          portal is what lets the overlay actually cover the viewport. */}
      {mounted && createPortal(
        <div
          className={`lg:hidden fixed inset-0 z-[70] transition-all duration-300 ease-out ${
            menuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
        >
          <div className="absolute inset-0 bg-bone" />
          <div
            className={`relative flex h-[100dvh] flex-col transition-transform duration-300 ease-out ${
              menuOpen ? 'translate-y-0' : '-translate-y-2'
            }`}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-3">
              <Link href="/" onClick={closeAllMenus} className="flex min-h-[44px] items-center">
                <Image
                  src="/images/brand/logo.webp"
                  alt="Merritt Workspace Logo"
                  width={150}
                  height={40}
                  className="h-10 w-auto"
                />
              </Link>
              <button
                aria-label="Close menu"
                onClick={closeAllMenus}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink hover:bg-linen transition-colors duration-200 [-webkit-tap-highlight-color:transparent]"
              >
                <X size={26} />
              </button>
            </div>

            {/* Destinations */}
            <nav className="flex-1 overflow-y-auto px-6 pt-2 pb-4">
              {NAV_GROUPS.map((group, gi) => (
                <div key={group.key} className={gi > 0 ? 'mt-7' : ''}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-60">
                    {group.label}
                  </p>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={closeAllMenus}
                          className={`flex items-center gap-3 py-[7px] font-display text-[22px] leading-snug transition-colors duration-150 ${
                            pathname === item.href ? 'font-bold text-ink' : 'text-ink/80 active:text-ink'
                          }`}
                        >
                          {pathname === item.href && (
                            <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                          )}
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="mt-7 pt-6 border-t border-clay">
                <ul>
                  {NAV_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={closeAllMenus}
                        className={`flex items-center gap-3 py-[7px] font-display text-[22px] leading-snug transition-colors duration-150 ${
                          pathname === link.href ? 'font-bold text-ink' : 'text-ink/80 active:text-ink'
                        }`}
                      >
                        {pathname === link.href && (
                          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                        )}
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {authLoaded && userEmail && (
                <div className="mt-7 pt-6 border-t border-clay">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-60">
                    Your account
                  </p>
                  <p className="mb-2 truncate text-[13px] text-ink-60">{userEmail}</p>
                  <ul>
                    <li>
                      <Link
                        href="/portal"
                        onClick={closeAllMenus}
                        className="flex items-center gap-3 py-[7px] font-display text-[22px] leading-snug text-ink/80 active:text-ink"
                      >
                        Dashboard
                      </Link>
                    </li>
                    <li>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 py-[7px] text-[15px] text-ink-60 active:text-ink"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </nav>

            {/* Pinned actions */}
            <div className="px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1.25rem)] border-t border-clay bg-bone">
              {authLoaded && userEmail ? (
                <Link
                  href="/portal"
                  onClick={closeAllMenus}
                  className="flex min-h-[44px] items-center justify-center gap-2 bg-accent py-4 text-[15px] font-medium text-white transition-colors duration-200 active:bg-accent-deep"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  My Portal
                </Link>
              ) : (
                <Link
                  href="/membership/apply"
                  onClick={closeAllMenus}
                  className="flex min-h-[44px] items-center justify-center bg-accent py-4 text-[15px] font-medium text-white transition-colors duration-200 active:bg-accent-deep"
                >
                  Apply Today
                </Link>
              )}
              <a
                href="tel:7203579499"
                onClick={trackPhoneClick}
                className="mt-3 flex min-h-[44px] items-center justify-center gap-2 text-[15px] text-ink-60"
              >
                <Phone className="w-4 h-4" />
                Call or text (720) 357-9499
              </a>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
