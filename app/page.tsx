import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <main className="min-h-screen bg-white flex flex-col font-helvetica text-black">
        {/* Hero Section */}
        <section className="relative w-full min-h-screen flex items-center justify-center">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            {/* Desktop */}
            <Image
              src="/images/couch.jpg"
              alt="Professional local movers lifting couch in Fort Collins"
              fill
              className="object-cover brightness-75 hidden sm:block"
              priority
            />
            {/* Mobile */}
            <Image
              src="/images/us.jpg"
              alt="Vanish Moving Co. founders Cole and Spencer standing outside moving job"
              fill
              className="object-cover brightness-75 block sm:hidden"
              priority
            />
          </div>

          {/* Overlay Content */}
          <div className="relative z-10 text-center text-white px-6">
            <h1 className="text-4xl md:text-6xl font-condensed mb-4 drop-shadow-lg">
              {`Fort Collins' Most Local & Trusted Movers`}
            </h1>
            <p className="text-lg md:text-2xl mb-6 drop-shadow-md text-white">
              {`Offering unmatched care, student discounts, and deep community roots.`}
            </p>
            <Link
              href="/contact"
              className="inline-block bg-black hover:bg-gray-900 text-white px-8 py-4 text-lg font-medium rounded-2xl shadow-lg transition duration-200"
            >
              Get a Quote
            </Link>
          </div>
        </section>

        {/* Cheapest in Town Section */}
        <section className="bg-gray-100 text-center py-12 px-6">
          <h2 className="text-3xl font-bold mb-6">{`Cheapest in Town`}</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 text-lg text-center max-w-2xl mx-auto">
            <li>{`Flat rate: $150/hour — no hidden fees`}</li>
            <li>{`Includes truck, equipment, and all labor`}</li>
            <li>{`Transparent, upfront quotes`}</li>
          </ul>
        </section>

        {/* Most Local Around Section */}
        <section className="bg-white text-center py-12 px-6">
          <h2 className="text-3xl font-bold mb-6">{`Most Local Around`}</h2>
          <p className="text-lg max-w-2xl mx-auto text-gray-700">
            {`We are Cole and Spencer — two Colorado-born friends who built Vanish to offer Fort Collins a better moving experience.
            We are not a national chain or some faceless booking app. We're hands-on owners who show up, lift heavy things,
            and treat your home like it is our own. Whether you're moving a studio apartment, a family home, or just a few big items,
            we will get it done right — and we will answer the phone when you call.`}
          </p>
        </section>
      </main>

      <Footer />
    </>
  );
}
