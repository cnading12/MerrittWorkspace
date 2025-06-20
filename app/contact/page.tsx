import { FaFacebook, FaInstagram } from 'react-icons/fa';
import Footer from "@/components/Footer";


export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white text-black font-helvetica">
      <div className="max-w-4xl mx-auto text-center px-4">
        <h1 className="text-4xl font-bold mb-6">{`Let's Connect`}</h1>
        <p className="text-lg text-gray-700 mb-10">
          {`Call or text either of us directly — we're here to help, and we actually pick up.`}
        </p>

        {/* Contact Grid */}
        <div className="grid md:grid-cols-2 gap-10 text-left mb-12">
          {/* Cole's Section */}
          <div className="border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-2xl font-bold mb-2">Cole Nading</h2>
            <p className="text-gray-700 mb-2">Co-Founder · CSU Computer Science</p>
            <p>
              <strong>Phone:</strong>
              <a href="tel:7203579499" className="text-blue-600 hover:underline">
                {" "} (720) 357-9499
              </a>
            </p>
            <p>
              <strong>Email:</strong>
              <a href="mailto:vanishmoving@gmail.com" className="text-blue-600 hover:underline">
                {" "} vanishmoving@gmail.com
              </a>
            </p>
          </div>

          {/* Spencer's Section */}
          <div className="border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-2xl font-bold mb-2">Spencer Burney</h2>
            <p className="text-gray-700 mb-2">Co-Founder · CSU Graphic Design</p>
            <p>
              <strong>Phone:</strong>
              <a href="tel:7204986734" className="text-blue-600 hover:underline">
                {" "} (720) 498-6734
              </a>
            </p>
            <p>
              <strong>Email:</strong>
              <a href="mailto:vanishmoving@gmail.com" className="text-blue-600 hover:underline">
                {" "} vanishmoving@gmail.com
              </a>
            </p>
          </div>
        </div>

        {/* Social Media Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Follow Vanish Moving Co.</h2>
          <p className="text-gray-700 mb-6 max-w-xl mx-auto">
            See what we&apos;re up to, check out behind-the-scenes content, and follow along as we help Fort Collins move the right way.
          </p>
          <div className="flex justify-center space-x-8 text-3xl">
            <a
              href="https://www.facebook.com/profile.php?id=61576756012701"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 hover:scale-110 transition-transform"
              aria-label="Facebook"
            >
              <FaFacebook />
            </a>
            <a
              href="https://www.instagram.com/vanishmovingco/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-600 hover:scale-110 transition-transform"
              aria-label="Instagram"
            >
              <FaInstagram />
            </a>
          </div>
        </div>
      </div>

      {/* Full-width Review Section */}
      <div className="bg-gray-100 py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">What Our Customers Say</h2>
          <p className="text-gray-600 mb-12">Real feedback from people we&apos;ve helped move stress-free.</p>

          <div className="space-y-8 text-left">
            {/* Review 1 */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-md">
              <p className="italic text-lg">“Spencer and Cole were great. We had a very small job and they took care of everything we needed help with. They were prompt, careful, and did great work!”</p>
              <p className="text-sm text-gray-600 mt-4">— Jen Krafchick</p>
            </div>

            {/* Review 2 */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-md">
              <p className="italic text-lg">“We had a great experience with Vanishing! With only a week to plan our move things were stressful and I didn’t think we would find good movers with such short notice. Man did we get lucky finding them! These guys are friendly, professional, and affordable! Highly recommend giving this locally owned business a try.”</p>
              <p className="text-sm text-gray-600 mt-4">— Karoleigh Cosner</p>
            </div>

            {/* Review 3 */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-md">
              <p className="italic text-lg">“Very professional, moved everything with care and were super kind and considerate. Reasonable rates for such great service.”</p>
              <p className="text-sm text-gray-600 mt-4">— Joseph Boeh</p>
            </div>
          </div>

          {/* CTA Link */}
          <div className="mt-10">
            <a
              href="https://www.google.com/search?q=vanish+moving+fort+collins#lrd=0x87694a6f68b3e8ef:0xd0a45e4a25fc342,1"
              target="_blank"
              className="inline-block text-blue-600 font-semibold hover:underline"
            >
              Read more reviews on Google →
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
