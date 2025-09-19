"use client";

import { Building2, MapPin, Users, History, Heart, Star, Award, Coffee, Wifi, Shield } from 'lucide-react';
import Footer from "@/components/Footer";
import Image from "next/image";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-burnt-orange-50 to-burnt-orange-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Where Work Meets Community
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Nestled next to the historic Landmark Merritt Church Building in the heart of Sloan's Lake,
              Merritt Workspace combines historic charm with modern amenities to create Denver's most unique coworking experience.
            </p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Merritt Workspace was born from a vision to create more than just office space—we wanted to build a community.
                  Located at the iconic intersection of 23rd and Irving Street in Denver's vibrant Sloan's Lake neighborhood,
                  our workspace sits proudly next to the historic Landmark Merritt Church Building.
                </p>
                <p>
                  This prime location offers the perfect blend of historic character and modern convenience. Just three minutes from I-25,
                  our members enjoy easy access while working in a space that celebrates Denver's architectural heritage with our
                  distinctive burnt orange floors and thoughtfully restored interior.
                </p>
                <p>
                  We believe that great work happens when professionals have the right environment, the right tools, and the right community.
                  That's why we've created 13 individual office spaces of various sizes, each designed to meet the unique needs of
                  small companies and independent business professionals.
                </p>
              </div>
            </div>
            <div className="relative">
              {/* Placeholder for building image */}
              <Image
                src="/images/1.jpg"
                alt="Historic Merritt Workspace building at 2246 Irving Street, Denver"
                width={600}
                height={384}
                className="rounded-xl object-cover w-full h-96"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission & Values */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission & Values</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're committed to providing a workspace that empowers businesses to thrive while building
              meaningful connections within our community.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <Heart className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-4">Community First</h3>
              <p className="text-gray-600">
                We believe in fostering genuine connections between professionals. Our networking events,
                shared spaces, and collaborative atmosphere create opportunities for meaningful business relationships.
              </p>
            </div>

            <div className="text-center">
              <Award className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-4">Excellence & Quality</h3>
              <p className="text-gray-600">
                From our high-speed WiFi and first-class meeting rooms to our professional atmosphere,
                we maintain the highest standards in every aspect of our workspace experience.
              </p>
            </div>

            <div className="text-center">
              <Users className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-4">Flexibility & Support</h3>
              <p className="text-gray-600">
                With no long-term lease requirements and responsive support, we adapt to your business needs
                as they evolve, providing the flexibility modern businesses require.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Location & Heritage */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              {/* Placeholder for location/neighborhood image */}
              <div className="bg-gradient-to-br from-blue-200 to-blue-300 rounded-xl h-96 flex items-center justify-center">
                <div className="text-center text-blue-800">
                  <MapPin className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg font-semibold">Sloan's Lake Neighborhood</p>
                  <p className="text-sm">Historic Denver Community</p>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">A Historic Location</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Our workspace sits in one of Denver's most beloved neighborhoods, adjacent to the historic Landmark Merritt Church Building.
                  This prime Sloan's Lake location puts you at the center of a thriving community known for its walkability,
                  local businesses, and stunning mountain views.
                </p>
                <p>
                  The Sloan's Lake area has become a hub for creative professionals and innovative businesses, making it the perfect
                  location for our workspace community. Whether you walk, bike, or drive, you'll find our location incredibly convenient
                  with easy access to downtown Denver and major highways.
                </p>
                <div className="bg-burnt-orange-50 p-4 rounded-lg border border-burnt-orange-200">
                  <h4 className="font-semibold text-burnt-orange-900 mb-2">Why Our Location Matters</h4>
                  <ul className="space-y-1 text-burnt-orange-800 text-sm">
                    <li>• Walking distance to Sloan's Lake Park</li>
                    <li>• Surrounded by local restaurants and cafes</li>
                    <li>• Just 3 minutes to I-25 for easy commuting</li>
                    <li>• Historic neighborhood with modern amenities</li>
                    <li>• Ample parking available</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-16 bg-burnt-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What Makes Us Different</h2>
            <p className="text-xl text-gray-600">
              It's not just about the space—it's about the experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 text-center shadow-sm">
              <History className="w-10 h-10 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Historic Character</h3>
              <p className="text-sm text-gray-600">
                Distinctive burnt orange floors and thoughtfully restored spaces that inspire creativity
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 text-center shadow-sm">
              <Shield className="w-10 h-10 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Secure & Monitored</h3>
              <p className="text-sm text-gray-600">
                24/7 building security with keycard access for peace of mind
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 text-center shadow-sm">
              <Coffee className="w-10 h-10 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Full-Service Amenities</h3>
              <p className="text-sm text-gray-600">
                On-site snackshop, meeting rooms, and everything you need to be productive
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 text-center shadow-sm">
              <Users className="w-10 h-10 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Vibrant Community</h3>
              <p className="text-sm text-gray-600">
                Regular networking events and a collaborative atmosphere
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workspace Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Professional Workspace Features</h2>
            <p className="text-xl text-gray-600">
              13 individual office spaces designed for modern business needs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <Wifi className="w-6 h-6 text-burnt-orange-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">High-Speed WiFi</h3>
                <p className="text-gray-600 text-sm">Reliable internet connectivity throughout the building for seamless work</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Building2 className="w-6 h-6 text-burnt-orange-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">First-Class Meeting Rooms</h3>
                <p className="text-gray-600 text-sm">Professional meeting spaces with TVs and conference calling capabilities</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Users className="w-6 h-6 text-burnt-orange-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Private Phone Areas</h3>
                <p className="text-gray-600 text-sm">Dedicated spaces for confidential calls and video conferences</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Coffee className="w-6 h-6 text-burnt-orange-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Food & Beverage Service</h3>
                <p className="text-gray-600 text-sm">On-site snackshop with fresh coffee, meals, and snacks</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Shield className="w-6 h-6 text-burnt-orange-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Secure Building</h3>
                <p className="text-gray-600 text-sm">Professional security and monitoring systems</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Star className="w-6 h-6 text-burnt-orange-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Cable & Streaming</h3>
                <p className="text-gray-600 text-sm">Entertainment and information services available</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Commitment */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Commitment to You</h2>
          <p className="text-xl text-gray-600 mb-8">
            At Merritt Workspace, we're more than just a place to work—we're your business partner.
            We understand that every business is unique, which is why we offer flexible solutions without
            long-term lease requirements.
          </p>

          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            <p className="text-lg text-gray-700 mb-6">
              Whether you're a freelancer seeking a professional environment, a small business looking for your first office,
              or an established company needing additional space, we have the right solution for you.
            </p>
            <p className="text-lg text-gray-700 mb-8">
              Experience the difference of working in a space that values community, quality, and your success.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/membership" className="bg-burnt-orange-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-burnt-orange-700 transition">
                Start Your Free Trial
              </a>
              <a href="/contact" className="border-2 border-burnt-orange-600 text-burnt-orange-600 px-8 py-4 rounded-lg font-semibold hover:bg-burnt-orange-600 hover:text-white transition">
                Schedule a Tour
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}