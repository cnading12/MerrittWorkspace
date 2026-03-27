"use client";

import { useState } from 'react';
import { MapPin, Wifi, Shield, Phone, Coffee, Users, Calendar, CheckCircle, Building2, Clock, Mail, Heart, ArrowRight, Zap, TrendingUp } from 'lucide-react';
import Footer from '@/components/Footer';
import Link from 'next/link';
import Image from 'next/image';

const membershipPlans = [
  {
    id: 'dedicated_desk',
    name: 'Dedicated Desk',
    price: 300,
    description: 'Your own workspace in our vibrant coworking community',
    capacity: '1 person',
    privacy: 'Shared Space',
    image: '/images/hero/dedicated-desk.webp',
    blurDataURL: 'data:image/webp;base64,UklGRjYAAABXRUJQVlA4ICoAAACwAQCdASoKAA0ABUB8JZACdADYt8AAAOD9JmNTjrhhjajRJ8jDWLTrgAA=',
    color: 'burnt-orange',
    badge: 'Best Value',
    features: [
      '24/7 building access',
      'Your own dedicated desk with storage',
      'High-speed WiFi',
      'Access to 4 private phone booths',
      'Full kitchen with coffee',
      '2 hours meeting room credits/month',
      'Mail and package handling',
      'Event space access until 4:30 PM',
      'Pet-friendly workspace',
      'Community networking events'
    ],
    ideal_for: 'Freelancers, consultants, and remote workers',
    category: 'shared',
    link: '/membership/dedicated-desk'
  },
  {
    id: 'private_office_single',
    name: 'Single Desk Office',
    price: 500,
    description: 'Private lockable office for individual professionals',
    capacity: '1 person',
    privacy: 'Private Office',
    image: '/images/private-offices/single.webp',
    blurDataURL: 'data:image/webp;base64,UklGRi4AAABXRUJQVlA4ICIAAACQAQCdASoKAA0ABUB8JZQC7ABpDmAAj/vsp3SQ/qO4OdwA',
    color: 'blue',
    features: [
      'Private lockable office',
      'Professional business address',
      '24/7 building access',
      'High-speed WiFi',
      '4 hours meeting room credits/month',
      'Mail handling service',
      'Personal storage solutions',
      'Dedicated phone line option',
      'Priority phone booth access',
      'Pet-friendly (dogs welcome)',
      'Community events'
    ],
    ideal_for: 'Solo professionals needing complete privacy',
    category: 'private',
    link: '/membership/private-office'
  },
  {
    id: 'private_office_double',
    name: '2-Desk Office',
    price: 700,
    description: 'Ideal for partnerships and small collaborative teams',
    capacity: '2 people',
    privacy: 'Private Office',
    image: '/images/private-offices/2-desk.webp',
    blurDataURL: 'data:image/webp;base64,UklGRiwAAABXRUJQVlA4ICAAAABQAQCdASoKAA0AD8B8JQBdgCgAAP6/F7byZ3GAPAgAAA==',
    color: 'green',
    features: [
      'Private lockable office with 2 desks',
      'Professional business address',
      '24/7 building access',
      'High-speed WiFi',
      '6 hours meeting room credits/month',
      'Mail and package handling',
      'Team collaboration area',
      'Multiple storage solutions',
      'Dedicated phone line option',
      'Priority event space access',
      'Pet-friendly team space',
      'Community events'
    ],
    ideal_for: 'Small teams and business partnerships',
    category: 'private',
    link: '/membership/private-office'
  },
  {
    id: 'private_office_large',
    name: 'Large Team Office',
    price: 1200,
    description: 'Spacious office for established teams and growing companies',
    capacity: '4-8 people',
    privacy: 'Private Office',
    image: '/images/private-offices/4-desk.webp',
    blurDataURL: 'data:image/webp;base64,UklGRjAAAABXRUJQVlA4ICQAAABQAQCdASoKAA0ABUB8JQBOgAAAAOc8gv7uy41SNTE8bIfgAAA=',
    color: 'purple',
    features: [
      'Large private office (4-8 desks)',
      'Professional business address',
      '24/7 building access',
      'High-speed WiFi',
      'Unlimited meeting room access',
      'Mail and package handling',
      'Multiple dedicated phone lines',
      'Team collaboration areas',
      'Priority event space booking',
      'Monthly snackshop credits',
      'Extensive storage solutions',
      'Pet-friendly team space',
      'Dedicated team support'
    ],
    ideal_for: 'Growing teams and established companies',
    category: 'private',
    link: '/membership/private-office'
  }
];

