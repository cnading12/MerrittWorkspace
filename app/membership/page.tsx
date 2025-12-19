"use client";

import { MapPin, Wifi, Shield, Phone, Coffee, Users, Calendar, CheckCircle, Building2, Clock, ArrowRight, Star, Zap, Sparkles, Quote } from 'lucide-react';
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
    badge: 'Best Value',
    featured: true,
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
    featured: false,
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
    badge: 'Popular',
    featured: false,
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
    featured: false,
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

const testimonials = [
  {
    name: 'Jessica Martinez',
    role: 'Marketing Consultant',
    plan: 'Dedicated Desk Member',
    content: 'The community at Merritt House is incredible. I\'ve made genuine connections and even found new clients through networking here.',
    initial: 'J'
  },
  {
    name: 'Ryan Thompson',
    role: 'Tech Startup Founder',
    plan: '2-Desk Office Member',
    content: 'Having a private office for our small team has been perfect. The flexibility and amenities are exactly what we needed as we grow.',
    initial: 'R'
  },
  {
    name: 'Amanda Chen',
    role: 'Financial Advisor',
    plan: 'Single Office Member',
    content: 'The professional environment and privacy for client meetings is outstanding. Best decision I made for my business.',
    initial: 'A'
  }
];

export default function MembershipPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section - Enhanced */}
      <section className="relative bg-gradient-to-br from-burnt-orange-50 via-white to-orange-50 pt-32 pb-20 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 bg-hero-pattern opacity-30" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-burnt-orange-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-100/30 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="badge badge-orange mb-6">
              <Sparkles className="w-4 h-4" />
              Flexible Membership Options
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
              Find Your Perfect
              <span className="block text-gradient">Workspace</span>
            </h1>

            <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
              Experience premium coworking in the heart of Sloan&apos;s Lake. Choose from dedicated desks to private offices,
              all with our distinctive character and collaborative atmosphere.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/membership/apply"
                className="btn-primary"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Apply for Membership
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                href="/contact"
                className="btn-secondary"
              >
                Schedule a Tour
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Free trial day included</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>No long-term contracts</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Month-to-month flexibility</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Membership Plans - Enhanced */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-burnt-orange-200 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="badge badge-orange mb-4">
              <Star className="w-4 h-4" />
              Membership Options
            </div>
            <h2 className="section-heading mb-4">Choose Your Membership</h2>
            <p className="section-subheading">Find the perfect workspace solution for your needs</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {membershipPlans.map((plan) => (
              <div
                key={plan.id}
                className={`group relative bg-white rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 flex flex-col ${
                  plan.featured
                    ? 'shadow-soft-xl border-2 border-burnt-orange-400 ring-4 ring-burnt-orange-100'
                    : 'shadow-soft-lg border border-gray-100 hover:border-burnt-orange-200 hover:shadow-soft-xl'
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg ${
                      plan.badge === 'Best Value'
                        ? 'bg-burnt-orange-500 text-white'
                        : 'bg-blue-500 text-white'
                    }`}>
                      {plan.badge === 'Best Value' ? <Star className="w-3 h-3 fill-current" /> : <Zap className="w-3 h-3" />}
                      {plan.badge}
                    </div>
                  </div>
                )}

                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={plan.image}
                    alt={plan.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>

                  <div className="flex items-baseline gap-2 mb-4">
                    <span className={`text-4xl font-bold ${plan.featured ? 'text-gradient' : 'text-gray-900'}`}>
                      ${plan.price}
                    </span>
                    <span className="text-gray-500">/month</span>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 leading-relaxed">{plan.description}</p>

                  <div className="flex gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Users className="w-4 h-4 text-burnt-orange-500" />
                      <span>{plan.capacity}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Shield className="w-4 h-4 text-burnt-orange-500" />
                      <span>{plan.privacy}</span>
                    </div>
                  </div>

                  <div className="mb-6 flex-grow">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Key Features</p>
                    <ul className="space-y-2">
                      {plan.features.slice(0, 5).map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                          <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {plan.features.length > 5 && (
                      <p className="text-xs text-burnt-orange-600 font-medium mt-3">+ {plan.features.length - 5} more features</p>
                    )}
                  </div>

                  <div className="space-y-3 mt-auto">
                    <Link
                      href={plan.link}
                      className={`w-full py-3.5 px-4 rounded-xl font-semibold transition-all duration-300 text-center block ${
                        plan.featured
                          ? 'bg-gradient-to-r from-burnt-orange-500 to-burnt-orange-600 text-white hover:from-burnt-orange-600 hover:to-burnt-orange-700 shadow-lg shadow-burnt-orange-500/25'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      Learn More
                    </Link>
                    <Link
                      href="/membership/apply"
                      className="w-full border-2 border-burnt-orange-500 text-burnt-orange-600 hover:bg-burnt-orange-500 hover:text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 text-center block"
                    >
                      Apply Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table - Enhanced */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-burnt-orange-50 rounded-full blur-3xl opacity-50" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="badge badge-orange mb-4">
              <Zap className="w-4 h-4" />
              Quick Comparison
            </div>
            <h2 className="section-heading mb-4">Compare All Options</h2>
            <p className="section-subheading">Find the perfect fit for your needs</p>
          </div>

          <div className="bg-white rounded-3xl shadow-soft-xl overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-burnt-orange-50 to-orange-50 border-b border-gray-100">
                    <th className="text-left p-5 font-bold text-gray-900 min-w-[200px]">Feature</th>
                    <th className="text-center p-5 min-w-[140px]">
                      <div className="font-bold text-gray-900">Dedicated</div>
                      <div className="text-sm text-gray-500">Desk</div>
                    </th>
                    <th className="text-center p-5 min-w-[140px]">
                      <div className="font-bold text-gray-900">Single</div>
                      <div className="text-sm text-gray-500">Office</div>
                    </th>
                    <th className="text-center p-5 min-w-[140px]">
                      <div className="font-bold text-gray-900">2-Desk</div>
                      <div className="text-sm text-gray-500">Office</div>
                    </th>
                    <th className="text-center p-5 min-w-[140px]">
                      <div className="font-bold text-gray-900">Large</div>
                      <div className="text-sm text-gray-500">Office</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="p-5 font-medium text-gray-900">Monthly Price</td>
                    <td className="p-5 text-center">
                      <span className="text-xl font-bold text-gradient">$300</span>
                    </td>
                    <td className="p-5 text-center">
                      <span className="text-xl font-bold text-gray-900">$500</span>
                    </td>
                    <td className="p-5 text-center">
                      <span className="text-xl font-bold text-gray-900">$700</span>
                    </td>
                    <td className="p-5 text-center">
                      <span className="text-xl font-bold text-gray-900">$1,200</span>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-gray-50/30 hover:bg-gray-50/50 transition-colors">
                    <td className="p-5 font-medium text-gray-900">Capacity</td>
                    <td className="p-5 text-center text-gray-600">1 person</td>
                    <td className="p-5 text-center text-gray-600">1 person</td>
                    <td className="p-5 text-center text-gray-600">2 people</td>
                    <td className="p-5 text-center text-gray-600">4-8 people</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="p-5 font-medium text-gray-900">Privacy</td>
                    <td className="p-5 text-center text-gray-600">Shared space</td>
                    <td className="p-5 text-center text-gray-600">Private office</td>
                    <td className="p-5 text-center text-gray-600">Private office</td>
                    <td className="p-5 text-center text-gray-600">Private office</td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-gray-50/30 hover:bg-gray-50/50 transition-colors">
                    <td className="p-5 font-medium text-gray-900">24/7 Access</td>
                    <td className="p-5 text-center"><div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-4 h-4 text-green-600" /></div></td>
                    <td className="p-5 text-center"><div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-4 h-4 text-green-600" /></div></td>
                    <td className="p-5 text-center"><div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-4 h-4 text-green-600" /></div></td>
                    <td className="p-5 text-center"><div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-4 h-4 text-green-600" /></div></td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="p-5 font-medium text-gray-900">Meeting Room Credits</td>
                    <td className="p-5 text-center text-gray-600">2 hrs/mo</td>
                    <td className="p-5 text-center text-gray-600">4 hrs/mo</td>
                    <td className="p-5 text-center text-gray-600">6 hrs/mo</td>
                    <td className="p-5 text-center font-semibold text-burnt-orange-600">Unlimited</td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-gray-50/30 hover:bg-gray-50/50 transition-colors">
                    <td className="p-5 font-medium text-gray-900">Business Address</td>
                    <td className="p-5 text-center text-gray-300">—</td>
                    <td className="p-5 text-center"><div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-4 h-4 text-green-600" /></div></td>
                    <td className="p-5 text-center"><div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-4 h-4 text-green-600" /></div></td>
                    <td className="p-5 text-center"><div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-4 h-4 text-green-600" /></div></td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="p-5 font-medium text-gray-900">Phone Booths</td>
                    <td className="p-5 text-center"><div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-4 h-4 text-green-600" /></div></td>
                    <td className="p-5 text-center"><div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-4 h-4 text-green-600" /></div></td>
                    <td className="p-5 text-center"><div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-4 h-4 text-green-600" /></div></td>
                    <td className="p-5 text-center"><div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-4 h-4 text-green-600" /></div></td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-gray-50/30 hover:bg-gray-50/50 transition-colors">
                    <td className="p-5 font-medium text-gray-900">Pet-Friendly</td>
                    <td className="p-5 text-center text-gray-600 text-sm">Common areas</td>
                    <td className="p-5 text-center"><div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-4 h-4 text-green-600" /></div></td>
                    <td className="p-5 text-center"><div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-4 h-4 text-green-600" /></div></td>
                    <td className="p-5 text-center"><div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-4 h-4 text-green-600" /></div></td>
                  </tr>
                  <tr className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-5 font-medium text-gray-900">Lockable Storage</td>
                    <td className="p-5 text-center"><div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-4 h-4 text-green-600" /></div></td>
                    <td className="p-5 text-center"><div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-4 h-4 text-green-600" /></div></td>
                    <td className="p-5 text-center"><div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-4 h-4 text-green-600" /></div></td>
                    <td className="p-5 text-center"><div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-4 h-4 text-green-600" /></div></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Merritt - Enhanced */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-burnt-orange-50 rounded-full blur-3xl opacity-50" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="badge badge-orange mb-4">
              <Building2 className="w-4 h-4" />
              Why Choose Us
            </div>
            <h2 className="section-heading mb-4">Why Choose Merritt Workspace?</h2>
            <p className="section-subheading">More than just a workspace - it&apos;s a community</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {whyChooseFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={index}
                  className="group card-premium p-8 hover:border-burnt-orange-200"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-burnt-orange-100 to-burnt-orange-50 rounded-2xl flex items-center justify-center mb-6 group-hover:from-burnt-orange-500 group-hover:to-burnt-orange-600 transition-all duration-300">
                    <IconComponent className="w-7 h-7 text-burnt-orange-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials - Enhanced */}
      <section className="py-24 bg-gradient-to-br from-gray-50 via-white to-gray-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-burnt-orange-100/30 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="badge badge-orange mb-4">
              <Star className="w-4 h-4" />
              Testimonials
            </div>
            <h2 className="section-heading mb-4">What Our Members Say</h2>
            <p className="section-subheading">Join a community of successful professionals</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card-premium p-8 relative">
                {/* Quote icon */}
                <Quote className="absolute top-6 right-6 w-10 h-10 text-burnt-orange-100" />

                {/* Stars */}
                <div className="flex gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-5 h-5 text-amber-400 fill-current" />
                  ))}
                </div>

                <p className="text-gray-700 mb-6 leading-relaxed relative z-10">
                  &ldquo;{testimonial.content}&rdquo;
                </p>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-burnt-orange-400 to-burnt-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {testimonial.initial}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                    <div className="text-xs text-burnt-orange-600 font-medium mt-0.5">{testimonial.plan}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Process - Enhanced */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-burnt-orange-50 rounded-full blur-3xl opacity-50" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="badge badge-green mb-4">
              <CheckCircle className="w-4 h-4" />
              Easy Process
            </div>
            <h2 className="section-heading mb-4">Simple Application Process</h2>
            <p className="section-subheading">Get started in four easy steps</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 mb-16">
            {processSteps.map((step, index) => (
              <div key={step.number} className="relative text-center group">
                {/* Connecting line */}
                {index < processSteps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-burnt-orange-200 to-burnt-orange-100" />
                )}

                <div className="relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-burnt-orange-500 to-burnt-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-burnt-orange-500/25 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl font-bold text-white">{step.number}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/membership/apply"
              className="btn-primary"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Start Your Application
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
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
            Join Our Community
          </div>

          <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Ready to Join Our<br />
            <span className="text-gradient-dark">Community?</span>
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Experience the difference of a truly collaborative workspace at Sloan&apos;s Lake
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/membership/apply"
              className="group inline-flex items-center justify-center bg-gradient-to-r from-burnt-orange-500 to-burnt-orange-600 text-white px-10 py-5 rounded-xl font-bold hover:from-burnt-orange-600 hover:to-burnt-orange-700 transition-all duration-300 shadow-xl shadow-burnt-orange-500/30 hover:shadow-2xl hover:shadow-burnt-orange-500/40"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Apply for Membership
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center bg-white/10 backdrop-blur-sm text-white border border-white/20 px-10 py-5 rounded-xl font-semibold hover:bg-white hover:text-gray-900 transition-all duration-300"
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
