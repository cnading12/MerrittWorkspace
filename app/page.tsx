"use client";

import { useState, useEffect } from 'react';
import { MapPin, Wifi, Shield, Phone, Monitor, Coffee, Users, Calendar, Clock, ArrowRight, CheckCircle, Projector, Volume2, Circle } from 'lucide-react';
import Footer from '@/components/Footer';
import Link from 'next/link';
import Image from 'next/image';

export default function ImprovedHomePage() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const heroImages = [
    {
      src: '/images/hero/outside-hero.webp',
      title: 'Historic Character',
      subtitle: 'Next to the landmark Merritt Building',
      alt: 'Merritt Workspace exterior - historic coworking space in Sloan\'s Lake, Denver near I-25'
    },
    {
      src: '/images/event-space/coffee-shop.webp',
      title: 'Beautiful Flex Space',
      subtitle: 'Café seating and unlimited coffee until 4:30 PM',
      alt: 'Coffee lounge and flex space at Merritt Workspace in Sloan\'s Lake, Denver'
    },
    {
      src: '/images/event-space/event-space-1.webp',
      title: 'Free Flex Space for Members',
      subtitle: 'Host workshops, meetings, and events in our stunning space',
      alt: 'Event and flex space at Merritt Workspace - free for members until 4:30 PM'
    },
    {
      src: '/images/hero/conference-room.webp',
      title: 'First-Class Meeting Rooms',
      subtitle: '75" Smart TV and conference calling',
      alt: 'Professional conference room at Merritt Workspace coworking space in Denver\'s Sloan\'s Lake neighborhood'
    },
    {
      src: '/images/hero/dedicated-desk.webp',
      title: 'Your Dedicated Workspace',
      subtitle: 'Distinctive burnt orange floors',
      alt: 'Dedicated desk workspace at Merritt Workspace - affordable coworking in Sloan\'s Lake, Denver'
    },
    {
      src: '/images/hero/kitchen.webp',
      title: 'Full Kitchen Amenities',
      subtitle: 'Coffee, snacks, and more',
      alt: 'Full kitchen with unlimited coffee and tea at Merritt Workspace coworking space in Denver'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroImages.length]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-orange-50 via-white to-orange-50 pt-32 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-2 items-center">
            {/* Content */}
            <div>
              {/* Promo Banner */}
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold mb-4 animate-pulse">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                First Month Free on Dedicated Desks—Limited Time
              </div>

              <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <MapPin className="w-4 h-4" />
                Sloan's Lake, Denver • 3 Min to I-25
              </div>

              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Coworking Space in
                <span className="block text-orange-600">Sloan's Lake, Denver</span>
              </h1>

              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Premium <strong>dedicated desks</strong> and <strong>private offices</strong> in Sloan's Lake, with member access to our beautiful flex space. Unlimited coffee, 22 free parking spots, 3 min to I-25.
              </p>

              {/* Key Features */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">24/7 Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">22 Free Parking Spots</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Free Flex Space Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">All-You-Can-Drink Coffee</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Link href="/membership/dedicated-desk" className="inline-flex items-center justify-center bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-orange-700 transition shadow-lg hover:shadow-xl">
                  Claim Your Free Month
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
                <a href="#pricing" className="inline-flex items-center justify-center border-2 border-gray-900 text-gray-900 px-8 py-4 rounded-lg font-semibold hover:bg-gray-900 hover:text-white transition">
                  See Pricing
                </a>
              </div>

              {/* Phone Number */}
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-5 h-5 text-orange-600" />
                <a href="tel:3033598337" className="font-semibold hover:text-orange-600 transition">(303) 359-8337</a>
                <span className="text-gray-400">— Call or text anytime</span>
              </div>
            </div>

            {/* Image Carousel with LCP Optimization */}
            <div className="relative">
              <div className="relative h-[450px] md:h-[550px] lg:h-[640px] rounded-2xl overflow-hidden shadow-2xl">
                {heroImages.map((image, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-1000 ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                      }`}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      priority={index === 0}
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className={`${index === 0 ? 'object-contain bg-gray-900' : 'object-cover'}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-8 left-8 right-8">
                      <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{image.title}</h3>
                        <p className="text-gray-600">{image.subtitle}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dots */}
              <div className="flex justify-center mt-6 gap-2">
                {heroImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    aria-label={`View image ${index + 1}`}
                    className={`h-2 rounded-full transition-all ${index === currentImageIndex
                      ? 'bg-orange-600 w-8'
                      : 'bg-gray-300 w-2 hover:bg-gray-400'
                      }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-12 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-orange-500 mb-2">14</div>
              <div className="text-gray-400">Private Office Spaces</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-500 mb-2">24/7</div>
              <div className="text-gray-400">Member Access</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-500 mb-2">3 min</div>
              <div className="text-gray-400">To I-25</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-500 mb-2">20+</div>
              <div className="text-gray-400">Dedicated Desks</div>
            </div>
          </div>
        </div>
      </section>

      {/* Neighborhood Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Prime Sloan's Lake Location</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Located in the heart of West Denver's most desirable neighborhood, with quick access to downtown and beyond
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-orange-50 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Sloan's Lake Neighborhood</h3>
              <p className="text-gray-600">
                Walking distance to Sloan's Lake Park, local cafes, restaurants, and Denver's vibrant West Side community
              </p>
            </div>

            <div className="bg-orange-50 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Minutes from Anywhere</h3>
              <p className="text-gray-600">
                3 minutes to I-25, 5 minutes to Mile High Stadium, easy access to downtown Denver and the entire metro area
              </p>
            </div>

            <div className="bg-orange-50 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Coffee className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Connected to Merritt Wellness</h3>
              <p className="text-gray-600">
                Next door to <a href="https://merrittwellness.net" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">Merritt Wellness</a> studio for yoga, fitness, and wellness classes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Event Space Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold mb-4">
              <CheckCircle className="w-4 h-4" />
              FREE for Members Until 4:30 PM
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Sets Us Apart: The Beautiful Flex Space</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              This is what sets us apart from every other coworking space in Denver. Your membership includes <strong>free access</strong> to our stunning flex space with café seating, projector, and event space—perfect for workshops, large meetings, and networking events.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold">
                <Clock className="w-5 h-5" />
                Free access daily until 4:30 PM
              </div>
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full font-semibold">
                <Calendar className="w-5 h-5" />
                Converts to wellness space after 4:30 PM
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-12">
            <div className="relative h-96 rounded-2xl overflow-hidden shadow-xl">
              <Image
                src="/images/event-space/event-space-1.webp"
                alt="Event space with projector and flexible seating at Merritt Workspace in Sloan's Lake, Denver"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>

            <div className="space-y-6">
              {[
                { icon: Coffee, title: 'Coffee Lounge Next Door', desc: 'Café seating in a beautiful space next door—a great change of scenery, free for members until 4:30 PM daily' },
                { icon: Users, title: 'Host Free Workshops & Meetings', desc: 'Use the flex space for team meetings, client presentations, or networking events—completely free' },
                { icon: Projector, title: 'Presentation Ready', desc: 'Professional projector, screen, and sound system for your events' },
                { icon: Circle, title: 'Recreation & Team Building', desc: 'Ping pong table and flexible space for breaks and team activities' }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 bg-white p-4 rounded-xl shadow-sm">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-gray-600 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="relative h-64 rounded-xl overflow-hidden shadow-lg">
              <Image
                src="/images/event-space/event-space-2.webp"
                alt="Flexible meeting and event space at Merritt Workspace coworking in Sloan's Lake, Denver"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg">
                <p className="font-semibold text-gray-900">Free Flex Space for Members</p>
              </div>
            </div>
            <div className="relative h-64 rounded-xl overflow-hidden shadow-lg">
              <Image
                src="/images/event-space/coffee-shop.webp"
                alt="Coffee shop and casual meeting area at Merritt Workspace in Denver's West Side"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg">
                <p className="font-semibold text-gray-900">Coffee Lounge</p>
              </div>
            </div>
          </div>

          {/* Wellness Space Info */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">After 4:30 PM? The Space Transforms.</h3>
            <p className="text-gray-600 max-w-2xl mx-auto mb-4">
              After 4:30 PM and on weekends, the flex space converts to <strong>Merritt Wellness</strong>—offering yoga, fitness, and wellness classes. As a workspace member, you get <strong>discounted rates</strong> to book the space for evening events or join wellness classes.
            </p>
            <a
              href="https://merrittwellness.net"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-purple-600 font-semibold hover:text-purple-700 transition"
            >
              Visit Merritt Wellness
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Sloan's Lake Office Space Pricing</h2>
            <p className="text-xl text-gray-600">Affordable dedicated desks and private offices near I-25</p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Dedicated Desk - Featured */}
            <div className="lg:col-span-4 mb-8">
              <div className="relative bg-white rounded-2xl shadow-xl border-4 border-orange-500 overflow-hidden max-w-4xl mx-auto">
                <div className="absolute top-6 right-6 flex flex-col gap-2 items-end">
                  <span className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse">
                    FIRST MONTH FREE
                  </span>
                  <span className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                    Best Value
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-8 p-8">
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">Dedicated Desk</h3>
                    <p className="text-gray-600 mb-6">Your own workspace in our collaborative Sloan's Lake coworking environment + free access to our beautiful flex space</p>

                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl text-gray-400 line-through">$300</span>
                      <span className="text-5xl font-bold text-green-600">$0</span>
                      <span className="text-xl text-gray-500">first month</span>
                    </div>
                    <p className="text-gray-500 mb-6">Then $300/month</p>

                    <Link href="/membership/dedicated-desk" className="inline-flex items-center justify-center w-full bg-orange-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-orange-700 transition">
                      Claim Your Free Month
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </div>

                  <div>
                    <div className="space-y-3">
                      {[
                        '24/7 building access',
                        'High-speed WiFi',
                        'Personal storage',
                        'Kitchen access',
                        '2 hours meeting room credits',
                        'FREE flex space access (until 4:30 PM)',
                        'Host workshops & meetings for free',
                        'All-you-can-drink coffee & tea'
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Private Offices */}
            <div className="lg:col-span-4">
              <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Private Office Rentals in Denver</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { name: 'Single Office', price: 500, people: '1 person', hours: '4 hours credits' },
                  { name: 'Double Office', price: 700, people: '2 people', hours: '6 hours credits' },
                  { name: 'Large Office', price: 1200, people: '4-8 people', hours: 'Unlimited credits' }
                ].map((office, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition border-2 border-transparent hover:border-orange-500">
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{office.name}</h4>
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-3xl font-bold text-gray-900">${office.price}</span>
                      <span className="text-gray-500">/mo</span>
                    </div>
                    <div className="space-y-2 mb-6 text-sm text-gray-600">
                      <div>{office.people}</div>
                      <div>{office.hours}</div>
                      <div>Lockable office</div>
                      <div>Business address</div>
                    </div>
                    <Link href="/membership/private-office" className="block text-center bg-gray-900 text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-800 transition">
                      See Office Options
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Internal Links */}
          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              <Link href="/membership" className="text-orange-600 hover:underline font-semibold">Compare all membership options</Link> or
              <Link href="/contact" className="text-orange-600 hover:underline font-semibold ml-1">schedule a tour</Link> of our Sloan's Lake workspace
            </p>
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything You Need</h2>
            <p className="text-xl text-gray-600">Professional amenities for productive work in Sloan's Lake</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Wifi, title: 'High-Speed WiFi', desc: 'Reliable enterprise-grade internet' },
              { icon: Shield, title: '24/7 Security', desc: 'Monitored building with keycard access' },
              { icon: Phone, title: 'Phone Booths', desc: 'Private areas for important calls' },
              { icon: Monitor, title: 'Meeting Rooms', desc: '75" TVs with video calling' },
              { icon: Coffee, title: 'Unlimited Coffee & Tea', desc: 'All-you-can-drink included' },
              { icon: Users, title: 'Event Space', desc: 'Projector, sound, and recreation' },
              { icon: MapPin, title: 'Prime Location', desc: '3 minutes to I-25, heart of Sloan\'s Lake' },
              { icon: Calendar, title: 'Community Events', desc: 'Network with fellow entrepreneurs' }
            ].map((item, i) => (
              <div key={i} className="text-center group">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-600 transition">
                  <item.icon className="w-8 h-8 text-orange-600 group-hover:text-white transition" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location with Map */}
      <section className="py-20 bg-gradient-to-br from-orange-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Coworking Space in Sloan's Lake
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Located next to the historic Landmark Merritt Church Building at the iconic intersection of 23rd and Irving Street in West Denver.
              </p>

              <div className="space-y-4">
                {[
                  { icon: MapPin, title: '2246 Irving Street', desc: 'Sloan\'s Lake, Denver CO 80211' },
                  { icon: Clock, title: '3 Minutes to I-25', desc: 'Easy commute from anywhere in Denver metro' },
                  { icon: Users, title: 'Walkable Neighborhood', desc: 'Restaurants, cafes, and Sloan\'s Lake Park nearby' }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 bg-white p-4 rounded-xl shadow-sm">
                    <item.icon className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                    <div>
                      <div className="font-semibold text-gray-900">{item.title}</div>
                      <div className="text-gray-600 text-sm">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Link href="/contact" className="inline-flex items-center text-orange-600 font-semibold hover:underline">
                  Get directions and contact info
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </div>
            </div>

            <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3067.4953180826856!2d-105.03225422342487!3d39.75098609588881!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x876c7932ec70db2b%3A0x8c38dd4cf4df270d!2sMerritt%20Workspace!5e0!3m2!1sen!2sus!4v1759948992207!5m2!1sen!2sus"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Merritt Workspace - Coworking Space at 2246 Irving Street, Sloan's Lake, Denver, CO 80211"
                className="rounded-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold mb-6">
            First Month Free on Dedicated Desks
          </div>
          <h2 className="text-4xl font-bold mb-6">Ready to Find Your Workspace?</h2>
          <p className="text-xl text-gray-300 mb-4">
            Get your dedicated desk or private office—plus free access to our beautiful flex space
          </p>
          <p className="text-lg text-gray-400 mb-8">
            <Phone className="w-4 h-4 inline mr-2" />
            Call or text: <a href="tel:3033598337" className="text-orange-400 hover:text-orange-300">(303) 359-8337</a>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/membership/dedicated-desk" className="inline-flex items-center justify-center bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-orange-700 transition shadow-lg">
              Claim Your Free Month
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link href="/membership" className="inline-flex items-center justify-center bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition">
              Book Your Free Tour
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
