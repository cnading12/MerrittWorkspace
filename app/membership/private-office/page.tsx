"use client";

import { useState } from 'react';
import { Check, Clock, Wifi, Shield, Coffee, Users, Calendar, MapPin, Star, ArrowRight, Phone, Mail, Lock, Building2, Heart, Briefcase, Eye, UserCheck } from 'lucide-react';
import Footer from "@/components/Footer";
import Link from 'next/link';
import Image from 'next/image';

export default function PrivateOfficePage() {
  const [showComparison, setShowComparison] = useState(false);

  const features = [
    {
      icon: Lock,
      title: 'Complete Privacy',
      description: 'Your own lockable office space with full privacy and security',
      included: true
    },
    {
      icon: Clock,
      title: '24/7 Access',
      description: 'Round-the-clock building and office access with your own key',
      included: true
    },
    {
      icon: Wifi,
      title: 'High-Speed WiFi',
      description: 'Enterprise-grade internet with dedicated connection options',
      included: true
    },
    {
      icon: Building2,
      title: 'Professional Address',
      description: 'Use our prestigious Sloan\'s Lake address for your business',
      included: true
    },
    {
      icon: Mail,
      title: 'Mail & Package Handling',
      description: 'Full mail receiving and package management services',
      included: true
    },
    {
      icon: Calendar,
      title: 'Meeting Room Credits',
      description: '4 free hours of conference room time per month',
      included: true
    },
    {
      icon: Phone,
      title: 'Phone Line Option',
      description: 'Dedicated business phone line available for your office',
      included: true
    },
    {
      icon: Coffee,
      title: 'Full Kitchen Access',
      description: 'Complete access to kitchen facilities and snackshop services',
      included: true
    },
    {
      icon: Heart,
      title: 'Pet-Friendly',
      description: 'Bring your dog to work - they can stay in your private office',
      included: true
    },
    {
      icon: Shield,
      title: 'Premium Storage',
      description: 'Multiple storage options including filing cabinets and shelving',
      included: true
    }
  ];

  const officeFeatures = [
    {
      icon: Lock,
      title: 'Secure & Private',
      description: 'Lockable door with your own key for complete privacy and security'
    },
    {
      icon: Building2,
      title: 'Professional Setup',
      description: 'Furnished office ready for client meetings and presentations'
    },
    {
      icon: Wifi,
      title: 'Dedicated Internet',
      description: 'Option for dedicated internet connection for enhanced performance'
    },
    {
      icon: UserCheck,
      title: 'Business Address',
      description: 'Professional mailing address at our prestigious location'
    }
  ];

  const testimonials = [
    {
      name: 'David Thompson',
      role: 'Financial Consultant',
      content: 'Having my own private office has been essential for client confidentiality. The professional atmosphere and ability to bring my dog to work is a huge bonus.',
      rating: 5
    },
    {
      name: 'Lisa Martinez',
      role: 'Legal Services',
      content: 'The privacy is exactly what I needed for sensitive client calls. Plus the business address gives my practice credibility in the Denver market.',
      rating: 5
    },
    {
      name: 'Robert Kim',
      role: 'Business Coach',
      content: 'Perfect setup for my coaching practice. I can customize the space however I need and the meeting room credits are perfect for group sessions.',
      rating: 5
    }
  ];

  const membershipComparison = [
    {
      feature: 'Workspace Type',
      dedicated: 'Open desk',
      private: 'Private lockable office',
      large: 'Large team office'
    },
    {
      feature: 'Privacy Level',
      dedicated: 'Shared space',
      private: 'Complete privacy',
      large: 'Team privacy'
    },
    {
      feature: 'Pet Policy',
      dedicated: 'Not allowed',
      private: 'Dogs welcome',
      large: 'Dogs welcome'
    },
    {
      feature: 'Business Address',
      dedicated: false,
      private: true,
      large: true
    },
    {
      feature: 'Meeting Room Credits',
      dedicated: '2 hours/month',
      private: '4 hours/month',
      large: 'Unlimited'
    },
    {
      feature: 'Monthly Price',
      dedicated: '$300',
      private: '$600',
      large: '$1,200'
    }
  ];

  return (
    <main className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-blue-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold inline-block mb-4">
                Professional Choice
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Private Office
                <span className="text-blue-600 block">Membership</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Your own lockable office space with complete privacy and professional amenities. 
                Perfect for established professionals, consultants, and small business owners who need confidentiality.
              </p>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-blue-600">$600</span>
                  <span className="text-xl text-gray-500">/month</span>
                </div>
                <p className="text-gray-600 text-sm">Includes professional business address</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/membership/apply" className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition text-center">
                  Apply for Private Office
                </Link>
                <Link href="/contact" className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-600 hover:text-white transition text-center">
                  Schedule Tour
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="relative h-96 lg:h-[500px] rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="/images/hero/conference-room.jpg"
                  alt="Private office with professional setup"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <div className="absolute bottom-6 left-6 text-white">
                  <h3 className="text-xl font-bold">Your Private Space</h3>
                  <p className="text-white/90">Complete privacy and professional setup</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Premium Features Included</h2>
            <p className="text-xl text-gray-600">Everything you need to run a professional practice</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="bg-gray-50 p-6 rounded-xl hover:shadow-lg transition">
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

      {/* Office Features Deep Dive */}
      <section className="py-16 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Your Professional Office</h2>
            <p className="text-xl text-gray-600">Designed for productivity, privacy, and client meetings</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="grid md:grid-cols-2 gap-6">
                {officeFeatures.map((feature, index) => {
                  const IconComponent = feature.icon;
                  return (
                    <div key={index} className="bg-white p-6 rounded-xl shadow-sm">
                      <IconComponent className="w-8 h-8 text-blue-600 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-600 text-sm">{feature.description}</p>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 bg-green-100 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">Pet-Friendly Office</span>
                </div>
                <p className="text-green-700 text-sm mt-1">Bring your dog to work! They can stay in your private office during the day.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Office Specifications</h3>
                <div className="space-y-3 text-gray-700">
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span className="font-semibold">120-180 sq ft</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Window:</span>
                    <span className="font-semibold">Natural light</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Furniture:</span>
                    <span className="font-semibold">Desk, chair, storage</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Capacity:</span>
                    <span className="font-semibold">1-3 people</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lock Type:</span>
                    <span className="font-semibold">Keyed entry</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-100 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Business Address Benefits</h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Professional mailing address</li>
                  <li>• Package receiving service</li>
                  <li>• Mail forwarding available</li>
                  <li>• Directory listing options</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Perfect For */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Perfect For</h2>
            <p className="text-xl text-gray-600">Private offices work best for these professionals</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-blue-50 rounded-xl">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Professional Services</h3>
              <p className="text-gray-600">Lawyers, accountants, consultants who need confidential client meetings</p>
            </div>

            <div className="text-center p-6 bg-blue-50 rounded-xl">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Small Business Owners</h3>
              <p className="text-gray-600">Established businesses needing professional address and private workspace</p>
            </div>

            <div className="text-center p-6 bg-blue-50 rounded-xl">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Privacy-Focused Workers</h3>
              <p className="text-gray-600">Anyone who needs guaranteed quiet space for focused work and sensitive conversations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Member Testimonials */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What Our Private Office Members Say</h2>
            <p className="text-xl text-gray-600">Real feedback from professionals who chose private offices</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.content}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Membership Comparison */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Compare Membership Options</h2>
            <p className="text-xl text-gray-600">See how private office compares to our other membership levels</p>
            <button 
              onClick={() => setShowComparison(!showComparison)}
              className="mt-4 text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2 mx-auto"
            >
              {showComparison ? 'Hide' : 'Show'} Comparison
              <ArrowRight className={`w-4 h-4 transition-transform ${showComparison ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {showComparison && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-4 font-semibold text-gray-900">Feature</th>
                      <th className="text-center p-4 font-semibold text-gray-900">Dedicated Desk</th>
                      <th className="text-center p-4 font-semibold text-blue-600">Private Office</th>
                      <th className="text-center p-4 font-semibold text-gray-900">Large Office</th>
                    </tr>
                  </thead>
                  <tbody>
                    {membershipComparison.map((row, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="p-4 font-medium text-gray-900">{row.feature}</td>
                        <td className="p-4 text-center text-gray-700">
                          {typeof row.dedicated === 'boolean' ? (
                            row.dedicated ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : '—'
                          ) : (
                            row.dedicated
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {typeof row.private === 'boolean' ? (
                            row.private ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : '—'
                          ) : (
                            <span className="font-semibold text-blue-600">{row.private}</span>
                          )}
                        </td>
                        <td className="p-4 text-center text-gray-700">
                          {typeof row.large === 'boolean' ? (
                            row.large ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : '—'
                          ) : (
                            row.large
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-gray-50 text-center">
                <Link href="/membership" className="text-blue-600 hover:text-blue-700 font-semibold">
                  View All Membership Options →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Location Benefits */}
      <section className="py-16 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Prestigious Business Address</h2>
              <p className="text-xl text-gray-600 mb-6">
                Establish your business presence in Denver's most desirable Sloan's Lake neighborhood.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-700">2246 Irving Street - Premium Sloan's Lake address</span>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-700">Historic landmark location adds credibility</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-700">Professional environment for client meetings</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-700">Secure mail and package handling</span>
                </div>
              </div>
            </div>

            <div className="relative h-64 lg:h-96 rounded-xl overflow-hidden shadow-lg">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3048.3751849999447!2d-105.02659242404156!3d39.75089969486985!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x876c79e0c86f6b7b%3A0x8c8b8b8b8b8b8b8b!2s2246%20Irving%20St%2C%20Denver%2C%20CO%2080211!5e0!3m2!1sen!2sus!4v1693846800000!5m2!1sen!2sus"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Merritt Workspace Location - 2246 Irving Street, Denver, CO"
                className="rounded-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Ready to Join */}
      <section className="py-16 bg-gradient-to-r from-blue-500 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready for Your Private Office?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join our community of professionals and establish your Denver business presence
          </p>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">What's Next?</h3>
            <div className="grid md:grid-cols-3 gap-4 text-blue-100">
              <div className="text-center">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold">1</span>
                </div>
                <p className="text-sm">Submit Application</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold">2</span>
                </div>
                <p className="text-sm">Tour Available Offices</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold">3</span>
                </div>
                <p className="text-sm">Move Into Your Office!</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/membership/apply" className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition">
              Apply for Private Office
            </Link>
            <Link href="/contact" className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition">
              Schedule a Tour
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}