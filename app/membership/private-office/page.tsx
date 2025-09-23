"use client";

import { useState } from 'react';
import { Check, Clock, Wifi, Shield, Coffee, Users, Calendar, MapPin, Star, ArrowRight, Phone, Mail, Lock, Building2, Heart, Briefcase, Eye, UserCheck, DollarSign } from 'lucide-react';
import Footer from "@/components/Footer";
import Link from 'next/link';

export default function PrivateOfficePage() {
  const [selectedPlan, setSelectedPlan] = useState('single');
  const [showComparison, setShowComparison] = useState(false);

  const privateOfficePlans = [
    {
      id: 'single',
      name: 'Single Desk Office',
      price: 500,
      capacity: '1 person',
      size: '120-150 sq ft',
      desks: 1,
      description: 'Perfect for solo professionals who need complete privacy',
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
      id: 'double',
      name: 'Double Desk Office',
      price: 700,
      capacity: '2 people',
      size: '180-220 sq ft',
      desks: 2,
      description: 'Ideal for partnerships and small collaborative teams',
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
      id: 'large',
      name: 'Large Team Office',
      price: 1200,
      capacity: '4-8 people',
      size: '300-500 sq ft',
      desks: '4-8',
      description: 'Spacious office for established teams and growing companies',
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
      description: 'Monthly meeting room hours included (varies by plan)',
      included: true
    },
    {
      icon: Phone,
      title: 'Phone Line Options',
      description: 'Dedicated business phone lines available for your office',
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
      plan: 'Double Desk Office',
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

  const membershipComparison = [
    {
      feature: 'Office Size',
      dedicated: 'Open desk space',
      single: '120-150 sq ft',
      double: '180-220 sq ft',
      large: '300-500 sq ft'
    },
    {
      feature: 'Team Capacity',
      dedicated: '1 person',
      single: '1 person',
      double: '2 people',
      large: '4-8 people'
    },
    {
      feature: 'Privacy Level',
      dedicated: 'Shared space',
      single: 'Complete privacy',
      double: 'Complete privacy',
      large: 'Team privacy'
    },
    {
      feature: 'Meeting Room Credits',
      dedicated: '2 hours/month',
      single: '4 hours/month',
      double: '6 hours/month',
      large: 'Unlimited'
    },
    {
      feature: 'Business Address',
      dedicated: false,
      single: true,
      double: true,
      large: true
    },
    {
      feature: 'Pet Policy',
      dedicated: 'Common areas only',
      single: 'Dogs welcome',
      double: 'Dogs welcome',
      large: 'Dogs welcome'
    },
    {
      feature: 'Monthly Price',
      dedicated: '$300',
      single: '$500',
      double: '$700',
      large: '$1,200'
    }
  ];

  const selectedPlanDetails = privateOfficePlans.find(plan => plan.id === selectedPlan);

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
              Private Office
              <span className="text-blue-600 block">Memberships</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Choose from three private office sizes to match your team's needs. All offices feature complete privacy, 
              professional amenities, and the flexibility to grow with your business.
            </p>
          </div>

          {/* Plan Selection Tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-lg p-2 shadow-lg">
              {privateOfficePlans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`px-6 py-3 rounded-lg font-semibold transition ${
                    selectedPlan === plan.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {plan.name}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Plan Details */}
          {selectedPlanDetails && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-blue-600 text-white p-8 text-center">
                  <h2 className="text-3xl font-bold mb-2">{selectedPlanDetails.name}</h2>
                  <div className="text-5xl font-bold mb-2">${selectedPlanDetails.price}<span className="text-xl">/month</span></div>
                  <p className="text-blue-100 mb-4">{selectedPlanDetails.description}</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="font-semibold">Capacity</div>
                      <div className="text-blue-100">{selectedPlanDetails.capacity}</div>
                    </div>
                    <div>
                      <div className="font-semibold">Size</div>
                      <div className="text-blue-100">{selectedPlanDetails.size}</div>
                    </div>
                    <div>
                      <div className="font-semibold">Desks</div>
                      <div className="text-blue-100">{selectedPlanDetails.desks}</div>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <h3 className="text-xl font-semibold mb-6">What's Included</h3>
                  <div className="grid md:grid-cols-2 gap-4 mb-8">
                    {selectedPlanDetails.features.map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link 
                      href="/membership/apply" 
                      className="flex-1 bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition text-center"
                    >
                      Apply for {selectedPlanDetails.name}
                    </Link>
                    <Link 
                      href="/contact" 
                      className="flex-1 border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-600 hover:text-white transition text-center"
                    >
                      Schedule Tour
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Value Proposition for Different Sizes */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Perfect for Every Business Stage</h2>
            <p className="text-xl text-gray-600">Choose the right size and scale as you grow</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {privateOfficePlans.map((plan, index) => (
              <div key={plan.id} className="bg-blue-50 p-6 rounded-xl">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold text-blue-600 mb-2">${plan.price}/mo</div>
                  <p className="text-gray-600 text-sm">{plan.capacity} • {plan.size}</p>
                </div>
                
                <ul className="space-y-2">
                  {plan.features.slice(0, 4).map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-sm text-gray-700">
                      <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                  {plan.features.length > 4 && (
                    <li className="text-sm text-gray-500 italic">
                      +{plan.features.length - 4} more features
                    </li>
                  )}
                </ul>

                <button
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full mt-6 px-4 py-3 rounded-lg font-semibold transition ${
                    selectedPlan === plan.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* All Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Premium Features Included</h2>
            <p className="text-xl text-gray-600">Everything you need to run a professional practice</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="bg-white p-6 rounded-xl hover:shadow-lg transition">
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
                  <p className="text-xs text-blue-600 mt-1">{testimonial.plan}</p>
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Compare All Membership Options</h2>
            <p className="text-xl text-gray-600">See how private offices compare to dedicated desk and each other</p>
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
                      <th className="text-center p-4 font-semibold text-gray-900">Dedicated<br/>Desk</th>
                      <th className="text-center p-4 font-semibold text-blue-600">Private<br/>Single</th>
                      <th className="text-center p-4 font-semibold text-blue-600">Private<br/>Double</th>
                      <th className="text-center p-4 font-semibold text-blue-600">Private<br/>Large</th>
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
                          {typeof row.single === 'boolean' ? (
                            row.single ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : '—'
                          ) : (
                            <span className="font-semibold text-blue-600">{row.single}</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {typeof row.double === 'boolean' ? (
                            row.double ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : '—'
                          ) : (
                            <span className="font-semibold text-blue-600">{row.double}</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {typeof row.large === 'boolean' ? (
                            row.large ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : '—'
                          ) : (
                            <span className="font-semibold text-blue-600">{row.large}</span>
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