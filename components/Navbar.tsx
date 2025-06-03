import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="w-full px-4 py-2 flex items-center justify-between bg-white shadow-md">
      {/* Logo - always left-aligned */}
      <Link href="/" className="block">
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

      {/* Nav Links with responsive cleanup */}
      <nav className="flex gap-2 sm:gap-4 text-black font-medium text-sm sm:text-lg">
        <Link href="/" className="hover:text-gray-900">Home</Link>
        <Link href="/about" className="hover:text-gray-900">About</Link>
        <Link href="/contact" className="hover:text-gray-900">Contact</Link>
        <Link
          href="/senior-moving"
          className="hover:text-gray-900 whitespace-nowrap"
        >
          Senior Moving
        </Link>
      </nav>
    </header>
  );
}