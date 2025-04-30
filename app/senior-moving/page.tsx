export default function SeniorMovingPage() {
  return (
    <main className="min-h-screen bg-white text-black font-helvetica">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          Senior Moving with Heart
        </h1>
        <p className="text-lg text-gray-700 mb-6">
          {`At Vanish Moving Company, we understand that moving as a senior isn't just about boxes — it's about memories, emotion, and trust. That's why we take the time to ensure every move is handled with patience, clarity, and care.`}
        </p>

        <p className="text-lg text-gray-700 mb-6">
          {`We're Cole and Spencer, two CSU seniors born and raised in Colorado. We founded Vanish to bring a respectful, affordable, and people-first approach to local moving. We're not a big chain — we're your neighbors. We're the grandkids you'd want helping you pack.`}
        </p>

        <p className="text-lg text-gray-700 mb-6">
          {`We've helped seniors transition into assisted living, downsize to simpler spaces, or just declutter after a lifetime of memories. We go the extra mile: careful packing, compassionate conversation, and clear communication with family or caretakers.`}
        </p>

        <div className="bg-gray-100 rounded-xl p-6 mb-10">
          <h2 className="text-2xl font-bold mb-4 text-center">Why Seniors Choose Us</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 text-lg">
            <li>Patient, respectful movers who actually listen</li>
            <li>Experience working with elderly clients and families</li>
            <li>Locally owned — just two Fort Collins guys who care</li>
            <li>Clear pricing: $150/hour</li>
            <li>No stress, no rush — we work on your terms</li>
          </ul>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{`Call Us Directly`}</h2>
          <p className="text-lg text-gray-700 mb-2">
            {`Have questions or want to schedule a move? We're easy to reach — and yes, we answer our phones.`}
          </p>
          <div className="space-y-2 text-lg">
            <p>
              <strong>{`Cole's Phone:`}</strong>
              <a href="tel:7203579499" className="text-blue-600 hover:underline">
                {" "} (720) 357-9499
              </a>
            </p>
            <p>
              <strong>{`Cole's Email:`}</strong>
              <a href="mailto:colenading@icloud.com" className="text-blue-600 hover:underline">
                {" "} colenading@icloud.com
              </a>
            </p>
            <p>
              <strong>{`Spencer's Phone:`}</strong>
              <a href="tel:7204986734" className="text-blue-600 hover:underline">
                {" "} (720) 498-6734
              </a>
            </p>
            <p>
              <strong>{`Spencer's Email:`}</strong>
              <a href="mailto:spencer@crowhill.com" className="text-blue-600 hover:underline">
                {" "} spencer@crowhill.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
