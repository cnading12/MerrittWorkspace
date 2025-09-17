"use client";

import { MapPin, Wifi, Shield, Phone, Monitor, Coffee, Users, Calendar, ShoppingCart, UserPlus } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Link from 'next/link';

export default function MerrittWorkspace() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 bg-gradient-to-br from-orange-50 to-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
          <div className="text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Where Work Meets
              <span className="text-orange-600 block">Community</span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Located in the heart of Sloan's Lake, Merritt Workspace offers premium offices and dedicated desks 
              in a beautifully restored space with distinctive burnt orange floors.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/new-member" className="bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-orange-700 transition">
                Schedule a Tour
              </Link>
              <a href="#workspace" className="border-2 border-orange-600 text-orange-600 px-8 py-4 rounded-lg font-semibold hover:bg-orange-600 hover:text-white transition">
                View Pricing
              </a>
            </div>
          </div>
        </div>
        
        {/* Decorative element representing the burnt orange floors */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 opacity-80"></div>
      </section>

      {/* Quick Actions */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gray-50 rounded-xl hover:shadow-lg transition">
              <Calendar className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Book Conference Room</h3>
              <p className="text-gray-600 mb-4">Reserve our first-class meeting rooms with A/V equipment</p>
              <Link href="/conference-room" className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition inline-block">
                Book Now
              </Link>
            </div>
            
            <div className="text-center p-6 bg-gray-50 rounded-xl hover:shadow-lg transition">
              <ShoppingCart className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Snack Shop</h3>
              <p className="text-gray-600 mb-4">Grab coffee, snacks, and beverages throughout the day</p>
              <Link href="/snackshop" className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition inline-block">
                Shop Now
              </Link>
            </div>
            
            <div className="text-center p-6 bg-gray-50 rounded-xl hover:shadow-lg transition">
              <UserPlus className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Become a Member</h3>
              <p className="text-gray-600 mb-4">Join our community of entrepreneurs and professionals</p>
              <Link href="/new-member" className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition inline-block">
                Apply Today
              </Link>
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
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-orange-100 to-orange-200"></div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Dedicated Desks</h3>
                <p className="text-gray-600 mb-4">Your own workspace in our open collaborative environment</p>
                <div className="text-3xl font-bold text-orange-600 mb-4">$300<span className="text-lg text-gray-500">/month</span></div>
                <ul className="space-y-2 text-gray-600">
                  <li>• 24/7 access</li>
                  <li>• High-speed wifi</li>
                  <li>• Storage options</li>
                  <li>• Community access</li>
                </ul>
              </div>
            </div>

            {/* Private Offices */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-orange-200 to-orange-300"></div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Private Offices</h3>
                <p className="text-gray-600 mb-4">Fully private offices for individuals or small teams</p>
                <div className="text-3xl font-bold text-orange-600 mb-4">$600<span className="text-lg text-gray-500">/month</span></div>
                <ul className="space-y-2 text-gray-600">
                  <li>• Complete privacy</li>
                  <li>• Lockable space</li>
                  <li>• Phone booth access</li>
                  <li>• Professional address</li>
                </ul>
              </div>
            </div>

            {/* Large Offices */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden md:col-span-2 lg:col-span-1">
              <div className="h-48 bg-gradient-to-br from-orange-300 to-orange-400"></div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Large Offices</h3>
                <p className="text-gray-600 mb-4">Spacious offices perfect for growing teams</p>
                <div className="text-3xl font-bold text-orange-600 mb-4">$1200<span className="text-lg text-gray-500">/month</span></div>
                <ul className="space-y-2 text-gray-600">
                  <li>• Extra space</li>
                  <li>• Team collaboration</li>
                  <li>• Meeting capabilities</li>
                  <li>• Premium location</li>
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
            <p className="text-xl text-gray-600">Everything you need for productive work</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <Wifi className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">High-Speed Wifi</h3>
              <p className="text-gray-600">Reliable internet for all your business needs</p>
            </div>
            
            <div className="text-center">
              <Shield className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Secure Building</h3>
              <p className="text-gray-600">24/7 monitoring and keycard access</p>
            </div>
            
            <div className="text-center">
              <Phone className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Phone Booths</h3>
              <p className="text-gray-600">Private areas for important calls</p>
            </div>
            
            <div className="text-center">
              <Monitor className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">A/V Equipment</h3>
              <p className="text-gray-600">Conference rooms with TVs and video calling</p>
            </div>
            
            <div className="text-center">
              <Coffee className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Food & Beverage</h3>
              <p className="text-gray-600">On-site snack shop and refreshments</p>
            </div>
            
            <div className="text-center">
              <Users className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Networking Events</h3>
              <p className="text-gray-600">Connect with fellow entrepreneurs</p>
            </div>
            
            <div className="text-center">
              <MapPin className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Prime Location</h3>
              <p className="text-gray-600">3 minutes to I-25, heart of Sloan's Lake</p>
            </div>
            
            <div className="text-center">
              <Calendar className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Flexible Terms</h3>
              <p className="text-gray-600">No long-term lease required</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Join Our Community?</h2>
          <p className="text-xl text-orange-100 mb-8">Start with a free trial day to experience the space</p>
          <Link href="/new-member" className="bg-white text-orange-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition inline-block">
            Schedule Your Free Trial
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}