const whyChooseFeatures = [
  {
    icon: MapPin,
    title: 'Prime Location',
    description: 'Heart of Sloan\'s Lake, 3 minutes to I-25. Walk, bike, or drive to work easily.'
  },
  {
    icon: Building2,
    title: 'Historic Character',
    description: 'Beautifully restored space with distinctive burnt orange floors and unique charm.'
  },
  {
    icon: Users,
    title: 'Vibrant Community',
    description: 'Network with entrepreneurs, freelancers, and small businesses in a supportive environment.'
  },
  {
    icon: Shield,
    title: 'Secure & Professional',
    description: '24/7 monitored building with professional atmosphere and business address services.'
  },
  {
    icon: Calendar,
    title: 'Flexible Terms',
    description: 'No long-term lease required. Month-to-month flexibility for your changing needs.'
  },
  {
    icon: Coffee,
    title: 'Full-Service Amenities',
    description: 'On-site snackshop, meeting rooms, high-speed WiFi, and everything you need to be productive.'
  }
];

const processSteps = [
  {
    number: 1,
    title: 'Apply Online',
    description: 'Complete our simple application form with your details and preferences'
  },
  {
    number: 2,
    title: 'Schedule Tour',
    description: 'We\'ll contact you within 1-2 days to schedule your complimentary tour'
  },
  {
    number: 3,
    title: 'Free Trial Day',
    description: 'Experience our workspace with a full complimentary trial day'
  },
  {
    number: 4,
    title: 'Move In!',
    description: 'Complete membership setup and start enjoying your new workspace'
  }
];

