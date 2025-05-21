import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white flex flex-col font-helvetica text-black">
      {/* Hero Section */}
      <section className="relative w-full min-h-screen flex items-center justify-center ...">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/couch.jpg"
            alt="Cole and Spencer of Vanish Moving Company"
            fill
            className="object-cover sm:object-center object-top brightness-75"
          />
        </div>

        {/* Overlay Content */}
        <div className="relative z-10 text-center text-white px-6">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
            {`Fort Collins' Most Local & Trusted Movers`}
          </h1>
          <p className="text-lg md:text-2xl mb-6 drop-shadow-md text-white">
            {`Offering unmatched care, student discounts, and deep community roots.`}
          </p>
          <Link
            href="/contact"
            className="inline-block bg-black hover:bg-gray-900 text-white px-8 py-4 text-lg font-medium rounded-2xl shadow-lg transition duration-200"
          >
            Connect
          </Link>
        </div>
      </section>

      {/* Cheapest in Town Section */}
      <section className="bg-gray-100 text-center py-12 px-6">
        <h2 className="text-3xl font-bold mb-6">{`Cheapest in Town`}</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700 text-lg text-center max-w-2xl mx-auto">
          <li>{`Flat rate: $150/hour — no hidden fees`}</li>
          <li>{`15% discount for CSU students`}</li>
          <li>{`Includes truck and equipment`}</li>
        </ul>
      </section>

      {/* Most Local Around Section */}
      <section className="bg-white text-center py-12 px-6">
        <h2 className="text-3xl font-bold mb-6">{`Most Local Around`}</h2>
        <p className="text-lg max-w-2xl mx-auto text-gray-700">
          {`Vanish Moving Company is proudly run by Cole Nading and Spencer Burney — two CSU alumni born and raised in Fort Collins. We’re more than just movers; we’re your neighbors. We started Vanish to give the local community an option that’s affordable, respectful, and rooted in Ram pride. Every move is personal to us, and we’re committed to making sure our customers feel cared for — not just carried.`}
        </p>
      </section>
    </main>
  );
}
