import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Phone, Mail, Clock, ArrowUpRight, Building2, Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-burnt-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-burnt-orange-600/5 rounded-full blur-3xl" />
      </div>

      {/* Main footer content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        {/* Top section with CTA */}
        <div className="mb-16 p-8 md:p-12 bg-gradient-to-r from-burnt-orange-600 to-burnt-orange-500 rounded-3xl relative overflow-hidden">
          <div className="absolute inset-0 bg-hero-pattern opacity-10" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Ready to find your workspace?
              </h3>
              <p className="text-white/90 text-lg">
                Schedule a free tour and see why members love Merritt Workspace.
              </p>
            </div>
            <Link
              href="/membership/apply"
              className="group flex items-center gap-2 bg-white text-burnt-orange-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              Get Started
              <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-6">
              <Image
                src="/images/hero/logo.webp"
                alt="Merritt Workspace"
                width={160}
                height={42}
                className="h-10 w-auto brightness-0 invert opacity-90 hover:opacity-100 transition-opacity"
              />
            </Link>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Premium coworking in the heart of Sloan&apos;s Lake, Denver.
              Where work meets community in a beautifully restored 1905 space.
            </p>
            <div className="flex items-center gap-2 text-burnt-orange-400">
              <Building2 className="w-5 h-5" />
              <span className="text-sm font-medium">Historic Landmark Building</span>
            </div>
          </div>

          {/* Contact column */}
          <div>
            <h4 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="w-8 h-0.5 bg-burnt-orange-500 rounded-full" />
              Contact
            </h4>
            <div className="space-y-4">
              <a
                href="https://maps.google.com/?q=2246+Irving+Street+Denver+CO"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 text-gray-400 hover:text-white transition-colors"
              >
                <MapPin className="w-5 h-5 text-burnt-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-300 group-hover:text-white transition-colors">2246 Irving Street</div>
                  <div>Denver, CO 80211</div>
                </div>
              </a>
              <div className="flex items-center gap-3 text-gray-400">
                <Clock className="w-5 h-5 text-burnt-orange-500 flex-shrink-0" />
                <span>3 minutes to I-25</span>
              </div>
              <a
                href="tel:+3033598337"
                className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors"
              >
                <Phone className="w-5 h-5 text-burnt-orange-500 flex-shrink-0" />
                <span>(303) 359-8337</span>
              </a>
              <a
                href="mailto:manager@merrittworkspace.net"
                className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors"
              >
                <Mail className="w-5 h-5 text-burnt-orange-500 flex-shrink-0" />
                <span>manager@merrittworkspace.net</span>
              </a>
            </div>
          </div>

          {/* Quick Links column */}
          <div>
            <h4 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="w-8 h-0.5 bg-burnt-orange-500 rounded-full" />
              Quick Links
            </h4>
            <div className="space-y-3">
              {[
                { href: '/membership', label: 'Membership Options' },
                { href: '/membership/dedicated-desk', label: 'Dedicated Desk' },
                { href: '/membership/private-office', label: 'Private Office' },
                { href: '/member-resources/meeting-rooms', label: 'Meeting Rooms' },
                { href: '/member-resources/snackshop', label: 'Snackshop' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <span className="w-1.5 h-1.5 bg-burnt-orange-500/50 rounded-full group-hover:bg-burnt-orange-500 transition-colors" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Company column */}
          <div>
            <h4 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="w-8 h-0.5 bg-burnt-orange-500 rounded-full" />
              Company
            </h4>
            <div className="space-y-3">
              {[
                { href: '/about', label: 'About Us' },
                { href: '/contact', label: 'Contact' },
                { href: '/member-resources/faqs', label: 'FAQs' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <span className="w-1.5 h-1.5 bg-burnt-orange-500/50 rounded-full group-hover:bg-burnt-orange-500 transition-colors" />
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Partner link */}
            <div className="mt-8 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <p className="text-sm text-gray-400 mb-2">Connected to</p>
              <a
                href="https://merrittwellness.net"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 text-burnt-orange-400 hover:text-burnt-orange-300 font-medium transition-colors"
              >
                Merritt Wellness
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
              <p className="text-xs text-gray-500 mt-1">Yoga & fitness next door</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-8" />

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm flex items-center gap-1">
            &copy; {currentYear} Merritt Workspace. Made with
            <Heart className="w-4 h-4 text-burnt-orange-500 fill-burnt-orange-500" />
            in Denver, CO
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
