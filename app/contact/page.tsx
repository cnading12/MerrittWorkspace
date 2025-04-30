export default function ContactPage() {
    return (
      <main className="min-h-screen bg-white text-black font-helvetica">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-6">Let’s Connect</h1>
          <p className="text-lg text-gray-700 mb-10">
            Call or text either of us directly — we’re here to help, and we actually pick up.
          </p>
  
          <div className="grid md:grid-cols-2 gap-10 text-left">
            {/* Cole's Section */}
            <div className="border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-2xl font-bold mb-2">Cole Nading</h2>
              <p className="text-gray-700 mb-2">Co-Founder · CSU Computer Science</p>
              <p>
                <strong>Phone:</strong>{" "}
                <a href="tel:7203579499" className="text-blue-600 hover:underline">
                  (720) 357-9499
                </a>
              </p>
              <p>
                <strong>Email:</strong>{" "}
                <a href="mailto:colenading@icloud.com" className="text-blue-600 hover:underline">
                  colenading@icloud.com
                </a>
              </p>
            </div>
  
            {/* Spencer's Section */}
            <div className="border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-2xl font-bold mb-2">Spencer Burney</h2>
              <p className="text-gray-700 mb-2">Co-Founder · CSU Graphic Design</p>
              <p>
                <strong>Phone:</strong>{" "}
                <a href="tel:7204986734" className="text-blue-600 hover:underline">
                  (720) 498-6734
                </a>
              </p>
              <p>
                <strong>Email:</strong>{" "}
                <a href="mailto:spencer@vanishmoving.com" className="text-blue-600 hover:underline">
                  spencer@vanishmoving.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }
  