"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, ChevronDown, Phone, User, LogOut, LayoutDashboard, CalendarClock } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { trackPhoneClick } from '@/lib/gtag';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const controlNavbar = useCallback(() => {
    const currentScrollY = window.scrollY;

    // Show navbar when at top of page
    if (currentScrollY < 10) {
      setIsVisible(true);
    }
    // Hide when scrolling down, show when scrolling up
    else if (currentScrollY > lastScrollY.current) {
      setIsVisible(false);
      setIsMenuOpen(false);
      setIsDropdownOpen(null);
    } else {
      setIsVisible(true);
    }

    lastScrollY.current = currentScrollY;
    ticking.current = false;
  }, []);

  // Track Supabase auth state
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserEmail(data.session?.user?.email ?? null);
      setAuthLoaded(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
      setAuthLoaded(true);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    closeAllMenus();
    router.push('/');
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(controlNavbar);
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [controlNavbar]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setIsDropdownOpen(null);
    };

    if (isDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleDropdownClick = (e: React.MouseEvent, dropdownName?: string) => {
    e.stopPropagation();
    const target = dropdownName || (e.currentTarget as HTMLButtonElement).dataset.dropdown;
    setIsDropdownOpen(isDropdownOpen === target ? null : target || null);
  };

  const closeAllMenus = () => {
    setIsMenuOpen(false);
    setIsDropdownOpen(null);
  };

  // The public marketing navbar should never appear on authenticated
  // surfaces (admin panel, member portal) — those pages have their own
  // headers, and the public nav's fixed z-50 would otherwise overlay them.
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/portal')) {
    return null;
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 bg-bone/95 backdrop-blur-sm border-b border-clay z-50 transition-transform duration-300 ${
      isVisible ? 'translate-y-0' : '-translate-y-full'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="hover:opacity-80 transition">
            <Image 
              src="/images/hero/logo.webp" 
              alt="Merritt Workspace Logo" 
              width={180} 
              height={48}
              className="h-12 w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Member Resources Dropdown */}
            <div className="relative">
              <button
                onClick={handleDropdownClick}
                className="flex items-center text-ink-60 hover:text-ink transition"
                data-dropdown="member-resources"
              >
                Member Resources
                <ChevronDown className={`ml-1 w-4 h-4 transition-transform ${isDropdownOpen === 'member-resources' ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen === 'member-resources' && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-bone border border-clay shadow-[0_10px_30px_rgba(26,22,19,0.12)] py-2">
                  <Link 
                    href="/member-resources/snackshop" 
                    className="block px-4 py-2 text-ink-60 hover:bg-linen hover:text-ink transition"
                    onClick={closeAllMenus}
                  >
                    Snackshop
                  </Link>
                  <Link 
                    href="/member-resources/meeting-rooms" 
                    className="block px-4 py-2 text-ink-60 hover:bg-linen hover:text-ink transition"
                    onClick={closeAllMenus}
                  >
                    Meeting Rooms
                  </Link>
                  <Link 
                    href="/member-resources/faqs" 
                    className="block px-4 py-2 text-ink-60 hover:bg-linen hover:text-ink transition"
                    onClick={closeAllMenus}
                  >
                    FAQ's
                  </Link>
                </div>
              )}
            </div>

            {/* Membership Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => handleDropdownClick(e, 'membership')}
                className="flex items-center text-ink-60 hover:text-ink transition"
                data-dropdown="membership"
              >
                Membership
                <ChevronDown className={`ml-1 w-4 h-4 transition-transform ${isDropdownOpen === 'membership' ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen === 'membership' && (
                <div className="absolute top-full left-0 mt-2 w-52 bg-bone border border-clay shadow-[0_10px_30px_rgba(26,22,19,0.12)] py-2">
                  <Link 
                    href="/membership" 
                    className="block px-4 py-2 text-ink-60 hover:bg-linen hover:text-ink transition font-semibold border-b border-clay"
                    onClick={closeAllMenus}
                  >
                    All Membership Options
                  </Link>
                  <Link 
                    href="/membership/dedicated-desk" 
                    className="block px-4 py-2 text-ink-60 hover:bg-linen hover:text-ink transition"
                    onClick={closeAllMenus}
                  >
                    Dedicated Desk
                  </Link>
                  <Link 
                    href="/membership/private-office" 
                    className="block px-4 py-2 text-ink-60 hover:bg-linen hover:text-ink transition"
                    onClick={closeAllMenus}
                  >
                    Private Office
                  </Link>
                </div>
              )}
            </div>

            <Link href="/about" className="text-ink-60 hover:text-ink transition">
              About
            </Link>
            <Link href="/contact" className="text-ink-60 hover:text-ink transition">
              Contact
            </Link>

            {/* Phone Number */}
            <a href="tel:7203579499" onClick={trackPhoneClick} className="flex items-center gap-1 text-ink-60 hover:text-ink transition">
              <Phone className="w-4 h-4" />
              <span className="hidden lg:inline">(720) 357-9499</span>
            </a>

            {/* Auth-aware actions */}
            {authLoaded && userEmail ? (
              <div className="relative">
                <button
                  onClick={(e) => handleDropdownClick(e, 'account')}
                  className="flex items-center gap-2 bg-accent text-white px-5 py-2.5 text-[15px] font-medium hover:bg-accent-deep transition"
                  data-dropdown="account"
                >
                  <User className="w-4 h-4" />
                  My Portal
                  <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen === 'account' ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen === 'account' && (
                  <div className="absolute top-full right-0 mt-2 w-60 bg-bone border border-clay shadow-[0_10px_30px_rgba(26,22,19,0.12)] py-2">
                    <div className="px-4 py-2 text-xs text-ink-60 border-b border-clay truncate">
                      {userEmail}
                    </div>
                    <Link
                      href="/portal"
                      className="flex items-center gap-2 px-4 py-2 text-ink-60 hover:bg-linen hover:text-ink transition"
                      onClick={closeAllMenus}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <Link
                      href="/portal/flex-space"
                      className="flex items-center gap-2 px-4 py-2 text-ink-60 hover:bg-linen hover:text-ink transition"
                      onClick={closeAllMenus}
                    >
                      <CalendarClock className="w-4 h-4" />
                      Flex Space
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-ink-60 hover:bg-linen hover:text-ink transition"
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
                  className="border border-ink text-ink px-5 py-2 text-[15px] font-medium hover:bg-ink hover:text-bone transition"
                >
                  Member Login
                </Link>
                <Link
                  href="/membership/apply"
                  className="bg-accent text-white px-6 py-2.5 text-[15px] font-medium hover:bg-accent-deep transition"
                >
                  Apply Today
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-ink-60 hover:text-ink transition"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col space-y-2">
              {/* Mobile Member Resources */}
              <div className="py-2">
                <button
                  onClick={(e) => handleDropdownClick(e, 'member-resources')}
                  className="flex items-center justify-between w-full text-ink-60 hover:text-ink transition py-2"
                  data-dropdown="member-resources"
                >
                  Member Resources
                  <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen === 'member-resources' ? 'rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen === 'member-resources' && (
                  <div className="ml-4 mt-2 space-y-2">
                    <Link 
                      href="/member-resources/snackshop" 
                      className="block text-ink-60 hover:text-ink transition py-1"
                      onClick={closeAllMenus}
                    >
                      Snackshop
                    </Link>
                    <Link 
                      href="/member-resources/meeting-rooms" 
                      className="block text-ink-60 hover:text-ink transition py-1"
                      onClick={closeAllMenus}
                    >
                      Meeting Rooms
                    </Link>
                    <Link 
                      href="/member-resources/faqs"
                      className="block text-ink-60 hover:text-ink transition py-1"
                      onClick={closeAllMenus}
                    >
                      FAQ's
                    </Link>
                  </div>
                )}
              </div>

              {/* Mobile Membership */}
              <div className="py-2">
                <button
                  onClick={(e) => handleDropdownClick(e, 'membership')}
                  className="flex items-center justify-between w-full text-ink-60 hover:text-ink transition py-2"
                  data-dropdown="membership"
                >
                  Membership
                  <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen === 'membership' ? 'rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen === 'membership' && (
                  <div className="ml-4 mt-2 space-y-2">
                    <Link 
                      href="/membership" 
                      className="block text-ink-60 hover:text-ink transition py-1 font-semibold"
                      onClick={closeAllMenus}
                    >
                      All Membership Options
                    </Link>
                    <Link 
                      href="/membership/dedicated-desk" 
                      className="block text-ink-60 hover:text-ink transition py-1"
                      onClick={closeAllMenus}
                    >
                      Dedicated Desk
                    </Link>
                    <Link 
                      href="/membership/private-office" 
                      className="block text-ink-60 hover:text-ink transition py-1"
                      onClick={closeAllMenus}
                    >
                      Private Office
                    </Link>
                  </div>
                )}
              </div>

              <Link 
                href="/about" 
                className="text-ink-60 hover:text-ink transition py-2"
                onClick={closeAllMenus}
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-ink-60 hover:text-ink transition py-2"
                onClick={closeAllMenus}
              >
                Contact
              </Link>

              {/* Mobile Phone Number */}
              <a
                href="tel:7203579499"
                onClick={trackPhoneClick}
                className="flex items-center gap-2 text-accent-deep font-medium py-2"
              >
                <Phone className="w-5 h-5" />
                (720) 357-9499
              </a>

              {/* Mobile auth-aware actions */}
              {authLoaded && userEmail ? (
                <>
                  <div className="mt-4 px-1 text-xs text-ink-60 truncate">
                    Signed in as {userEmail}
                  </div>
                  <Link
                    href="/portal"
                    className="flex items-center justify-center gap-2 bg-accent text-white px-6 py-3.5 text-[15px] font-medium hover:bg-accent-deep transition text-center mt-2"
                    onClick={closeAllMenus}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    My Portal
                  </Link>
                  <Link
                    href="/portal/flex-space"
                    className="flex items-center justify-center gap-2 border border-ink text-ink px-6 py-3.5 text-[15px] font-medium hover:bg-ink hover:text-bone transition text-center mt-2"
                    onClick={closeAllMenus}
                  >
                    <CalendarClock className="w-4 h-4" />
                    Flex Space
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center justify-center gap-2 border border-ink text-ink px-6 py-3.5 text-[15px] font-medium hover:bg-ink hover:text-bone transition text-center mt-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/portal/login"
                    className="border border-ink text-ink px-6 py-3.5 text-[15px] font-medium hover:bg-ink hover:text-bone transition text-center mt-4"
                    onClick={closeAllMenus}
                  >
                    Member Login
                  </Link>
                  <Link
                    href="/membership/apply"
                    className="bg-accent text-white px-6 py-3.5 text-[15px] font-medium hover:bg-accent-deep transition text-center mt-2"
                    onClick={closeAllMenus}
                  >
                    Apply Today
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}