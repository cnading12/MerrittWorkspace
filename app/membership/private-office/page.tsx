"use client";

import { useState } from 'react';
import { Check, Clock, Wifi, Shield, Coffee, Users, Calendar, Phone, Mail, Lock, Building2, Heart, Star, ArrowRight, Briefcase, Eye, UserCheck } from 'lucide-react';
import Footer from "@/components/Footer";
import Link from 'next/link';
import Image from 'next/image';

export default function PrivateOfficePage() {
  const [selectedPlan, setSelectedPlan] = useState<'single' | 'double' | 'large'>('single');

  const privateOfficePlans = [
    {
      id: 'single' as const,
      name: 'Single Desk Office',
      price: 500,
      capacity: '1 person',
      size: '120-150 sq ft',
      desks: 1,
      color: 'blue',
      description: 'Perfect for solo professionals who need complete privacy',
      image1: '/images/private-offices/single.png',
      image2: '/images/private-offices/single2.png',
      features: [
        'Private lockable office',
        'Professional business address',
        '4 hours meeting room credits/month',
        'Mail handling service',
        'Pet-friendly (dogs welcome)',
        'Personal storage solutions',
        'Dedicated phone line option'
      ]
    },
    {
      id: 'double' as const,
      name: '2-Desk Office',
      price: 700,
      capacity: '2 people',
      size: '180-220 sq ft',
      desks: 2,
      color: 'green',
      description: 'Ideal for partnerships and small collaborative teams',
      image1: '/images/private-offices/2-desk.png',
      image2: '/images/private-offices/2-desk2.png',
      features: [
        'Private lockable office with 2 desks',
        'Professional business address',
        '6 hours meeting room credits/month',
        'Mail and package handling',
        'Pet-friendly team space',
        'Multiple storage solutions',
        'Team collaboration area',
        'Priority event space access'
      ]
    },
    {
      id: 'large' as const,
      name: 'Large Team Office (4-8 Desks)',
      price: 1200,
      capacity: '4-8 people',
      size: '300-500 sq ft',
      desks: '4-8',
      color: 'purple',
      description: 'Spacious office for established teams and growing companies',
      image1: '/images/private-offices/4-desk.png',
      image2: '/images/private-offices/4-desk2.png',
      features: [
        'Large private office (4-8 desks)',
        'Professional business address',
        'Unlimited meeting room access',
        'Mail and package handling',
        'Multiple dedicated phone lines',
        'Team collaboration areas',
        'Priority event space booking',
        'Monthly snackshop credits',
        'Extensive storage solutions'
      ]
    }
  ];

  const allFeatures = [
    {
      icon: Lock,
      title: 'Complete Privacy',
      description: 'Your own lockable office space with full privacy and security'
    },
    {
      icon: Clock,
      title: '24/7 Access',
      description: 'Round-the-clock building and office access with your own key'
    },
    {
      icon: Wifi,
      title: 'High-Speed WiFi',
      description: 'Enterprise-grade internet with dedicated connection options'
    },
    {
      icon: Building2,
      title: 'Professional Address',
      description: 'Use our prestigious Sloan\'s Lake address for your business'
    },
    {
      icon: Mail,
      title: 'Mail & Package Handling',
      description: 'Full mail receiving and package management services'
    },
    {
      icon: Calendar,
      title: 'Meeting Room Credits',
      description: 'Monthly meeting room hours included (varies by plan)'
    },
    {
      icon: Phone,
      title: 'Phone Line Options',
      description: 'Dedicated business phone lines available for your office'
    },
    {
      icon: Coffee,
      title: 'Full Kitchen Access',
      description: 'Complete access to kitchen facilities and snackshop services'
    },
    {
      icon: Heart,
      title: 'Pet-Friendly',
      description: 'Bring your dog to work - they can stay in your private office'
    },
    {
      icon: Shield,
      title: 'Premium Storage',
      description: 'Multiple storage options including filing cabinets and shelving'
    }
  ];

  const testimonials = [
    {
      name: 'David Thompson',
      role: 'Financial Consultant',
      plan: 'Single Desk Office',
      content: 'Having my own private office has been essential for client confidentiality. The professional atmosphere and ability to bring my dog to work is a huge bonus.',
      rating: 5
    },
    {
      name: 'Lisa Martinez & Associates',
      role: 'Legal Partnership',
      plan: '2-Desk Office',
      content: 'The double desk setup is perfect for our partnership. We can work together when needed but also have space for private client calls.',
      rating: 5
    },
    {
      name: 'TechStart Denver Team',
      role: 'Growing Startup',
      plan: 'Large Team Office',
      content: 'We went from 3 to 7 people and the large office adapted with us. The unlimited meeting rooms are essential for our client work and team collaboration.',
      rating: 5
    }
  ];

  const idealFor = [
    {
      icon: Briefcase,
      title: 'Professional Services',
      description: 'Lawyers, accountants, consultants who need confidential client meetings'
    },
    {
      icon: UserCheck,
      title: 'Small Business Owners',
      description: 'Established businesses needing professional address and private workspace'
    },
    {
      icon: Eye,
      title: 'Privacy-Focused Workers',
      description: 'Anyone who needs guaranteed quiet space for focused work and sensitive conversations'
    }
  ];

  const selectedPlanDetails = privateOfficePlans.find(plan => plan.id === selectedPlan)!;
  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700 text-blue-600 bg-blue-50 border-blue-600',
    green: 'bg-green-600 hover:bg-green-700 text-green-600 bg-green-50 border-green-600',
    purple: 'bg-purple-600 hover:bg-purple-700 text-purple-600 bg-purple-50 border-purple-600'
  };

  return (
    <main className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-blue-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold inline-block mb-4">
              Professional Choice
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Private Office Rental
              <span className="text-blue-600 block">in Sloan's Lake, Denver</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Lockable private offices in Denver's Sloan's Lake neighborhood, just 3 minutes from I-25. Choose from single ($500/mo), double ($700/mo), or team offices ($1,200/mo). All include 24/7 access, professional business address, and meeting room credits.
            </p>
          </div>

          {/* Plan Selector */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {privateOfficePlans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`px-6 py-3 rounded-lg font-semibold transition ${
                  selectedPlan === plan.id
                    ? `bg-${plan.color}-600 text-white`
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                style={{
                  backgroundColor: selectedPlan === plan.id 
                    ? plan.color === 'blue' ? '#2563eb' 
                    : plan.color === 'green' ? '#16a34a' 
                    : '#9333ea'
                    : undefined
                }}
              >
                {plan.name}
              </button>
            ))}
          </div>

          {/* Selected Plan Display */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-8 p-8 md:p-12">
              {/* Left Column - Details */}
              <div>
                <div className="mb-6">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    {selectedPlanDetails.name}
                  </h2>
                  <p className="text-xl text-gray-600 mb-6">
                    {selectedPlanDetails.description}
                  </p>
                  
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-5xl font-bold" style={{
                      color: selectedPlanDetails.color === 'blue' ? '#2563eb' 
                        : selectedPlanDetails.color === 'green' ? '#16a34a' 
                        : '#9333ea'
                    }}>
                      ${selectedPlanDetails.price}
                    </span>
                    <span className="text-2xl text-gray-500">/month</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Office Size</div>
                      <div className="font-semibold text-gray-900">{selectedPlanDetails.size}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Capacity</div>
                      <div className="font-semibold text-gray-900">{selectedPlanDetails.capacity}</div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">What's Included</h3>
                  <ul className="space-y-3">
                    {selectedPlanDetails.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link 
                  href="/membership/apply"
                  className="w-full py-4 px-6 rounded-lg font-semibold transition text-center block text-white"
                  style={{
                    backgroundColor: selectedPlanDetails.color === 'blue' ? '#2563eb' 
                      : selectedPlanDetails.color === 'green' ? '#16a34a' 
                      : '#9333ea'
                  }}
                >
                  Apply for This Office
                </Link>
              </div>

              {/* Right Column - Images */}
              <div className="space-y-4">
                <div className="relative h-64 md:h-80 rounded-xl overflow-hidden shadow-lg">
                  <Image
                    src={selectedPlanDetails.image1}
                    alt={`${selectedPlanDetails.name} private office rental at Merritt Workspace in Sloan's Lake, Denver`}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
                <div className="relative h-64 md:h-80 rounded-xl overflow-hidden shadow-lg">
                  <Image
                    src={selectedPlanDetails.image2}
                    alt={`${selectedPlanDetails.name} interior view - private office near I-25 Denver`}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">All Private Offices Include</h2>
            <p className="text-xl text-gray-600">Premium amenities and services for every office</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-600 text-sm">{feature.description}</p>
                    </div>
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Perfect For Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Perfect For</h2>
            <p className="text-xl text-gray-600">Private offices work best for these professionals</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {idealFor.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div key={index} className="bg-white p-8 rounded-xl text-center hover:shadow-lg transition">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What Our Members Say</h2>
            <p className="text-xl text-gray-600">Real feedback from private office members</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6">
                <div className="flex mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4">"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.role}</div>
                  <div className="text-xs text-blue-600 mt-1">{testimonial.plan}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Internal Links Section */}
      <section className="py-12 bg-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Explore Other Options</h3>
          <p className="text-gray-600 mb-6">
            Looking for a more affordable option? Our <Link href="/membership/dedicated-desk" className="text-blue-600 hover:underline font-semibold">dedicated desks start at just $300/month</Link>.
            Or <Link href="/membership" className="text-blue-600 hover:underline font-semibold">compare all membership options</Link> to find your perfect Sloan's Lake office space.
          </p>
          <p className="text-sm text-gray-500">
            Questions? <Link href="/contact" className="text-blue-600 hover:underline">Contact us</Link> or visit our <Link href="/member-resources/faqs" className="text-blue-600 hover:underline">FAQ page</Link>
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Claim Your Private Office in Sloan's Lake?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join Denver's premier coworking community—just 3 minutes from I-25
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/membership/apply"
              className="bg-white text-blue-600 py-4 px-8 rounded-lg font-semibold hover:bg-gray-100 transition inline-flex items-center justify-center gap-2"
            >
              Apply for Membership
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="bg-blue-700 text-white py-4 px-8 rounded-lg font-semibold hover:bg-blue-800 transition inline-flex items-center justify-center border-2 border-white"
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