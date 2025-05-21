import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="navbar w-full px-4 py-2 flex flex-col sm:flex-row items-center sm:justify-between bg-white shadow-md">
      {/* Logo */}
      <Link href="/" className="mb-2 sm:mb-0">
        <div className="relative h-12 w-36 sm:h-20 sm:w-48">
          <Image
            src="/images/Logo.svg"
            alt="Vanish Moving Company Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
      </Link>

      {/* Nav Links */}
      <nav className="flex flex-wrap justify-center sm:justify-end gap-4 text-black font-medium text-base sm:text-lg">
        <Link href="/" className="hover:text-gray-900">Home</Link>
        <Link href="/about" className="hover:text-gray-900">About</Link>
        <Link href="/contact" className="hover:text-gray-900">Contact</Link>
        <Link href="/senior-moving" className="hover:text-gray-900">Senior Moving</Link>
      </nav>
    </header>
  );
}
