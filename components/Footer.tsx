import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Link href="/" className="text-2xl font-bold mb-4 block hover:text-orange-400 transition">
              Merritt Workspace
            </Link>
            <p className="text-gray-400 mb-4">
              Premium workspace in the heart of Sloan's Lake, Denver. 
              Where work meets community in a beautifully restored space.
            </p>
            <p className="text-gray-400">
              Experience our distinctive burnt orange floors and collaborative atmosphere.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4 text-orange-400">Contact Info</h4>
            <div className="space-y-2 text-gray-400">
              <p>2246 Irving Street</p>
              <p>Denver, CO</p>
              <p className="text-orange-300">3 minutes to I-25</p>
              <p className="mt-4">
                <a href="tel:+1234567890" className="hover:text-white transition">
                  (123) 456-7890
                </a>
              </p>
              <p>
                <a href="mailto:info@merrittworkspace.com" className="hover:text-white transition">
                  info@merrittworkspace.com
                </a>
              </p>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4 text-orange-400">Quick Links</h4>
            <div className="space-y-2">
              <Link href="/conference-room" className="block text-gray-400 hover:text-white transition">
                Conference Room
              </Link>
              <Link href="/snackshop" className="block text-gray-400 hover:text-white transition">
                Snackshop
              </Link>
              <Link href="/new-member" className="block text-gray-400 hover:text-white transition">
                New Member
              </Link>
              <Link href="/contact" className="block text-gray-400 hover:text-white transition">
                Contact
              </Link>
              <Link href="/about" className="block text-gray-400 hover:text-white transition">
                About
              </Link>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            &copy; 2025 Merritt Workspace. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0 flex space-x-6">
            <Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-white text-sm transition">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}