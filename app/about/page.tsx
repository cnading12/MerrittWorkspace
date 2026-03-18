"use client";

import { Building2, MapPin, Users, History, Heart, Clock, Award, Coffee } from 'lucide-react';
import Image from "next/image";
import Footer from "@/components/Footer";

export default function ImprovedAboutPage() {
  return (
    <main className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-burnt-orange-50 to-burnt-orange-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              A Church Transformed,<br />A Community Preserved
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Since 1905, this landmark building has been the heart of the Sloan's Lake neighborhood. 
              Today, we honor that legacy by creating a workspace where community and collaboration thrive.
            </p>
          </div>
        </div>
      </section>

      {/* The Story - Lead with the church history */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <Image
                src="/images/event-space/outside.webp"
                alt="Historic Merritt Church Building transformed into workspace"
                width={600}
                height={400}
                placeholder="blur"
                blurDataURL="data:image/webp;base64,UklGRjIAAABXRUJQVlA4ICYAAACwAQCdASoKAAgABUB8JYgCdADQU94AAP49G2a/dbp6oybwgjwAAA=="
                className="rounded-xl object-cover w-full h-96 shadow-lg"
                priority
              />
              <div className="absolute -bottom-6 -right-6 bg-burnt-orange-600 text-white p-6 rounded-lg shadow-xl">
                <div className="text-4xl font-bold">1905</div>
                <div className="text-sm">Since</div>
              </div>
            </div>
            <div>
              <div className="inline-block bg-burnt-orange-100 text-burnt-orange-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                Our Story
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Where History Meets Innovation</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  When Merritt Church closed its doors after serving the Sloan's Lake community for over a century, 
                  founder Lance Nading saw an opportunity. Rather than let this historic landmark fade away, he 
                  envisioned a new gathering place—one that would continue bringing people together, just in a different way.
                </p>
                <p>
                  Lance transformed the 119-year-old church and adjacent building into Merritt Workspace, carefully 
                  preserving the soaring ceilings, original wood floors, beautiful stained glass, and remarkable acoustics 
                  that make this space truly one-of-a-kind. The result is Denver's most distinctive coworking environment—where 
                  history and modern work culture meet.
                </p>
                <p>
                  Today, the former church sanctuary serves as our event space and coffee shop, hosting everything from 
                  member gatherings to fitness classes. Meanwhile, 14 thoughtfully designed offices welcome businesses of 
                  all sizes, from solo freelancers to growing teams of eight.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Us Different - Condensed */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Members Choose Merritt</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're not a corporate coworking chain. We're a neighborhood institution with soul.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
              <History className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">Historic Character</h3>
              <p className="text-gray-600">
                Work in a lovingly restored 1905 landmark building. Original stained glass, soaring ceilings, 
                and distinctive burnt orange floors create an atmosphere you won't find anywhere else.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
              <Heart className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">True Community</h3>
              <p className="text-gray-600">
                We're woven into the fabric of Sloan's Lake. As the only business in a residential neighborhood, 
                you'll feel like part of something bigger—because you are.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
              <Users className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">Room to Grow</h3>
              <p className="text-gray-600">
                Start solo at a dedicated desk, then scale to a private office as your business expands. 
                We accommodate freelancers to teams of 8+, so you never have to leave.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Location Context */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block bg-burnt-orange-100 text-burnt-orange-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                Location
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                In the Neighborhood,<br />Yet Minutes from Everything
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Nestled in a quiet residential area at 23rd and Irving, Merritt Workspace offers something rare: 
                  the peace of a neighborhood setting with exceptional convenience.
                </p>
                <div className="bg-burnt-orange-50 p-6 rounded-lg border border-burnt-orange-200">
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <MapPin className="w-5 h-5 text-burnt-orange-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span><strong>3 minutes to I-25</strong> for easy commuting anywhere in the metro</span>
                    </li>
                    <li className="flex items-start">
                      <MapPin className="w-5 h-5 text-burnt-orange-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span><strong>5 minutes to Mile High Stadium</strong> in the heart of Denver</span>
                    </li>
                    <li className="flex items-start">
                      <MapPin className="w-5 h-5 text-burnt-orange-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span><strong>Walking distance to Sloan's Lake Park</strong> for lunch breaks and fresh air</span>
                    </li>
                    <li className="flex items-start">
                      <Coffee className="w-5 h-5 text-burnt-orange-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span><strong>Surrounded by local cafes and restaurants</strong> in a thriving neighborhood</span>
                    </li>
                  </ul>
                </div>
                <p className="text-sm text-gray-600 italic">
                  Walk, bike, or drive—we're easy to reach and even easier to love.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-xl overflow-hidden shadow-lg h-96">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3067.4953180826856!2d-105.03225422342487!3d39.75098609588881!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x876c7932ec70db2b%3A0x8c38dd4cf4df270d!2sMerritt%20Workspace!5e0!3m2!1sen!2sus!4v1759948992207!5m2!1sen!2sus" 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Merritt Workspace Location"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Promise - Condensed Mission */}
      <section className="py-16 bg-burnt-orange-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Promise to You</h2>
          <p className="text-xl text-gray-700 mb-8 leading-relaxed">
            We're not here to be the biggest or flashiest workspace. We're here to honor the legacy of this 
            building by creating a place where real community happens—where your business can grow, where 
            meaningful connections are made, and where you feel like you belong.
          </p>
          <p className="text-lg text-gray-600 mb-8">
            From solo entrepreneurs to growing teams, we provide the flexibility, amenities, and support you 
            need—all wrapped in the character and warmth of a space that's been bringing people together 
            for 119 years.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/membership" className="bg-burnt-orange-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-burnt-orange-700 transition">
              Explore Membership Options
            </a>
            <a href="/contact" className="border-2 border-burnt-orange-600 text-burnt-orange-600 px-8 py-4 rounded-lg font-semibold hover:bg-burnt-orange-600 hover:text-white transition">
              Schedule Your Free Trial Day
            </a>
          </div>
        </div>
      </section>

      {/* Quick Stats - Visual Break */}
      <section className="py-12 bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-burnt-orange-600 mb-2">1905</div>
              <div className="text-sm text-gray-600">Building Established</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-burnt-orange-600 mb-2">14</div>
              <div className="text-sm text-gray-600">Private Offices</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-burnt-orange-600 mb-2">24/7</div>
              <div className="text-sm text-gray-600">Member Access</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-burnt-orange-600 mb-2">100%</div>
              <div className="text-sm text-gray-600">Community Focused</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}