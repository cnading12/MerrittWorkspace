// components/Footer.tsx
import { FaFacebook, FaInstagram } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-gray-100 text-gray-700 text-sm py-4 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Contact Info */}
        <div className="text-center sm:text-left">
          <p className="mb-1">Phone: (720) 357-9499 · (720) 498-6734</p>
          <p>Email: <a href="mailto:vanishmoving@gmail.com" className="underline">vanishmoving@gmail.com</a></p>
        </div>

        {/* Social Icons */}
        <div className="flex gap-4">
          <a href="https://www.facebook.com/profile.php?id=61576756012701" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <FaFacebook size={18} />
          </a>
          <a href="https://www.instagram.com/vanishmovingco/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <FaInstagram size={18} />
          </a>
        </div>

        {/* Copyright */}
        <div className="text-center sm:text-right">
          <p>&copy; {new Date().getFullYear()} Vanish Moving Company</p>
        </div>
      </div>
    </footer>
  );
}
