"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, ChevronDown, Sparkles } from 'lucide-react';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const controlNavbar = useCallback(() => {
    const currentScrollY = window.scrollY;

    // Track if page is scrolled for styling
    setIsScrolled(currentScrollY > 20);

    // Show navbar when at top of page
    if (currentScrollY < 10) {
      setIsVisible(true);
    }
    // Hide when scrolling down, show when scrolling up
    else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
      setIsVisible(false);
      setIsMenuOpen(false);
      setIsDropdownOpen(null);
    } else {
      setIsVisible(true);
    }

    lastScrollY.current = currentScrollY;
    ticking.current = false;
  }, []);

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

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isVisible ? 'translate-y-0' : '-translate-y-full'
    } ${
      isScrolled
        ? 'bg-white/90 backdrop-blur-xl shadow-soft border-b border-gray-100/50'
        : 'bg-white/70 backdrop-blur-md'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="relative group">
            <div className="absolute -inset-3 bg-burnt-orange-100/0 group-hover:bg-burnt-orange-100/50 rounded-xl transition-all duration-300" />
            <Image
              src="/images/hero/logo.webp"
              alt="Merritt Workspace Logo"
              width={180}
              height={48}
              className="h-12 w-auto relative"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {/* Member Resources Dropdown */}
            <div className="relative">
              <button
                onClick={handleDropdownClick}
                className="flex items-center px-4 py-2.5 text-gray-700 hover:text-burnt-orange-600 rounded-lg hover:bg-burnt-orange-50/80 transition-all duration-300 font-medium"
                data-dropdown="member-resources"
              >
                Member Resources
                <ChevronDown className={`ml-1.5 w-4 h-4 transition-transform duration-300 ${isDropdownOpen === 'member-resources' ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen === 'member-resources' && (
                <div className="absolute top-full left-0 mt-2 w-52 bg-white/95 backdrop-blur-xl rounded-2xl shadow-soft-lg border border-gray-100/80 py-2 animate-fade-in-down">
                  <div className="absolute -top-2 left-6 w-4 h-4 bg-white rotate-45 border-l border-t border-gray-100/80" />
                  <Link
                    href="/member-resources/snackshop"
                    className="block px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-burnt-orange-50 hover:to-transparent hover:text-burnt-orange-700 transition-all duration-200 font-medium"
                    onClick={closeAllMenus}
                  >
                    Snackshop
                  </Link>
                  <Link
                    href="/member-resources/meeting-rooms"
                    className="block px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-burnt-orange-50 hover:to-transparent hover:text-burnt-orange-700 transition-all duration-200 font-medium"
                    onClick={closeAllMenus}
                  >
                    Meeting Rooms
                  </Link>
                  <Link
                    href="/member-resources/faqs"
                    className="block px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-burnt-orange-50 hover:to-transparent hover:text-burnt-orange-700 transition-all duration-200 font-medium"
                    onClick={closeAllMenus}
                  >
                    FAQ&apos;s
                  </Link>
                </div>
              )}
            </div>

            {/* Membership Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => handleDropdownClick(e, 'membership')}
                className="flex items-center px-4 py-2.5 text-gray-700 hover:text-burnt-orange-600 rounded-lg hover:bg-burnt-orange-50/80 transition-all duration-300 font-medium"
                data-dropdown="membership"
              >
                Membership
                <ChevronDown className={`ml-1.5 w-4 h-4 transition-transform duration-300 ${isDropdownOpen === 'membership' ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen === 'membership' && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-soft-lg border border-gray-100/80 py-2 animate-fade-in-down">
                  <div className="absolute -top-2 left-6 w-4 h-4 bg-white rotate-45 border-l border-t border-gray-100/80" />
                  <Link
                    href="/membership"
                    className="block px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-burnt-orange-50 hover:to-transparent hover:text-burnt-orange-700 transition-all duration-200 font-semibold border-b border-gray-100"
                    onClick={closeAllMenus}
                  >
                    All Membership Options
                  </Link>
                  <Link
                    href="/membership/dedicated-desk"
                    className="block px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-burnt-orange-50 hover:to-transparent hover:text-burnt-orange-700 transition-all duration-200 font-medium"
                    onClick={closeAllMenus}
                  >
                    Dedicated Desk
                  </Link>
                  <Link
                    href="/membership/private-office"
                    className="block px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-burnt-orange-50 hover:to-transparent hover:text-burnt-orange-700 transition-all duration-200 font-medium"
                    onClick={closeAllMenus}
                  >
                    Private Office
                  </Link>
                </div>
              )}
            </div>

            <Link
              href="/about"
              className="px-4 py-2.5 text-gray-700 hover:text-burnt-orange-600 rounded-lg hover:bg-burnt-orange-50/80 transition-all duration-300 font-medium"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="px-4 py-2.5 text-gray-700 hover:text-burnt-orange-600 rounded-lg hover:bg-burnt-orange-50/80 transition-all duration-300 font-medium"
            >
              Contact
            </Link>

            {/* Apply Today Button */}
            <Link
              href="/membership/apply"
              className="group relative ml-4 bg-gradient-to-r from-burnt-orange-500 to-burnt-orange-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:from-burnt-orange-600 hover:to-burnt-orange-700 transition-all duration-300 shadow-lg shadow-burnt-orange-500/25 hover:shadow-xl hover:shadow-burnt-orange-500/30 hover:-translate-y-0.5 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Apply Today
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="relative p-2 text-gray-700 hover:text-burnt-orange-600 hover:bg-burnt-orange-50 rounded-lg transition-all duration-300"
              aria-label="Toggle menu"
            >
              <div className="relative w-6 h-6">
                <Menu className={`absolute inset-0 transition-all duration-300 ${isMenuOpen ? 'opacity-0 rotate-90' : 'opacity-100 rotate-0'}`} />
                <X className={`absolute inset-0 transition-all duration-300 ${isMenuOpen ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90'}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={`md:hidden overflow-hidden transition-all duration-400 ease-smooth ${
          isMenuOpen ? 'max-h-[500px] opacity-100 pb-6' : 'max-h-0 opacity-0'
        }`}>
          <div className="flex flex-col space-y-1 pt-2 border-t border-gray-100">
            {/* Mobile Member Resources */}
            <div className="py-1">
              <button
                onClick={(e) => handleDropdownClick(e, 'member-resources')}
                className="flex items-center justify-between w-full text-gray-700 hover:text-burnt-orange-600 hover:bg-burnt-orange-50/80 rounded-lg px-4 py-3 transition-all duration-200 font-medium"
                data-dropdown="member-resources"
              >
                Member Resources
                <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isDropdownOpen === 'member-resources' ? 'rotate-180' : ''}`} />
              </button>

              <div className={`overflow-hidden transition-all duration-300 ${isDropdownOpen === 'member-resources' ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="ml-4 pl-4 mt-1 space-y-1 border-l-2 border-burnt-orange-200">
                  <Link
                    href="/member-resources/snackshop"
                    className="block text-gray-600 hover:text-burnt-orange-600 py-2 transition-all duration-200 font-medium"
                    onClick={closeAllMenus}
                  >
                    Snackshop
                  </Link>
                  <Link
                    href="/member-resources/meeting-rooms"
                    className="block text-gray-600 hover:text-burnt-orange-600 py-2 transition-all duration-200 font-medium"
                    onClick={closeAllMenus}
                  >
                    Meeting Rooms
                  </Link>
                  <Link
                    href="/member-resources/faq"
                    className="block text-gray-600 hover:text-burnt-orange-600 py-2 transition-all duration-200 font-medium"
                    onClick={closeAllMenus}
                  >
                    FAQ&apos;s
                  </Link>
                </div>
              </div>
            </div>

            {/* Mobile Membership */}
            <div className="py-1">
              <button
                onClick={(e) => handleDropdownClick(e, 'membership')}
                className="flex items-center justify-between w-full text-gray-700 hover:text-burnt-orange-600 hover:bg-burnt-orange-50/80 rounded-lg px-4 py-3 transition-all duration-200 font-medium"
                data-dropdown="membership"
              >
                Membership
                <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isDropdownOpen === 'membership' ? 'rotate-180' : ''}`} />
              </button>

              <div className={`overflow-hidden transition-all duration-300 ${isDropdownOpen === 'membership' ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="ml-4 pl-4 mt-1 space-y-1 border-l-2 border-burnt-orange-200">
                  <Link
                    href="/membership"
                    className="block text-gray-600 hover:text-burnt-orange-600 py-2 transition-all duration-200 font-semibold"
                    onClick={closeAllMenus}
                  >
                    All Membership Options
                  </Link>
                  <Link
                    href="/membership/dedicated-desk"
                    className="block text-gray-600 hover:text-burnt-orange-600 py-2 transition-all duration-200 font-medium"
                    onClick={closeAllMenus}
                  >
                    Dedicated Desk
                  </Link>
                  <Link
                    href="/membership/private-office"
                    className="block text-gray-600 hover:text-burnt-orange-600 py-2 transition-all duration-200 font-medium"
                    onClick={closeAllMenus}
                  >
                    Private Office
                  </Link>
                </div>
              </div>
            </div>

            <Link
              href="/about"
              className="text-gray-700 hover:text-burnt-orange-600 hover:bg-burnt-orange-50/80 rounded-lg px-4 py-3 transition-all duration-200 font-medium"
              onClick={closeAllMenus}
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-gray-700 hover:text-burnt-orange-600 hover:bg-burnt-orange-50/80 rounded-lg px-4 py-3 transition-all duration-200 font-medium"
              onClick={closeAllMenus}
            >
              Contact
            </Link>

            {/* Mobile Apply Today Button */}
            <Link
              href="/membership/apply"
              className="mx-4 mt-4 bg-gradient-to-r from-burnt-orange-500 to-burnt-orange-600 text-white px-6 py-4 rounded-xl font-semibold text-center shadow-lg shadow-burnt-orange-500/25 flex items-center justify-center gap-2"
              onClick={closeAllMenus}
            >
              <Sparkles className="w-5 h-5" />
              Apply Today
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
