"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        const currentScrollY = window.scrollY;
        
        // Show navbar when at top of page
        if (currentScrollY < 10) {
          setIsVisible(true);
        }
        // Hide when scrolling down, show when scrolling up
        else if (currentScrollY > lastScrollY) {
          setIsVisible(false);
          setIsMenuOpen(false); // Close mobile menu when hiding
        } else {
          setIsVisible(true);
        }
        
        setLastScrollY(currentScrollY);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlNavbar);
      return () => {
        window.removeEventListener('scroll', controlNavbar);
      };
    }
  }, [lastScrollY]);

  return (
    <nav className={`fixed top-0 left-0 right-0 bg-white shadow-md z-50 transition-transform duration-300 ${
      isVisible ? 'translate-y-0' : '-translate-y-full'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-burnt-orange-600 hover:text-burnt-orange-700 transition">
            Merritt Workspace
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            <Link href="/meeting-rooms" className="text-gray-700 hover:text-burnt-orange-600 transition">
              Meeting Rooms
            </Link>
            <Link href="/snackshop" className="text-gray-700 hover:text-burnt-orange-600 transition">
              Snackshop
            </Link>
            <Link href="/membership" className="text-gray-700 hover:text-burnt-orange-600 transition">
              Membership
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-burnt-orange-600 transition">
              Contact
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-burnt-orange-600 transition">
              About
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-burnt-orange-600 transition"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col space-y-2">
              <Link 
                href="/meeting-rooms" 
                className="text-gray-700 hover:text-burnt-orange-600 transition py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Meeting Rooms
              </Link>
              <Link 
                href="/snackshop" 
                className="text-gray-700 hover:text-burnt-orange-600 transition py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Snackshop
              </Link>
              <Link 
                href="/membership" 
                className="text-gray-700 hover:text-burnt-orange-600 transition py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Membership
              </Link>
              <Link 
                href="/contact" 
                className="text-gray-700 hover:text-burnt-orange-600 transition py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              <Link 
                href="/about" 
                className="text-gray-700 hover:text-burnt-orange-600 transition py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}