export default function MembershipPage() {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'shared' | 'private'>('all');

  const filteredPlans = selectedCategory === 'all' 
    ? membershipPlans 
    : membershipPlans.filter(plan => plan.category === selectedCategory);

  return (
    <main className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-burnt-orange-50 to-burnt-orange-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Find Your Perfect
              <span className="text-burnt-orange-600 block">Workspace</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Experience premium coworking in the heart of Sloan's Lake. Choose from dedicated desks to private offices,
              all with our distinctive character and collaborative atmosphere.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/membership/apply" 
                className="bg-burnt-orange-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-burnt-orange-700 transition inline-flex items-center justify-center gap-2"
              >
                Apply for Membership
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                href="/contact" 
                className="border-2 border-burnt-orange-600 text-burnt-orange-600 px-8 py-4 rounded-lg font-semibold hover:bg-burnt-orange-600 hover:text-white transition"
              >
                Schedule a Tour
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Membership Plans */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Membership</h2>
            <p className="text-xl text-gray-600">Find the perfect workspace solution for your needs</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredPlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden hover:shadow-2xl transition group flex flex-col"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={plan.image}
                    alt={plan.name}
                    fill
                    placeholder="blur"
                    blurDataURL={plan.blurDataURL}
                    className="object-cover group-hover:scale-105 transition duration-300"
                  />
                  {plan.badge && (
                    <div className="absolute top-4 right-4 bg-burnt-orange-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      {plan.badge}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-bold text-burnt-orange-600">${plan.price}</span>
                    <span className="text-lg text-gray-500">/month</span>
                  </div>

                  <p className="text-gray-600 mb-4">{plan.description}</p>

                  <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-burnt-orange-600" />
                      <span>{plan.capacity}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-burnt-orange-600" />
                      <span>{plan.privacy}</span>
                    </div>
                  </div>

                  <div className="mb-6 flex-grow">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Key Features:</p>
                    <ul className="space-y-2">
                      {plan.features.slice(0, 5).map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {plan.features.length > 5 && (
                      <p className="text-xs text-gray-500 mt-2">+ {plan.features.length - 5} more features</p>
                    )}
                  </div>

                  <div className="space-y-3 mt-auto">
                    <Link
                      href={plan.link}
                      className="w-full bg-burnt-orange-600 hover:bg-burnt-orange-700 text-white py-3 px-4 rounded-lg font-semibold transition text-center block"
                    >
                      Learn More
                    </Link>
                    <Link
                      href="/membership/apply"
                      className="w-full border-2 border-burnt-orange-600 text-burnt-orange-600 hover:bg-burnt-orange-600 hover:text-white py-3 px-4 rounded-lg font-semibold transition text-center block"
                    >
                      Apply Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-2">All memberships include a <strong>free trial day</strong> to experience the space.</p>
            <p className="text-sm text-gray-500">No long-term contracts • Month-to-month flexibility</p>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Compare All Options</h2>
            <p className="text-xl text-gray-600">Find the perfect fit for your needs</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-burnt-orange-50 border-b border-gray-200">
                    <th className="text-left p-4 font-semibold text-gray-900 min-w-[200px]">Feature</th>
                    <th className="text-center p-4 font-semibold text-gray-900 min-w-[150px]">
                      Dedicated<br />Desk
                    </th>
                    <th className="text-center p-4 font-semibold text-gray-900 min-w-[150px]">
                      Single<br />Office
                    </th>
                    <th className="text-center p-4 font-semibold text-gray-900 min-w-[150px]">
                      2-Desk<br />Office
                    </th>
                    <th className="text-center p-4 font-semibold text-gray-900 min-w-[150px]">
                      Large<br />Office
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="p-4 font-medium text-gray-900">Monthly Price</td>
                    <td className="p-4 text-center text-burnt-orange-600 font-bold">$300</td>
                    <td className="p-4 text-center text-burnt-orange-600 font-bold">$500</td>
                    <td className="p-4 text-center text-burnt-orange-600 font-bold">$700</td>
                    <td className="p-4 text-center text-burnt-orange-600 font-bold">$1,200</td>
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">Capacity</td>
                    <td className="p-4 text-center text-gray-600">1 person</td>
                    <td className="p-4 text-center text-gray-600">1 person</td>
                    <td className="p-4 text-center text-gray-600">2 people</td>
                    <td className="p-4 text-center text-gray-600">4-8 people</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-4 font-medium text-gray-900">Privacy</td>
                    <td className="p-4 text-center text-gray-600">Shared space</td>
                    <td className="p-4 text-center text-gray-600">Private office</td>
                    <td className="p-4 text-center text-gray-600">Private office</td>
                    <td className="p-4 text-center text-gray-600">Private office</td>
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">24/7 Access</td>
                    <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-4 font-medium text-gray-900">Meeting Room Credits</td>
                    <td className="p-4 text-center text-gray-600">2 hrs/mo</td>
                    <td className="p-4 text-center text-gray-600">4 hrs/mo</td>
                    <td className="p-4 text-center text-gray-600">6 hrs/mo</td>
                    <td className="p-4 text-center text-gray-600">Unlimited</td>
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">Business Address</td>
                    <td className="p-4 text-center text-gray-400">—</td>
                    <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-4 font-medium text-gray-900">Phone Booths</td>
                    <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">Pet-Friendly</td>
                    <td className="p-4 text-center text-gray-600 text-sm">Common areas</td>
                    <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-4 font-medium text-gray-900">Lockable Storage</td>
                    <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Merritt */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Merritt Workspace?</h2>
            <p className="text-xl text-gray-600">More than just a workspace - it's a community</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {whyChooseFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition">
                  <div className="w-12 h-12 bg-burnt-orange-100 rounded-lg flex items-center justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-burnt-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials removed — to be added when real member quotes are collected */}

      {/* Application Process */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple Application Process</h2>
            <p className="text-xl text-gray-600">Get started in four easy steps</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {processSteps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="w-16 h-16 bg-burnt-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-burnt-orange-600">{step.number}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/membership/apply"
              className="bg-burnt-orange-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-burnt-orange-700 transition inline-flex items-center gap-2"
            >
              Start Your Application
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-r from-burnt-orange-500 to-burnt-orange-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Join Our Community?
          </h2>
          <p className="text-xl text-burnt-orange-100 mb-8">
            Experience the difference of a truly collaborative workspace at Sloan's Lake
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/membership/apply"
              className="bg-white text-burnt-orange-600 py-4 px-8 rounded-lg font-semibold hover:bg-gray-100 transition inline-flex items-center justify-center gap-2"
            >
              Apply for Membership
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="bg-burnt-orange-700 text-white py-4 px-8 rounded-lg font-semibold hover:bg-burnt-orange-800 transition inline-flex items-center justify-center border-2 border-white"
            >
              Schedule a Tour
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}