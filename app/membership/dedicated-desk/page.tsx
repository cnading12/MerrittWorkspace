"use client";

import { Check, Clock, Wifi, Shield, Coffee, Users, Calendar, MapPin, Phone } from 'lucide-react';
import Footer from "@/components/Footer";
import Link from 'next/link';
import Image from 'next/image';

export default function DedicatedDeskPage() {
  return (
    <main className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-burnt-orange-50 to-burnt-orange-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="bg-burnt-orange-600 text-white px-4 py-2 rounded-full text-sm font-semibold inline-block mb-4">
              Most Popular Choice
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Dedicated Desk Membership
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Your own workspace in our vibrant coworking community. Perfect for freelancers, consultants, 
              and remote workers who want consistency and connection.
            </p>
            
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8 inline-block">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold text-burnt-orange-600">$300</span>
                <span className="text-xl text-gray-500">/month</span>
              </div>
              <p className="text-gray-600 text-sm">No long-term contracts required</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/membership/apply" className="bg-burnt-orange-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-burnt-orange-700 transition">
                Apply for Dedicated Desk
              </Link>
              <Link href="/contact" className="border-2 border-burnt-orange-600 text-burnt-orange-600 px-8 py-4 rounded-lg font-semibold hover:bg-burnt-orange-600 hover:text-white transition">
                Schedule Tour
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What's Included</h2>
            <p className="text-xl text-gray-600">Everything you need for productive work</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-6 h-6 text-burnt-orange-600" />
                <h3 className="text-lg font-semibold">24/7 Access</h3>
              </div>
              <p className="text-gray-600">Work on your schedule with round-the-clock building access</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <Wifi className="w-6 h-6 text-burnt-orange-600" />
                <h3 className="text-lg font-semibold">High-Speed WiFi</h3>
              </div>
              <p className="text-gray-600">Enterprise-grade internet throughout the building</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-6 h-6 text-burnt-orange-600" />
                <h3 className="text-lg font-semibold">Secure Storage</h3>
              </div>
              <p className="text-gray-600">Lockable desk drawers and personal storage options</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <Coffee className="w-6 h-6 text-burnt-orange-600" />
                <h3 className="text-lg font-semibold">Full Kitchen</h3>
              </div>
              <p className="text-gray-600">Coffee, microwave, refrigerator, and prep space</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <Phone className="w-6 h-6 text-burnt-orange-600" />
                <h3 className="text-lg font-semibold">Phone Booths</h3>
              </div>
              <p className="text-gray-600">Private areas for calls and video meetings</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-6 h-6 text-burnt-orange-600" />
                <h3 className="text-lg font-semibold">Meeting Credits</h3>
              </div>
              <p className="text-gray-600">2 free hours of conference room time per month</p>
            </div>
          </div>
        </div>
      </section>

      {/* Event Space Access */}
      <section className="py-16 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Bonus: Event Space Access</h2>
            <p className="text-xl text-gray-600">Use our multi-purpose event space next door until 4:30 PM daily</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl text-center">
              <Coffee className="w-8 h-8 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Coffee Shop Area</h3>
              <p className="text-gray-600 text-sm">Casual seating for informal meetings</p>
            </div>

            <div className="bg-white p-6 rounded-xl text-center">
              <MapPin className="w-8 h-8 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Projector Setup</h3>
              <p className="text-gray-600 text-sm">Professional presentation equipment</p>
            </div>

            <div className="bg-white p-6 rounded-xl text-center">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Sound System</h3>
              <p className="text-gray-600 text-sm">High-quality audio for meetings</p>
            </div>

            <div className="bg-white p-6 rounded-xl text-center">
              <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Recreation</h3>
              <p className="text-gray-600 text-sm">Ping pong and break areas</p>
            </div>
          </div>
        </div>
      </section>

      {/* Perfect For */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Perfect For</h2>
            <p className="text-xl text-gray-600">Ideal workspace solution for these professionals</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-burnt-orange-50 rounded-xl">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Freelancers & Consultants</h3>
              <p className="text-gray-600">Professional environment separate from home with networking opportunities</p>
            </div>

            <div className="text-center p-6 bg-burnt-orange-50 rounded-xl">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Remote Workers</h3>
              <p className="text-gray-600">Escape home distractions while maintaining flexibility and community</p>
            </div>

            <div className="text-center p-6 bg-burnt-orange-50 rounded-xl">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">New Entrepreneurs</h3>
              <p className="text-gray-600">Building their business with access to professional network and meeting spaces</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-gradient-to-r from-burnt-orange-500 to-burnt-orange-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-burnt-orange-100 mb-8">
            Join our community and start working in your dedicated space
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/membership/apply" className="bg-white text-burnt-orange-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition">
              Apply for Membership
            </Link>
            <Link href="/contact" className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-burnt-orange-600 transition">
              Schedule a Tour
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}