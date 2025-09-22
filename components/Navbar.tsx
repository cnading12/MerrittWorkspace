"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<string | null>(null);
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
          setIsDropdownOpen(null); // Close dropdown when hiding
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
          <div className="hidden md:flex items-center space-x-8">
            {/* Member Resources Dropdown */}
            <div className="relative">
              <button
                onClick={handleDropdownClick}
                className="flex items-center text-gray-700 hover:text-burnt-orange-600 transition"
                data-dropdown="member-resources"
              >
                Member Resources
                <ChevronDown className={`ml-1 w-4 h-4 transition-transform ${isDropdownOpen === 'member-resources' ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen === 'member-resources' && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                  <Link 
                    href="/member-resources/snackshop" 
                    className="block px-4 py-2 text-gray-700 hover:bg-burnt-orange-50 hover:text-burnt-orange-600 transition"
                    onClick={closeAllMenus}
                  >
                    Snackshop
                  </Link>
                  <Link 
                    href="/member-resources/meeting-rooms" 
                    className="block px-4 py-2 text-gray-700 hover:bg-burnt-orange-50 hover:text-burnt-orange-600 transition"
                    onClick={closeAllMenus}
                  >
                    Meeting Rooms
                  </Link>
                  <Link 
                    href="/member-resources/faqs" 
                    className="block px-4 py-2 text-gray-700 hover:bg-burnt-orange-50 hover:text-burnt-orange-600 transition"
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
                className="flex items-center text-gray-700 hover:text-burnt-orange-600 transition"
                data-dropdown="membership"
              >
                Membership
                <ChevronDown className={`ml-1 w-4 h-4 transition-transform ${isDropdownOpen === 'membership' ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen === 'membership' && (
                <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                  <Link 
                    href="/membership" 
                    className="block px-4 py-2 text-gray-700 hover:bg-burnt-orange-50 hover:text-burnt-orange-600 transition font-semibold border-b border-gray-100"
                    onClick={closeAllMenus}
                  >
                    All Membership Options
                  </Link>
                  <Link 
                    href="/membership/dedicated-desk" 
                    className="block px-4 py-2 text-gray-700 hover:bg-burnt-orange-50 hover:text-burnt-orange-600 transition"
                    onClick={closeAllMenus}
                  >
                    Dedicated Desk
                  </Link>
                  <Link 
                    href="/membership/private-office" 
                    className="block px-4 py-2 text-gray-700 hover:bg-burnt-orange-50 hover:text-burnt-orange-600 transition"
                    onClick={closeAllMenus}
                  >
                    Private Office
                  </Link>
                  <Link 
                    href="/membership/large-office" 
                    className="block px-4 py-2 text-gray-700 hover:bg-burnt-orange-50 hover:text-burnt-orange-600 transition"
                    onClick={closeAllMenus}
                  >
                    Large Office
                  </Link>
                </div>
              )}
            </div>

            <Link href="/about" className="text-gray-700 hover:text-burnt-orange-600 transition">
              About
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-burnt-orange-600 transition">
              Contact
            </Link>

            {/* Apply Today Button */}
            <Link 
              href="/membership/apply" 
              className="bg-burnt-orange-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-burnt-orange-700 transition shadow-md"
            >
              Apply Today
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
              {/* Mobile Member Resources */}
              <div className="py-2">
                <button
                  onClick={(e) => handleDropdownClick(e, 'member-resources')}
                  className="flex items-center justify-between w-full text-gray-700 hover:text-burnt-orange-600 transition py-2"
                  data-dropdown="member-resources"
                >
                  Member Resources
                  <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen === 'member-resources' ? 'rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen === 'member-resources' && (
                  <div className="ml-4 mt-2 space-y-2">
                    <Link 
                      href="/snackshop" 
                      className="block text-gray-600 hover:text-burnt-orange-600 transition py-1"
                      onClick={closeAllMenus}
                    >
                      Snackshop
                    </Link>
                    <Link 
                      href="/meeting-rooms" 
                      className="block text-gray-600 hover:text-burnt-orange-600 transition py-1"
                      onClick={closeAllMenus}
                    >
                      Meeting Rooms
                    </Link>
                    <Link 
                      href="/faq" 
                      className="block text-gray-600 hover:text-burnt-orange-600 transition py-1"
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
                  className="flex items-center justify-between w-full text-gray-700 hover:text-burnt-orange-600 transition py-2"
                  data-dropdown="membership"
                >
                  Membership
                  <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen === 'membership' ? 'rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen === 'membership' && (
                  <div className="ml-4 mt-2 space-y-2">
                    <Link 
                      href="/membership" 
                      className="block text-gray-600 hover:text-burnt-orange-600 transition py-1 font-semibold"
                      onClick={closeAllMenus}
                    >
                      All Membership Options
                    </Link>
                    <Link 
                      href="/membership/dedicated-desk" 
                      className="block text-gray-600 hover:text-burnt-orange-600 transition py-1"
                      onClick={closeAllMenus}
                    >
                      Dedicated Desk
                    </Link>
                    <Link 
                      href="/membership/private-office" 
                      className="block text-gray-600 hover:text-burnt-orange-600 transition py-1"
                      onClick={closeAllMenus}
                    >
                      Private Office
                    </Link>
                    <Link 
                      href="/membership/large-office" 
                      className="block text-gray-600 hover:text-burnt-orange-600 transition py-1"
                      onClick={closeAllMenus}
                    >
                      Large Office
                    </Link>
                  </div>
                )}
              </div>

              <Link 
                href="/about" 
                className="text-gray-700 hover:text-burnt-orange-600 transition py-2"
                onClick={closeAllMenus}
              >
                About
              </Link>
              <Link 
                href="/contact" 
                className="text-gray-700 hover:text-burnt-orange-600 transition py-2"
                onClick={closeAllMenus}
              >
                Contact
              </Link>

              {/* Mobile Apply Today Button */}
              <Link 
                href="/membership/apply" 
                className="bg-burnt-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-burnt-orange-700 transition shadow-md text-center mt-4"
                onClick={closeAllMenus}
              >
                Apply Today
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}