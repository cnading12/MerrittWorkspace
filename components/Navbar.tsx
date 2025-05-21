import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
    return (
        <header className="navbar w-full px-4 py-3 flex flex-wrap sm:flex-nowrap justify-between items-center bg-white shadow-md">
            {/* Logo */}
            <Link href="/">
                <div className="relative h-20 w-48 sm:w-60 sm:h-24">
                    <Image
                        src="/images/Logo.svg"
                        alt="Vanish Moving Company Logo"
                        width={240}
                        height={80}
                        className="h-16 w-auto sm:h-20"
                        priority
                    />

                </div>
            </Link>



            {/* Nav Links */}
        <nav className="w-full sm:w-auto flex flex-wrap justify-center sm:justify-end space-x-4 sm:space-x-6 mt-0 text-black font-medium text-lg sm:text-xl">
                <Link href="/" className="hover:text-gray-900">Home</Link>
                <Link href="/about" className="hover:text-gray-900">About</Link>
                <Link href="/contact" className="hover:text-gray-900">Contact</Link>
                <Link href="/senior-moving" className="hover:text-gray-900">Senior Moving</Link>
            </nav>
        </header>
    );
}
