// components/Navbar.tsx
import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
<header className="navbar w-full px-6 py-2 flex justify-between items-center bg-white shadow-md">
  <Link href="/">
    <div className="logo-wrapper relative w-44 h-20">
      <Image
        src="/images/vanish-logo.svg"
        alt="Vanish Moving Company Logo"
        fill
        className="object-contain"
        priority
      />
    </div>
  </Link>
  <nav className="space-x-4 sm:space-x-6 text-gray-700 font-medium text-base sm:text-lg">
    <Link href="/" className="hover:text-gray-900">Home</Link>
    <Link href="/about" className="hover:text-gray-900">About</Link>
    <Link href="/contact" className="hover:text-gray-900">Contact</Link>
    <Link href="/senior-moving" className="hover:text-gray-900">Senior Moving</Link>
  </nav>
</header>

  );
}
