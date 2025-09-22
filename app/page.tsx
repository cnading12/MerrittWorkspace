"use client";

import { MapPin, Wifi, Shield, Phone, Monitor, Coffee, Users, Calendar, ShoppingCart, UserPlus, Clock, Gamepad2, Volume2, Circle, Projector, Building2 } from 'lucide-react';
import Footer from '@/components/Footer';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const heroImages = [
    {
      src: '/images/hero/outside-hero.jpg',
      alt: 'Merritt Workspace exterior - Historic building in Sloan\'s Lake',
      title: 'Historic Character',
      subtitle: 'Next to the landmark Merritt Church Building'
    },
    {
      src: '/images/hero/conference-room.jpg',
      alt: 'Professional conference room with modern amenities',
      title: 'First-Class Meeting Rooms',
      subtitle: '75" Smart TV and conference calling capabilities'
    },
    {
      src: '/images/hero/dedicated-desk.jpg',
      alt: 'Dedicated desk workspace with burnt orange floors',
      title: 'Dedicated Workspaces',
      subtitle: 'Your own space in our collaborative environment'
    },
    {
      src: '/images/hero/kitchen.jpg',
      alt: 'Modern kitchen and break area',
      title: 'Full Kitchen Amenities',
      subtitle: 'Coffee, snacks, and meal preparation space'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [heroImages.length]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Hero Section with Image Carousel */}
      <section className="relative pt-16 pb-20 bg-gradient-to-br from-burnt-orange-50 to-burnt-orange-100 hero-section overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 text-balance">
                Where Work Meets
                <span className="text-burnt-orange-600 block">Community</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Located in the heart of Sloan's Lake, Merritt Workspace offers premium offices and dedicated desks 
                in a beautifully restored space with distinctive burnt orange floors and a vibrant event space next door.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/membership" className="bg-burnt-orange-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-burnt-orange-700 transition">
                  Schedule a Tour
                </Link>
                <a href="#workspace" className="border-2 border-burnt-orange-600 text-burnt-orange-600 px-8 py-4 rounded-lg font-semibold hover:bg-burnt-orange-600 hover:text-white transition">
                  View Pricing
                </a>
              </div>
            </div>

            {/* Hero Image Carousel */}
            <div className="relative">
              <div className="relative h-96 lg:h-[500px] rounded-2xl overflow-hidden shadow-2xl">
                {heroImages.map((image, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-1000 ${
                      index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      className="object-cover"
                      priority={index === 0}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <div className="absolute bottom-6 left-6 text-white">
                      <h3 className="text-2xl font-bold mb-1">{image.title}</h3>
                      <p className="text-white/90">{image.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Image Navigation Dots */}
              <div className="flex justify-center mt-6 space-x-2">
                {heroImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === currentImageIndex 
                        ? 'bg-burnt-orange-600 w-8' 
                        : 'bg-burnt-orange-300 hover:bg-burnt-orange-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative element representing the burnt orange floors */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-r from-burnt-orange-400 via-burnt-orange-500 to-burnt-orange-600 opacity-80"></div>
      </section>



      {/* Space Showcase */}
      <section className="py-20 bg-gradient-to-br from-burnt-orange-50 to-burnt-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Explore Our Spaces</h2>
            <p className="text-xl text-gray-600">Two connected buildings designed for productivity and collaboration</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Main Workspace */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="relative h-64">
                <Image
                  src="/images/hero/dedicated-desk.jpg"
                  alt="Main workspace with distinctive burnt orange floors"
                  fill
                  className="object-cover"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-burnt-orange-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Main Workspace
                  </span>
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Historic Coworking Space</h3>
                <p className="text-gray-600 mb-6">
                  Our beautifully restored main building features 13 individual office spaces and dedicated desks, 
                  all with our signature burnt orange floors that create a warm, inspiring atmosphere.
                </p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center text-gray-700">
                    <Shield className="w-5 h-5 text-burnt-orange-600 mr-2" />
                    <span className="text-sm">24/7 Secure Access</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Wifi className="w-5 h-5 text-burnt-orange-600 mr-2" />
                    <span className="text-sm">High-Speed WiFi</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Phone className="w-5 h-5 text-burnt-orange-600 mr-2" />
                    <span className="text-sm">Private Phone Booths</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Coffee className="w-5 h-5 text-burnt-orange-600 mr-2" />
                    <span className="text-sm">Full Kitchen</span>
                  </div>
                </div>
                <Link href="/about" className="text-burnt-orange-600 font-semibold hover:text-burnt-orange-700 transition">
                  Learn More About Our Space →
                </Link>
              </div>
            </div>

            {/* Event Space */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="relative h-64">
                <Image
                  src="/images/event-space/event-space-1.png"
                  alt="Event space with projector, sound system, and flexible seating"
                  fill
                  className="object-cover"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Event Space
                  </span>
                </div>
                <div className="absolute top-4 right-4">
                  <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Open Until 4:30 PM
                  </span>
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Multi-Purpose Event Space</h3>
                <p className="text-gray-600 mb-6">
                  Connected to our main workspace, this versatile space features a coffee shop area, meeting space, 
                  and recreational facilities. Perfect for team meetings, events, or taking a productive break.
                </p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center text-gray-700">
                    <Projector className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-sm">Projector & Screen</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Volume2 className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-sm">Professional Sound</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Circle className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-sm">Ping Pong Table</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Coffee className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-sm">Coffee Shop Area</span>
                  </div>
                </div>
                <div className="flex items-center text-amber-700 bg-amber-50 p-3 rounded-lg">
                  <Clock className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">Available to coworkers daily until 4:30 PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Event Space Details */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Event Space Features</h2>
            <p className="text-xl text-gray-600">Everything you need for meetings, events, and relaxation</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 bg-blue-50 rounded-xl">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Coffee className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Coffee Shop Area</h3>
              <p className="text-gray-600 text-sm">Permanent seating and tables in 1/4 of the space for casual meetings and coffee breaks</p>
            </div>

            <div className="text-center p-6 bg-blue-50 rounded-xl">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Projector className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Presentation Ready</h3>
              <p className="text-gray-600 text-sm">Professional projector and screen setup perfect for team presentations and client meetings</p>
            </div>

            <div className="text-center p-6 bg-blue-50 rounded-xl">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Volume2 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Sound System</h3>
              <p className="text-gray-600 text-sm">High-quality audio system for presentations, music, or event announcements</p>
            </div>

            <div className="text-center p-6 bg-blue-50 rounded-xl">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Circle className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Recreation</h3>
              <p className="text-gray-600 text-sm">Ping pong table and flexible space for team building, breaks, and stress relief</p>
            </div>
          </div>

          {/* Event Space Images */}
          <div className="mt-12 grid md:grid-cols-2 gap-8">
            <div className="relative h-96 rounded-xl overflow-hidden shadow-lg">
              <Image
                src="/images/event-space/event-space-2.png"
                alt="Event space flexible meeting area"
                fill
                className="object-cover"
              />
              <div className="absolute bottom-4 left-4 text-white">
                <h4 className="text-lg font-semibold">Flexible Meeting Space</h4>
                <p className="text-white/90 text-sm">Configurable for teams of any size</p>
              </div>
            </div>
            <div className="relative h-96 rounded-xl overflow-hidden shadow-lg">
              <Image
                src="/images/event-space/coffee-shop.png"
                alt="Coffee shop area with permanent seating"
                fill
                className="object-cover"
              />
              <div className="absolute bottom-4 left-4 text-white">
                <h4 className="text-lg font-semibold">Coffee Shop Corner</h4>
                <p className="text-white/90 text-sm">Casual seating for informal meetings</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workspace Options */}
      <section id="workspace" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Choose Your Workspace</h2>
            <p className="text-xl text-gray-600">13 individual offices and dedicated desks to meet your needs</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Dedicated Desks */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
              <div className="relative h-48">
                <Image
                  src="/images/hero/dedicated-desk.jpg"
                  alt="Dedicated desk workspace"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Dedicated Desks</h3>
                <p className="text-gray-600 mb-4">Your own workspace in our open collaborative environment</p>
                <div className="text-3xl font-bold text-burnt-orange-600 mb-4">$300<span className="text-lg text-gray-500">/month</span></div>
                <ul className="space-y-2 text-gray-600">
                  <li>• 24/7 access</li>
                  <li>• High-speed wifi</li>
                  <li>• Storage options</li>
                  <li>• Community access</li>
                  <li>• Event space access</li>
                </ul>
              </div>
            </div>

            {/* Private Offices */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
              <div className="relative h-48">
                <Image
                  src="/images/hero/conference-room.jpg"
                  alt="Private office space"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Private Offices</h3>
                <p className="text-gray-600 mb-4">Fully private offices for individuals or small teams</p>
                <div className="text-3xl font-bold text-burnt-orange-600 mb-4">$600<span className="text-lg text-gray-500">/month</span></div>
                <ul className="space-y-2 text-gray-600">
                  <li>• Complete privacy</li>
                  <li>• Lockable space</li>
                  <li>• Phone booth access</li>
                  <li>• Professional address</li>
                  <li>• Event space priority</li>
                </ul>
              </div>
            </div>

            {/* Large Offices */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition md:col-span-2 lg:col-span-1">
              <div className="relative h-48">
                <Image
                  src="/images/outside.jpg"
                  alt="Large office space"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Large Offices</h3>
                <p className="text-gray-600 mb-4">Spacious offices perfect for growing teams</p>
                <div className="text-3xl font-bold text-burnt-orange-600 mb-4">$1200<span className="text-lg text-gray-500">/month</span></div>
                <ul className="space-y-2 text-gray-600">
                  <li>• Extra space</li>
                  <li>• Team collaboration</li>
                  <li>• Meeting capabilities</li>
                  <li>• Premium location</li>
                  <li>• Event space booking</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section id="amenities" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Premium Amenities</h2>
            <p className="text-xl text-gray-600">Everything you need for productive work and collaboration</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <Wifi className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">High-Speed Wifi</h3>
              <p className="text-gray-600">Reliable internet for all your business needs</p>
            </div>
            
            <div className="text-center">
              <Shield className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Secure Building</h3>
              <p className="text-gray-600">24/7 monitoring and keycard access</p>
            </div>
            
            <div className="text-center">
              <Phone className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Phone Booths</h3>
              <p className="text-gray-600">Private areas for important calls</p>
            </div>
            
            <div className="text-center">
              <Monitor className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">A/V Equipment</h3>
              <p className="text-gray-600">Conference rooms with TVs and video calling</p>
            </div>
            
            <div className="text-center">
              <Coffee className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Food & Beverage</h3>
              <p className="text-gray-600">On-site snack shop and full kitchen</p>
            </div>
            
            <div className="text-center">
              <Users className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Networking Events</h3>
              <p className="text-gray-600">Connect with fellow entrepreneurs</p>
            </div>
            
            <div className="text-center">
              <MapPin className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Prime Location</h3>
              <p className="text-gray-600">3 minutes to I-25, heart of Sloan's Lake</p>
            </div>
            
            <div className="text-center">
              <Gamepad2 className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Event Space Access</h3>
              <p className="text-gray-600">Multi-purpose space with recreation and meeting areas</p>
            </div>
          </div>
        </div>
      </section>

      {/* Location Showcase */}
      <section className="py-20 bg-gradient-to-br from-burnt-orange-50 to-burnt-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Perfect Sloan's Lake Location</h2>
              <p className="text-xl text-gray-600 mb-6">
                Located next to the historic Landmark Merritt Church Building, our workspace puts you at the heart 
                of one of Denver's most vibrant neighborhoods.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center">
                  <MapPin className="w-6 h-6 text-burnt-orange-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-900">2246 Irving Street</p>
                    <p className="text-gray-600">Heart of Sloan's Lake at 23rd and Irving</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="w-6 h-6 text-burnt-orange-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-900">3 Minutes to I-25</p>
                    <p className="text-gray-600">Easy commute from anywhere in Denver</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Users className="w-6 h-6 text-burnt-orange-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-900">Walkable Neighborhood</p>
                    <p className="text-gray-600">Restaurants, cafes, and Sloan's Lake Park nearby</p>
                  </div>
                </div>
              </div>

              <Link href="/contact" className="bg-burnt-orange-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-burnt-orange-700 transition inline-block">
                Get Directions
              </Link>
            </div>

            <div className="relative h-96 rounded-2xl overflow-hidden shadow-xl">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3048.3751849999447!2d-105.02659242404156!3d39.75089969486985!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x876c79e0c86f6b7b%3A0x8c8b8b8b8b8b8b8b!2s2246%20Irving%20St%2C%20Denver%2C%20CO%2080211!5e0!3m2!1sen!2sus!4v1693846800000!5m2!1sen!2sus"
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

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-burnt-orange-500 to-burnt-orange-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Join Our Community?</h2>
          <p className="text-xl text-burnt-orange-100 mb-8">
            Start with a free trial day to experience both our workspace and event space
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/membership" className="bg-white text-burnt-orange-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition inline-block">
              Schedule Your Free Trial
            </Link>
            <Link href="/contact" className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-burnt-orange-600 transition inline-block">
              Contact Us Today
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}