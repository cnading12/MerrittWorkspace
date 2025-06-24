'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Discounts', href: '/discounts' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNav, setShowNav] = useState(true);
  const lastScroll = useRef(0);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Scroll hide/show for navbar (desktop + mobile)
  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      if (current <= 0) {
        setShowNav(true);
        lastScroll.current = 0;
        return;
      }
      if (current < lastScroll.current) {
        setShowNav(true);
      } else if (current > lastScroll.current) {
        setShowNav(false);
      }
      lastScroll.current = current;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed z-50 w-full top-0 left-0 transition-transform duration-300 ease-in-out
        ${showNav || menuOpen ? 'translate-y-0' : '-translate-y-full'}
      `}
      style={{ willChange: 'transform' }}
    >
      {/* Desktop Navbar */}
      <div className="w-full bg-white shadow-xl">
        <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0 z-50" tabIndex={0}>
            <Image
              src="/images/Logo.svg"
              alt="Logo"
              width={150}
              height={88}
              className="mr-3"
              priority
            />
          </Link>
          {/* Desktop Nav Links */}
          <div className="hidden md:flex gap-8">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="font-semibold text-black hover:text-gray-900 hover:underline transition text-lg"
              >
                {item.label}
              </Link>
            ))}
          </div>
          {/* Hamburger */}
          <button
            className="md:hidden text-black z-50 relative"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={32} /> : <Menu size={32} />}
          </button>
        </nav>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="
          md:hidden fixed inset-0 z-[100] bg-white flex flex-col min-h-screen w-full transition
        ">
          {/* Top Bar: logo and close button */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
            <Link
              href="/"
              className="flex items-center shrink-0"
              onClick={() => setMenuOpen(false)}
              tabIndex={0}
            >
              <Image
                src="/images/Logo.svg"
                alt="Logo"
                width={130}
                height={60}
                className="mr-1"
                priority
              />
            </Link>
            <button
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="text-black hover:text-gray-700 p-2 focus:outline-none"
            >
              <X size={38} />
            </button>
          </div>
          {/* Nav Links */}
          <nav className="flex flex-col gap-8 pt-10 px-8">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-black text-2xl font-semibold py-2 hover:text-gray-900 transition"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
