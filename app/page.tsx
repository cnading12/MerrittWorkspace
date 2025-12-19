"use client";

import { useState, useEffect } from 'react';
import { MapPin, Wifi, Shield, Phone, Monitor, Coffee, Users, Calendar, Clock, ArrowRight, CheckCircle, Projector, Volume2, Star, Zap, Building, Sparkles } from 'lucide-react';
import Footer from '@/components/Footer';
import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const heroImages = [
    {
      src: '/images/hero/outside-hero.webp',
      title: 'Historic Character',
      subtitle: 'Next to the landmark Merritt Church Building',
      alt: 'Merritt Workspace exterior - historic 1905 coworking space in Sloan\'s Lake, Denver near I-25'
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
      {/* Hero Section - Premium Design */}
      <section className="relative min-h-screen bg-gradient-to-br from-burnt-orange-50 via-white to-orange-50 pt-24 pb-12 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 bg-hero-pattern opacity-50" />
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-burnt-orange-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-100/30 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Content */}
            <div className="animate-fade-in">
              {/* Location badge */}
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-burnt-orange-700 px-5 py-2.5 rounded-full text-sm font-semibold mb-8 shadow-soft border border-burnt-orange-100">
                <MapPin className="w-4 h-4" />
                Sloan&apos;s Lake, Denver
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-600">3 Min to I-25</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-6 leading-[1.1] tracking-tight">
                Premium
                <span className="block text-gradient">Coworking Space</span>
                <span className="block text-gray-700">in Denver</span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed max-w-xl">
                <strong className="text-gray-900">Dedicated desks</strong> and{' '}
                <strong className="text-gray-900">private offices</strong> in a beautifully
                restored 1905 church building. Denver&apos;s most distinctive workspace—where
                history and modern work culture meet.
              </p>

              {/* Key Features - Enhanced */}
              <div className="grid grid-cols-2 gap-3 mb-10">
                {[
                  { icon: Clock, text: '24/7 Access' },
                  { icon: Zap, text: '3 min to I-25' },
                  { icon: Star, text: 'Free Trial Day' },
                  { icon: Coffee, text: 'Unlimited Coffee' },
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-gray-100/80 shadow-sm hover:shadow-md hover:bg-white transition-all duration-300"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-burnt-orange-500 to-burnt-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700 font-medium text-sm">{feature.text}</span>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/membership/apply"
                  className="group btn-primary"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Schedule Free Tour
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#pricing"
                  className="btn-secondary"
                >
                  View Pricing
                </a>
              </div>

              {/* Trust indicator */}
              <div className="mt-10 flex items-center gap-4 text-sm text-gray-500">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-burnt-orange-400 to-burnt-orange-600 border-2 border-white flex items-center justify-center"
                    >
                      <span className="text-white text-xs font-bold">{['J', 'M', 'S', 'K'][i]}</span>
                    </div>
                  ))}
                </div>
                <span>Join <strong className="text-gray-700">30+ professionals</strong> working here</span>
              </div>
            </div>

            {/* Image Carousel - Enhanced */}
            <div className="relative animate-fade-in delay-200">
              <div className="relative h-[450px] sm:h-[500px] md:h-[550px] lg:h-[620px] rounded-3xl overflow-hidden shadow-soft-xl">
                {/* Decorative ring */}
                <div className="absolute -inset-1 bg-gradient-to-br from-burnt-orange-400 via-burnt-orange-500 to-burnt-orange-600 rounded-[28px] opacity-20 blur-sm" />

                <div className="relative h-full rounded-3xl overflow-hidden">
                  {heroImages.map((image, index) => (
                    <div
                      key={index}
                      className={`absolute inset-0 transition-all duration-1000 ${
                        index === currentImageIndex
                          ? 'opacity-100 scale-100'
                          : 'opacity-0 scale-105'
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                      {/* Caption card */}
                      <div className="absolute bottom-6 left-6 right-6">
                        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-soft-lg border border-white/50">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 mb-1">{image.title}</h3>
                              <p className="text-gray-600">{image.subtitle}</p>
                            </div>
                            <div className="w-10 h-10 bg-burnt-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Building className="w-5 h-5 text-burnt-orange-600" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dots navigation */}
              <div className="flex justify-center mt-6 gap-2">
                {heroImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    aria-label={`View image ${index + 1}`}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      index === currentImageIndex
                        ? 'bg-burnt-orange-500 w-8 shadow-glow'
                        : 'bg-gray-300 w-2.5 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Stats - Enhanced */}
      <section className="relative py-16 bg-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern opacity-5" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-burnt-orange-600 via-burnt-orange-500 to-burnt-orange-600" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: '14', label: 'Private Offices', suffix: '' },
              { value: '24/7', label: 'Member Access', suffix: '' },
              { value: '3', label: 'Min to I-25', suffix: 'min' },
              { value: '20', label: 'Dedicated Desks', suffix: '+' },
            ].map((stat, i) => (
              <div key={i} className="text-center group">
                <div className="inline-block">
                  <div className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-burnt-orange-400 to-burnt-orange-500 mb-2 stat-number group-hover:scale-110 transition-transform duration-300">
                    {stat.value}{stat.suffix && <span className="text-3xl">{stat.suffix}</span>}
                  </div>
                  <div className="text-gray-400 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Neighborhood Section - Enhanced */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-burnt-orange-50 rounded-full blur-3xl opacity-50" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="badge badge-orange mb-4">
              <MapPin className="w-4 h-4" />
              Prime Location
            </div>
            <h2 className="section-heading mb-4">Prime Sloan&apos;s Lake Location</h2>
            <p className="section-subheading">
              Located in the heart of West Denver&apos;s most desirable neighborhood, with quick access to downtown and beyond
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: MapPin,
                title: "Sloan's Lake Neighborhood",
                desc: "Walking distance to Sloan's Lake Park, local cafes, restaurants, and Denver's vibrant West Side community"
              },
              {
                icon: Clock,
                title: "Minutes from Anywhere",
                desc: "3 minutes to I-25, 5 minutes to Mile High Stadium, easy access to downtown Denver and the entire metro area"
              },
              {
                icon: Coffee,
                title: "Connected to Merritt Wellness",
                desc: "Next door to Merritt Wellness studio for yoga, fitness, and wellness classes",
                link: "https://merrittwellness.net"
              }
            ].map((item, i) => (
              <div
                key={i}
                className="group card-premium p-8 text-center hover:border-burnt-orange-200"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-burnt-orange-100 to-burnt-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-burnt-orange-500 group-hover:to-burnt-orange-600 transition-all duration-300">
                  <item.icon className="w-8 h-8 text-burnt-orange-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {item.link ? (
                    <>
                      Next door to{' '}
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-burnt-orange-600 hover:underline font-medium">
                        Merritt Wellness
                      </a>{' '}
                      studio for yoga, fitness, and wellness classes
                    </>
                  ) : (
                    item.desc
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Event Space Section - Enhanced */}
      <section className="py-24 bg-gradient-to-br from-blue-50 via-white to-blue-50 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-40" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="badge badge-blue mb-4">
              <Calendar className="w-4 h-4" />
              Bonus Space Next Door
            </div>
            <h2 className="section-heading mb-4">Multi-Purpose Event Space</h2>
            <p className="section-subheading">
              Connected to our main workspace, members have access to our versatile event space with coffee shop area, projector, sound system, and recreation facilities
            </p>
            <div className="inline-flex items-center gap-2 mt-4 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
              <Clock className="w-4 h-4" />
              Open to members daily until 4:30 PM
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-12">
            <div className="relative h-[400px] lg:h-[480px] rounded-3xl overflow-hidden shadow-soft-xl group">
              <Image
                src="/images/event-space/event-space-1.webp"
                alt="Event space with projector and flexible seating at Merritt Workspace in Sloan's Lake, Denver"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>

            <div className="space-y-5">
              {[
                { icon: Coffee, title: 'Coffee Shop Area', desc: 'Permanent seating in 1/4 of the space for casual meetings and coffee breaks' },
                { icon: Projector, title: 'Presentation Ready', desc: 'Professional projector and screen setup for team presentations' },
                { icon: Volume2, title: 'Sound System', desc: 'High-quality audio for presentations, music, or events' },
                { icon: Users, title: 'Recreation', desc: 'Ping pong table and flexible space for team building' }
              ].map((item, i) => (
                <div key={i} className="group flex items-start gap-4 bg-white p-5 rounded-2xl shadow-soft hover:shadow-soft-lg transition-all duration-300 border border-gray-100">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 transition-colors duration-300">
                    <item.icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { src: '/images/event-space/event-space-2.webp', label: 'Flexible Meeting Space', alt: 'Flexible meeting and event space at Merritt Workspace coworking in Sloan\'s Lake, Denver' },
              { src: '/images/event-space/coffee-shop.webp', label: 'Coffee Shop Corner', alt: 'Coffee shop and casual meeting area at Merritt Workspace in Denver\'s West Side' }
            ].map((img, i) => (
              <div key={i} className="relative h-72 rounded-2xl overflow-hidden shadow-soft-lg group">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-5 py-3 rounded-xl shadow-soft">
                  <p className="font-bold text-gray-900">{img.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - Enhanced */}
      <section id="pricing" className="py-24 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-burnt-orange-300 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="badge badge-orange mb-4">
              <Star className="w-4 h-4" />
              Flexible Plans
            </div>
            <h2 className="section-heading mb-4">Sloan&apos;s Lake Office Space Pricing</h2>
            <p className="section-subheading">Affordable dedicated desks and private offices near I-25</p>
          </div>

          {/* Dedicated Desk - Featured */}
          <div className="mb-16">
            <div className="relative max-w-4xl mx-auto">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-burnt-orange-500 via-burnt-orange-400 to-burnt-orange-500 rounded-[32px] opacity-20 blur-lg" />

              <div className="relative bg-white rounded-3xl shadow-soft-xl border-2 border-burnt-orange-400 overflow-hidden">
                {/* Best Value badge */}
                <div className="absolute top-0 right-0">
                  <div className="bg-burnt-orange-500 text-white px-6 py-2 rounded-bl-2xl font-bold text-sm flex items-center gap-2 shadow-lg">
                    <Star className="w-4 h-4 fill-current" />
                    Best Value
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 p-8 md:p-10">
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-3">Dedicated Desk</h3>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                      Your own workspace in our collaborative Sloan&apos;s Lake coworking environment
                    </p>

                    <div className="flex items-baseline gap-2 mb-8">
                      <span className="text-5xl md:text-6xl font-bold text-gradient">$300</span>
                      <span className="text-xl text-gray-500">/month</span>
                    </div>

                    <Link
                      href="/membership/dedicated-desk"
                      className="btn-primary w-full justify-center"
                    >
                      Get Started
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </div>

                  <div className="bg-burnt-orange-50/50 rounded-2xl p-6">
                    <h4 className="font-bold text-gray-900 mb-4">Everything you need:</h4>
                    <div className="space-y-3">
                      {[
                        '24/7 building access',
                        'High-speed WiFi',
                        'Personal storage',
                        'Kitchen access',
                        '2 hours meeting room credits',
                        'Event space access',
                        'All-you-can-drink coffee & tea'
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                          </div>
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Private Offices */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Private Office Rentals in Denver</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { name: 'Single Office', price: 500, people: '1 person', hours: '4 hours credits', popular: false },
                { name: 'Double Office', price: 700, people: '2 people', hours: '6 hours credits', popular: true },
                { name: 'Large Office', price: 1200, people: '4-8 people', hours: 'Unlimited credits', popular: false }
              ].map((office, i) => (
                <div
                  key={i}
                  className={`card-premium p-8 hover:border-burnt-orange-300 ${
                    office.popular ? 'ring-2 ring-burnt-orange-500/20' : ''
                  }`}
                >
                  {office.popular && (
                    <div className="inline-flex items-center gap-1 bg-burnt-orange-100 text-burnt-orange-700 px-3 py-1 rounded-full text-xs font-bold mb-4">
                      <Zap className="w-3 h-3" />
                      Popular
                    </div>
                  )}
                  <h4 className="text-xl font-bold text-gray-900 mb-2">{office.name}</h4>
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-4xl font-bold text-gray-900">${office.price}</span>
                    <span className="text-gray-500">/mo</span>
                  </div>
                  <div className="space-y-3 mb-8">
                    {[office.people, office.hours, 'Lockable office', 'Business address'].map((feat, j) => (
                      <div key={j} className="flex items-center gap-2 text-gray-600">
                        <CheckCircle className="w-4 h-4 text-burnt-orange-500" />
                        {feat}
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/membership/private-office"
                    className="block text-center bg-gray-900 text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-all duration-300 hover:shadow-lg"
                  >
                    Learn More
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Internal Links */}
          <div className="text-center mt-12">
            <p className="text-gray-600">
              <Link href="/membership" className="text-burnt-orange-600 hover:underline font-semibold">
                Compare all membership options
              </Link>
              {' '}or{' '}
              <Link href="/contact" className="text-burnt-orange-600 hover:underline font-semibold">
                schedule a tour
              </Link>
              {' '}of our Sloan&apos;s Lake workspace
            </p>
          </div>
        </div>
      </section>

      {/* Amenities - Enhanced */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-burnt-orange-50 rounded-full blur-3xl opacity-50" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="badge badge-orange mb-4">
              <Sparkles className="w-4 h-4" />
              All Inclusive
            </div>
            <h2 className="section-heading mb-4">Everything You Need</h2>
            <p className="section-subheading">Professional amenities for productive work in Sloan&apos;s Lake</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Wifi, title: 'High-Speed WiFi', desc: 'Reliable enterprise-grade internet' },
              { icon: Shield, title: '24/7 Security', desc: 'Monitored building with keycard access' },
              { icon: Phone, title: 'Phone Booths', desc: 'Private areas for important calls' },
              { icon: Monitor, title: 'Meeting Rooms', desc: '75" TVs with video calling' },
              { icon: Coffee, title: 'Unlimited Coffee & Tea', desc: 'All-you-can-drink included' },
              { icon: Users, title: 'Event Space', desc: 'Projector, sound, and recreation' },
              { icon: MapPin, title: 'Prime Location', desc: "3 minutes to I-25, heart of Sloan's Lake" },
              { icon: Calendar, title: 'Community Events', desc: 'Network with fellow entrepreneurs' }
            ].map((item, i) => (
              <div key={i} className="group text-center p-6 rounded-2xl hover:bg-burnt-orange-50/50 transition-all duration-300">
                <div className="icon-container mx-auto mb-4">
                  <item.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location with Map - Enhanced */}
      <section className="py-24 bg-gradient-to-br from-burnt-orange-50 via-white to-orange-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-burnt-orange-300 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="badge badge-orange mb-6">
                <MapPin className="w-4 h-4" />
                Find Us
              </div>
              <h2 className="section-heading mb-6">
                Coworking Space in Sloan&apos;s Lake
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Located next to the historic Landmark Merritt Church Building at the iconic intersection of 23rd and Irving Street in West Denver.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  { icon: MapPin, title: '2246 Irving Street', desc: "Sloan's Lake, Denver CO 80211" },
                  { icon: Clock, title: '3 Minutes to I-25', desc: 'Easy commute from anywhere in Denver metro' },
                  { icon: Users, title: 'Walkable Neighborhood', desc: "Restaurants, cafes, and Sloan's Lake Park nearby" }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 bg-white p-5 rounded-2xl shadow-soft border border-gray-100">
                    <div className="w-11 h-11 bg-burnt-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-burnt-orange-600" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{item.title}</div>
                      <div className="text-gray-600 text-sm">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/contact" className="btn-ghost group">
                Get directions and contact info
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="relative h-[400px] lg:h-[480px] rounded-3xl overflow-hidden shadow-soft-xl">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3067.4953180826856!2d-105.03225422342487!3d39.75098609588881!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x876c7932ec70db2b%3A0x8c38dd4cf4df270d!2sMerritt%20Workspace!5e0!3m2!1sen!2sus!4v1759948992207!5m2!1sen!2sus"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Merritt Workspace - Coworking Space at 2246 Irving Street, Sloan's Lake, Denver, CO 80211"
                className="rounded-3xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - Enhanced */}
      <section className="py-24 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern opacity-5" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-burnt-orange-600 via-burnt-orange-500 to-burnt-orange-600" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-burnt-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-burnt-orange-600/10 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-burnt-orange-500/20 text-burnt-orange-300 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4" />
            Start Your Journey
          </div>

          <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Ready to Join Our<br />
            <span className="text-gradient-dark">Sloan&apos;s Lake Community?</span>
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Start with a free trial day and experience Denver&apos;s most distinctive coworking space
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/membership/apply"
              className="group inline-flex items-center justify-center bg-gradient-to-r from-burnt-orange-500 to-burnt-orange-600 text-white px-10 py-5 rounded-xl font-bold hover:from-burnt-orange-600 hover:to-burnt-orange-700 transition-all duration-300 shadow-xl shadow-burnt-orange-500/30 hover:shadow-2xl hover:shadow-burnt-orange-500/40"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Schedule Free Tour
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center bg-white/10 backdrop-blur-sm text-white border border-white/20 px-10 py-5 rounded-xl font-semibold hover:bg-white hover:text-gray-900 transition-all duration-300"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
