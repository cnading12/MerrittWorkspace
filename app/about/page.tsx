import Image from "next/image";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-black font-helvetica">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-6">About Vanish Moving Company</h1>
        <div className="mb-8">
          <Image
            src="/images/us.jpg"
            alt="Cole and Spencer roommates and co-founders"
            width={500}
            height={375}
            className="mx-auto rounded-2xl shadow-md object-cover"
          />
        </div>
        <p className="text-lg text-gray-700 mb-6">
          {`We're Cole Nading and Spencer Burney — roommates, best friends, and proud seniors at Colorado State University. Born and raised in Colorado, we know Fort Collins like the back of our hand and are passionate about helping our local community.`}
        </p>
        <p className="text-lg text-gray-700 mb-6">
          {`Cole is a Computer Science major with a talent for logistics, systems, and web development. Spencer is a skilled graphic designer who brings a careful eye and creative touch to everything we do. Together, we built Vanish Moving Company to offer affordable, respectful, and efficient moving services in Fort Collins.`}
        </p>
        <p className="text-lg text-gray-700 mb-6">
          {`Our mission is simple: be the most local, trustworthy, and people-first moving company in town. We believe in patience, kindness, and clear communication — especially when helping seniors and families navigate the stress of moving.`}
        </p>
        <p className="text-lg text-gray-500 italic mt-10">
          {`“They're the only movers I'd ever trust with my china cabinet.” — Cole's Grandma`}
        </p>
        <p className="text-lg text-gray-500 italic mt-4">
          {`“My grandson's gay but I love him.” — Spencer's Grandma`}
        </p>
      </div>
    </main>
  );
}
