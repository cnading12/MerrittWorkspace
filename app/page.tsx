"use client";

import { useState, useEffect } from 'react';
import { MapPin, Wifi, Shield, Phone, Monitor, Coffee, Users, Calendar, Clock, ArrowRight, CheckCircle, Projector, Volume2, Circle } from 'lucide-react';
import Footer from '@/components/Footer';


export default function ImprovedHomePage() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const heroImages = [
    {
      src: '/images/hero/outside-hero.jpg',
      title: 'Historic Character',
      subtitle: 'Next to the landmark Merritt Church Building'
    },
    {
      src: '/images/hero/conference-room.jpg',
      title: 'First-Class Meeting Rooms',
      subtitle: '75" Smart TV and conference calling'
    },
    {
      src: '/images/hero/dedicated-desk.jpg',
      title: 'Your Dedicated Workspace',
      subtitle: 'Distinctive burnt orange floors'
    },
    {
      src: '/images/hero/kitchen.jpg',
      title: 'Full Kitchen Amenities',
      subtitle: 'Coffee, snacks, and more'
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
      <section className="relative bg-gradient-to-br from-orange-50 via-white to-orange-50 pt-32 pb-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-2 items-center">
            {/* Content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <MapPin className="w-4 h-4" />
                Sloan's Lake, Denver
              </div>

              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Where Work
                <span className="block text-orange-600">Meets Community</span>
              </h1>

              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Premium offices and dedicated desks in a beautifully restored space. Denver's most distinctive coworking environment—where history and modern work culture meet.
              </p>

              {/* Key Features */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">24/7 Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">3 min to I-25</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Free Trial Day</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">No Long Leases</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <a href="/membership" className="inline-flex items-center justify-center bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-orange-700 transition shadow-lg hover:shadow-xl">
                  Schedule Free Tour
                  <ArrowRight className="w-5 h-5 ml-2" />
                </a>
                <a href="#pricing" className="inline-flex items-center justify-center border-2 border-gray-900 text-gray-900 px-8 py-4 rounded-lg font-semibold hover:bg-gray-900 hover:text-white transition">
                  View Pricing
                </a>
              </div>
            </div>

            {/* Image Carousel */}
            <div className="relative">
              <div className="relative h-[450px] md:h-[550px] lg:h-[640px] rounded-2xl overflow-hidden shadow-2xl">
                {heroImages.map((image, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-1000 ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                      }`}
                  >
                    <img
                      src={image.src}
                      alt={image.title}
                      className={`w-full h-full ${index === 0 ? 'object-contain bg-gray-900' : 'object-cover'}`} />
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
              <div className="text-gray-400">Office Spaces</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-500 mb-2">24/7</div>
              <div className="text-gray-400">Access</div>
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

      {/* Event Space Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Calendar className="w-4 h-4" />
              Bonus Space Next Door
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Multi-Purpose Event Space</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Connected to our main workspace, members have access to our versatile event space with coffee shop area, projector, sound system, and recreation facilities
            </p>
            <div className="inline-flex items-center gap-2 mt-4 text-green-700 font-semibold">
              <Clock className="w-5 h-5" />
              Open to members daily until 4:30 PM
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-12">
            <div className="relative h-96 rounded-2xl overflow-hidden shadow-xl">
              <img
                src="/images/event-space/event-space-1.png"
                alt="Event space with projector and flexible seating"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-6">
              {[
                { icon: Coffee, title: 'Coffee Shop Area', desc: 'Permanent seating in 1/4 of the space for casual meetings and coffee breaks' },
                { icon: Projector, title: 'Presentation Ready', desc: 'Professional projector and screen setup for team presentations' },
                { icon: Volume2, title: 'Sound System', desc: 'High-quality audio for presentations, music, or events' },
                { icon: Circle, title: 'Recreation', desc: 'Ping pong table and flexible space for team building' }
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

          <div className="grid md:grid-cols-2 gap-8">
            <div className="relative h-64 rounded-xl overflow-hidden shadow-lg">
              <img
                src="/images/event-space/event-space-2.png"
                alt="Event space flexible meeting area"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg">
                <p className="font-semibold text-gray-900">Flexible Meeting Space</p>
              </div>
            </div>
            <div className="relative h-64 rounded-xl overflow-hidden shadow-lg">
              <img
                src="/images/event-space/coffee-shop.png"
                alt="Coffee shop area with permanent seating"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg">
                <p className="font-semibold text-gray-900">Coffee Shop Corner</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Choose the workspace that fits your needs</p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Dedicated Desk - Featured */}
            <div className="lg:col-span-4 mb-8">
              <div className="relative bg-white rounded-2xl shadow-xl border-4 border-orange-500 overflow-hidden max-w-4xl mx-auto">
                <div className="absolute top-6 right-6">
                  <span className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                    Best Value
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-8 p-8">
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">Dedicated Desk</h3>
                    <p className="text-gray-600 mb-6">Your own workspace in our collaborative environment</p>

                    <div className="flex items-baseline gap-2 mb-6">
                      <span className="text-5xl font-bold text-orange-600">$300</span>
                      <span className="text-xl text-gray-500">/month</span>
                    </div>

                    <a href="/membership/dedicated-desk" className="inline-flex items-center justify-center w-full bg-orange-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-orange-700 transition">
                      Get Started
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </a>
                  </div>

                  <div>
                    <div className="space-y-3">
                      {[
                        '24/7 building access',
                        'High-speed WiFi',
                        'Personal storage',
                        'Kitchen access',
                        '2 hours meeting room credits',
                        'Event space access',
                        'Community events'
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
              <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Private Offices</h3>
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
                    <a href="/membership/private-office" className="block text-center bg-gray-900 text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-800 transition">
                      Learn More
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything You Need</h2>
            <p className="text-xl text-gray-600">Professional amenities for productive work</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Wifi, title: 'High-Speed WiFi', desc: 'Reliable enterprise-grade internet' },
              { icon: Shield, title: '24/7 Security', desc: 'Monitored building with keycard access' },
              { icon: Phone, title: 'Phone Booths', desc: 'Private areas for important calls' },
              { icon: Monitor, title: 'Meeting Rooms', desc: '75" TVs with video calling' },
              { icon: Coffee, title: 'Full Kitchen', desc: 'Coffee, snacks, and prep space' },
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

      {/* Location */}
      <section className="py-20 bg-gradient-to-br from-orange-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Perfect Sloan's Lake Location
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Located next to the historic Landmark Merritt Church Building at the iconic intersection of 23rd and Irving Street.
              </p>

              <div className="space-y-4">
                {[
                  { icon: MapPin, title: '2246 Irving Street', desc: '23rd and Irving, Denver CO' },
                  { icon: Clock, title: '3 Minutes to I-25', desc: 'Easy commute from anywhere' },
                  { icon: Users, title: 'Walkable Neighborhood', desc: 'Restaurants, cafes, and Sloan\'s Lake Park' }
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
                title="Merritt Workspace Location - 2246 Irving Street, Denver, CO"
                className="rounded-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Join Our Community?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Start with a free trial day and experience the difference
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/membership" className="inline-flex items-center justify-center bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-orange-700 transition shadow-lg">
              Schedule Free Tour
              <ArrowRight className="w-5 h-5 ml-2" />
            </a>
            <a href="/contact" className="inline-flex items-center justify-center bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition">
              Contact Us
            </a>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}