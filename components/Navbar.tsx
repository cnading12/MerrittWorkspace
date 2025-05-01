import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
    return (
        <header className="navbar w-full px-4 py-3 flex flex-wrap sm:flex-nowrap justify-between items-center bg-white shadow-md">
            {/* Logo */}
            <Link href="/">
                <div className="logo-wrapper flex items-center justify-center sm:mr-4">
                    <Image
                        src="/images/Logo.svg"
                        alt="Vanish Moving Company Logo"
                        width={160} // adjust to your SVG's natural size
                        height={50}
                        className="h-auto w-auto object-contain sm:w-[160px] sm:h-[50px]"
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
