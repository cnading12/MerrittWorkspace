import Footer from "@/components/Footer";

export default function DiscountsPage() {
  return (
    <>
      <main className="min-h-screen bg-white-200 text-black font-helvetica pt-[120px]">
        {/* Page Wrapper */}
        <div className="text-center px-6 max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Moving Discounts</h1>

          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
            {`We believe moving should be affordable for everyone. Whether you’re a student, a senior, a veteran, or a local hero, Vanish Moving Company is proud to offer special discounts to help you save on your next move.`}
          </p>

          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
            {`We’re Cole and Spencer — CSU grads, Colorado natives, and two guys who genuinely care about the Fort Collins community. No big chains, no hidden fees — just honest work and real savings.`}
          </p>
        </div>

        {/* Discounts Section */}
        <section className="bg-gray-100 text-center py-12 px-6 mb-10">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Current Discounts</h2>
            <ul className="list-disc pl-6 space-y-4 text-gray-700 text-lg text-left mx-auto max-w-md">
              <li>
                <span className="font-semibold text-black">Student Discount:</span>
                {` 10% off for current college students. Just show your student ID at booking.`}
              </li>
              <li>
                <span className="font-semibold text-black">Senior Discount:</span>
                {` 10% off moves for seniors 65+ — because experience should be rewarded.`}
              </li>
              <li>
                <span className="font-semibold text-black">Veteran Discount:</span>
                {` 10% off for all U.S. military veterans as a thank you for your service.`}
              </li>
              <li>
                <span className="font-semibold text-black">First Responders & Teachers:</span>
                {` 10% off as a thank you for serving our community.`}
              </li>
              <li>
                <span className="font-semibold text-black">Referral Discount:</span>
                {` Get $25 off your next move when you refer a friend who books with us.`}
              </li>
              <li>
                <span className="font-semibold text-black">Seasonal Specials:</span>
                {` Ask about any current limited-time offers when you call!`}
              </li>
            </ul>
          </div>
        </section>

        {/* Contact Section */}
        <div className="text-center px-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Call or Text Us to Claim Your Discount</h2>
          <p className="text-lg text-gray-700 mb-10 max-w-2xl mx-auto">
            {`Questions about eligibility? Ready to book? Reach out directly — we actually pick up the phone.`}
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
      <Footer />
    </>
  );
}
