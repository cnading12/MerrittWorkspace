export default function SeniorMovingPage() {
  return (
    <main className="min-h-screen bg-white text-black font-helvetica">
      {/* Page Wrapper */}
      <div className="text-center px-6 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Senior Moving with Heart</h1>

        <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
          {`At Vanish Moving Company, we understand that moving as a senior isn't just about boxes — it's about memories, emotion, and trust. That's why we take the time to ensure every move is handled with patience, clarity, and care.`}
        </p>

        <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
          {`We're Cole and Spencer, two CSU alumni born and raised in Colorado. We founded Vanish to bring a respectful, affordable, and people-first approach to local moving. We're not a big chain — we're your neighbors.`}
        </p>

        <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
          {`We've helped seniors transition into assisted living, downsize to simpler spaces, or just declutter after a lifetime of memories. We go the extra mile: careful packing, compassionate conversation, and clear communication with family or caretakers.`}
        </p>
      </div>

      {/* Full-Width Shaded Section */}
      <section className="bg-gray-100 text-center py-12 px-6 mb-10">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Seniors Choose Us</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 text-lg text-left">
            <li>Patient, respectful movers who actually listen</li>
            <li>Experience working with elderly clients and families</li>
            <li>Locally owned — just two Fort Collins guys who care</li>
            <li>Clear pricing: $150/hour</li>
            <li>No stress, no rush — we work on your terms</li>
          </ul>
        </div>
      </section>

      {/* Contact Section */}
      <div className="text-center px-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Call Us Directly</h2>
        <p className="text-lg text-gray-700 mb-10 max-w-2xl mx-auto">
          {`Have questions or want to schedule a move? We're easy to reach — and yes, we answer our phones.`}
        </p>

        <div className="grid md:grid-cols-2 gap-10 text-left">
          {/* Cole's Contact Box */}
          <div className="border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-2">Cole Nading</h3>
            <p className="text-gray-700 mb-2">Co-Founder · CSU Computer Science</p>
            <p>
              <strong>Phone:</strong>{" "}
              <a href="tel:7203579499" className="text-blue-600 hover:underline">
                (720) 357-9499
              </a>
            </p>
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:vanishmoving@gmail.com" className="text-blue-600 hover:underline">
                vanishmoving@gmail.com
              </a>
            </p>
          </div>

          {/* Spencer's Contact Box */}
          <div className="border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-2">Spencer Burney</h3>
            <p className="text-gray-700 mb-2">Co-Founder · CSU Graphic Design</p>
            <p>
              <strong>Phone:</strong>{" "}
              <a href="tel:7204986734" className="text-blue-600 hover:underline">
                (720) 498-6734
              </a>
            </p>
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:vanishmoving@gmail.com" className="text-blue-600 hover:underline">
                vanishmoving@gmail.com
              </a>
            </p>
          </div>
        </div>
        <div className="h-12" />
      </div>
    </main>
  );
}
