import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="navbar w-full px-4 py-3 flex flex-wrap sm:flex-nowrap justify-between items-center bg-white shadow-md">
      {/* Logo */}
      <Link href="/">
      <div className="relative w-48 h-16 sm:w-60 sm:h-20 logo-wrapper">
      <Image
            src="/images/Logo.svg" // replace with your new optimized logo path
            alt="Vanish Moving Company Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
      </Link>

      {/* Nav Links */}
      <nav className="w-full sm:w-auto flex flex-wrap justify-center sm:justify-end space-x-4 sm:space-x-6 mt-2 sm:mt-0 text-gray-700 font-medium text-sm sm:text-base">
        <Link href="/" className="hover:text-gray-900">Home</Link>
        <Link href="/about" className="hover:text-gray-900">About</Link>
        <Link href="/contact" className="hover:text-gray-900">Contact</Link>
        <Link href="/senior-moving" className="hover:text-gray-900">Senior Moving</Link>
      </nav>
    </header>
  );
}
