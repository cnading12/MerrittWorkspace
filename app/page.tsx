import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white flex flex-col font-helvetica text-black">
      {/* Hero Section */}
      <section className="relative w-full h-[90vh] flex items-center justify-center bg-gray-100 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/couch.jpg"
            alt="Cole and Spencer of Vanish Moving Company"
            fill
            className="object-cover brightness-75"
          />
        </div>

        {/* Overlay Content */}
        <div className="relative z-10 text-center text-white px-6">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
            {`Fort Collins' Most Local & Trusted Movers`}
          </h1>
          <p className="text-lg md:text-2xl mb-6 drop-shadow-md">
            {`Run by two CSU seniors, offering unmatched care, student discounts, and deep community roots.`}
          </p>
          <Link
            href="/contact"
            className="inline-block bg-black hover:bg-gray-900 text-white px-8 py-4 text-lg font-medium rounded-2xl shadow-lg transition duration-200"
          >
            Connect
          </Link>
        </div>
      </section>

      {/* Local & Affordable Blurb */}
      <section className="bg-white text-center py-12 px-6">
        <h2 className="text-3xl font-bold mb-4">Cheapest in Town. Most Local Around.</h2>
        <p className="text-lg max-w-2xl mx-auto text-gray-700">
          {`Vanish Moving Company is run by Cole Nading and Spencer Burney. We're proud CSU Rams, born and raised in Colorado — and we care deeply about helping our community move safely, affordably, and smoothly. $150/hour with a 15% discount for fellow students.`}
        </p>
      </section>
    </main>
  );
}
