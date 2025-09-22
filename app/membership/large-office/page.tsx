"use client";

import { useState } from 'react';
import { Check, Clock, Wifi, Shield, Coffee, Users, Calendar, MapPin, Star, ArrowRight, Phone, Mail, Lock, Building2, Heart, Briefcase, Crown, TrendingUp, Zap, Target } from 'lucide-react';
import Footer from "@/components/Footer";
import Link from 'next/link';
import Image from 'next/image';

export default function LargeOfficePage() {
  const [showComparison, setShowComparison] = useState(false);

  const features = [
    {
      icon: Building2,
      title: 'Spacious Team Office',
      description: 'Large private office accommodating 4-8 team members comfortably',
      included: true
    },
    {
      icon: Crown,
      title: 'Premium Location',
      description: 'Best office locations with optimal natural light and views',
      included: true
    },
    {
      icon: Calendar,
      title: 'Unlimited Meeting Rooms',
      description: 'Unlimited access to all conference rooms and booking priority',
      included: true
    },
    {
      icon: Clock,
      title: '24/7 Premium Access',
      description: 'Round-the-clock access with dedicated entrance options',
      included: true
    },
    {
      icon: Phone,
      title: 'Dedicated Phone System',
      description: 'Multiple phone lines and advanced telecommunication setup',
      included: true
    },
    {
      icon: Mail,
      title: 'Full Business Services',
      description: 'Complete mail handling, package management, and reception services',
      included: true
    },
    {
      icon: Heart,
      title: 'Pet-Friendly Team Space',
      description: 'Bring your team\'s dogs - plenty of space for furry colleagues',
      included: true
    },
    {
      icon: Shield,
      title: 'Enhanced Security',
      description: 'Private keycard access and optional security camera integration',
      included: true
    },
    {
      icon: Zap,
      title: 'Priority Event Space',
      description: 'Reserved booking privileges for event space and priority scheduling',
      included: true
    },
    {
      icon: Coffee,
      title: 'Snackshop Credits',
      description: 'Monthly credit allowance for team snacks, meals, and beverages',
      included: true
    }
  ];

  const officeFeatures = [
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Open layout designed for team productivity and collaboration'
    },
    {
      icon: TrendingUp,
      title: 'Scalable Space',
      description: 'Flexible furniture and layout that grows with your team'
    },
    {
      icon: Target,
      title: 'Multiple Workstations',
      description: 'Individual workstations plus shared collaboration areas'
    },
    {
      icon: Crown,
      title: 'Premium Amenities',
      description: 'Top-tier office furniture, equipment, and technology setup'
    }
  ];

  const testimonials = [
    {
      name: 'Jennifer Walsh',
      role: 'CEO, TechStart Denver',
      content: 'The large office has been perfect for our growing startup. We went from 3 to 7 people and the space adapted with us. The unlimited meeting rooms are essential for our client work.',
      rating: 5
    },
    {
      name: 'Marcus Rivera',
      role: 'Managing Partner, Rivera & Associates',
      content: 'Having our own large office gives us the credibility we need with clients while maintaining the collaborative energy our team thrives on. The event space booking priority is a huge advantage.',
      rating: 5
    },
    {
      name: 'Sarah Kim',
      role: 'Creative Director, Pixel Studios',
      content: 'The space is exactly what our creative team needed. We can spread out for brainstorming sessions and the natural light keeps everyone energized. Plus our office dogs love having room to roam!',
      rating: 5
    }
  ];

  const membershipComparison = [
    {
      feature: 'Office Size',
      dedicated: '1 desk space',
      private: '120-180 sq ft',
      large: '300-500 sq ft'
    },
    {
      feature: 'Team Capacity',
      dedicated: '1 person',
      private: '1-3 people',
      large: '4-8 people'
    },
    {
      feature: 'Meeting Room Access',
      dedicated: '2 hours/month',
      private: '4 hours/month',
      large: 'Unlimited'
    },
    {
      feature: 'Event Space Priority',
      dedicated: 'Standard access',
      private: 'Standard access',
      large: 'Priority booking'
    },
    {
      feature: 'Phone Lines',
      dedicated: 'Shared booths',
      private: '1 dedicated line',
      large: 'Multiple lines'
    },
    {
      feature: 'Monthly Price',
      dedicated: '$300',
      private: '$600',
      large: '$1,200'
    }
  ];

  const teamBenefits = [
    {
      size: '4-person team',
      costPerPerson: '$300',
      savings: 'vs. 4 private offices ($2,400)',
      description: 'Perfect for small agencies and consulting teams'
    },
    {
      size: '6-person team', 
      costPerPerson: '$200',
      savings: 'vs. 6 private offices ($3,600)',
      description: 'Ideal for growing startups and creative studios'
    },
    {
      size: '8-person team',
      costPerPerson: '$150', 
      savings: 'vs. 8 private offices ($4,800)',
      description: 'Excellent for established small businesses'
    }
  ];

  return (
    <main className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-50 to-purple-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold inline-block mb-4">
                Premium Team Solution
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Large Office
                <span className="text-purple-600 block">Membership</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Spacious private offices designed for growing teams and established businesses. 
                Get the space, privacy, and premium amenities your successful company deserves.
              </p>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-purple-600">$1,200</span>
                  <span className="text-xl text-gray-500">/month</span>
                </div>
                <p className="text-gray-600 text-sm">For teams of 4-8 people (as low as $150/person)</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/membership/apply" className="bg-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-purple-700 transition text-center">
                  Apply for Large Office
                </Link>
                <Link href="/contact" className="border-2 border-purple-600 text-purple-600 px-8 py-4 rounded-lg font-semibold hover:bg-purple-600 hover:text-white transition text-center">
                  Schedule Tour
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="relative h-96 lg:h-[500px] rounded-2xl overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-br from-purple-200 to-purple-300 h-full flex items-center justify-center">
                  <div className="text-center text-purple-800">
                    <Building2 className="w-24 h-24 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold mb-2">Your Team Office</h3>
                    <p className="text-purple-700">Spacious collaborative workspace</p>
                  </div>
                </div>
                <div className="absolute top-4 right-4">
                  <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Premium Space
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cost Per Person Breakdown */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Incredible Value for Growing Teams</h2>
            <p className="text-xl text-gray-600">See how much your team saves compared to individual private offices</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {teamBenefits.map((benefit, index) => (
              <div key={index} className="bg-purple-50 p-6 rounded-xl border border-purple-200 text-center">
                <h3 className="text-2xl font-bold text-purple-600 mb-2">{benefit.size}</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">{benefit.costPerPerson}</div>
                <p className="text-sm text-gray-500 mb-3">per person/month</p>
                <div className="bg-green-100 p-3 rounded-lg mb-4">
                  <p className="text-green-800 font-semibold text-sm">Save $1,200-3,600/month</p>
                  <p className="text-green-700 text-xs">{benefit.savings}</p>
                </div>
                <p className="text-gray-600 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Premium Team Features</h2>
            <p className="text-xl text-gray-600">Everything your growing business needs to thrive</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="bg-white p-6 rounded-xl hover:shadow-lg transition">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-purple-600" />
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
      <section className="py-16 bg-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Your Premium Team Office</h2>
            <p className="text-xl text-gray-600">Designed for collaboration, productivity, and growth</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="grid md:grid-cols-2 gap-6">
                {officeFeatures.map((feature, index) => {
                  const IconComponent = feature.icon;
                  return (
                    <div key={index} className="bg-white p-6 rounded-xl shadow-sm">
                      <IconComponent className="w-8 h-8 text-purple-600 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-600 text-sm">{feature.description}</p>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 bg-amber-100 p-4 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-600" />
                  <span className="font-semibold text-amber-800">Unlimited Meeting Rooms</span>
                </div>
                <p className="text-amber-700 text-sm mt-1">Book any conference room anytime with priority scheduling for your team meetings</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Office Specifications</h3>
                <div className="space-y-3 text-gray-700">
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span className="font-semibold">300-500 sq ft</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Capacity:</span>
                    <span className="font-semibold">4-8 team members</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Windows:</span>
                    <span className="font-semibold">Multiple with natural light</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Workstations:</span>
                    <span className="font-semibold">Individual + collaboration area</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage:</span>
                    <span className="font-semibold">Multiple cabinets & shelving</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Security:</span>
                    <span className="font-semibold">Private keycard access</span>
                  </div>
                </div>
              </div>

              <div className="bg-purple-100 p-4 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-2">Team Benefits</h4>
                <ul className="text-purple-700 text-sm space-y-1">
                  <li>• Dedicated team phone system</li>
                  <li>• Priority event space booking</li>
                  <li>• Monthly snackshop credits</li>
                  <li>• Custom office configuration</li>
                  <li>• Team pet-friendly policy</li>
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
            <p className="text-xl text-gray-600">Large offices work best for these growing businesses</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-purple-50 rounded-xl">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Growing Startups</h3>
              <p className="text-gray-600">Companies scaling from 4-8 people who need collaborative team space</p>
            </div>

            <div className="text-center p-6 bg-purple-50 rounded-xl">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Established Businesses</h3>
              <p className="text-gray-600">Companies needing professional space for client meetings and team operations</p>
            </div>

            <div className="text-center p-6 bg-purple-50 rounded-xl">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Creative Teams</h3>
              <p className="text-gray-600">Agencies, studios, and collaborative teams who need space to spread out and create</p>
            </div>
          </div>
        </div>
      </section>

      {/* Member Testimonials */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What Our Team Leaders Say</h2>
            <p className="text-xl text-gray-600">Real feedback from companies using our large offices</p>
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
            <p className="text-xl text-gray-600">See how large office compares to our other membership levels</p>
            <button 
              onClick={() => setShowComparison(!showComparison)}
              className="mt-4 text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-2 mx-auto"
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
                      <th className="text-center p-4 font-semibold text-gray-900">Private Office</th>
                      <th className="text-center p-4 font-semibold text-purple-600">Large Office</th>
                    </tr>
                  </thead>
                  <tbody>
                    {membershipComparison.map((row, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="p-4 font-medium text-gray-900">{row.feature}</td>
                        <td className="p-4 text-center text-gray-700">{row.dedicated}</td>
                        <td className="p-4 text-center text-gray-700">{row.private}</td>
                        <td className="p-4 text-center">
                          <span className="font-semibold text-purple-600">{row.large}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-gray-50 text-center">
                <Link href="/membership" className="text-purple-600 hover:text-purple-700 font-semibold">
                  View All Membership Options →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Location Benefits */}
      <section className="py-16 bg-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Prime Business Location for Teams</h2>
              <p className="text-xl text-gray-600 mb-6">
                Establish your growing company in Denver's most prestigious Sloan's Lake neighborhood.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-purple-600" />
                  <span className="text-gray-700">2246 Irving Street - Premier business address</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="text-gray-700">Impressive client meeting location</span>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  <span className="text-gray-700">Historic landmark adds company credibility</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <span className="text-gray-700">3 minutes to I-25 for easy team commuting</span>
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
      <section className="py-16 bg-gradient-to-r from-purple-500 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Scale Your Team?</h2>
          <p className="text-xl text-purple-100 mb-8">
            Give your growing business the space and credibility it deserves
          </p>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">What's Next?</h3>
            <div className="grid md:grid-cols-3 gap-4 text-purple-100">
              <div className="text-center">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold">1</span>
                </div>
                <p className="text-sm">Submit Team Application</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold">2</span>
                </div>
                <p className="text-sm">Tour Large Office Options</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold">3</span>
                </div>
                <p className="text-sm">Move Your Team In!</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/membership/apply" className="bg-white text-purple-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition">
              Apply for Large Office
            </Link>
            <Link href="/contact" className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition">
              Schedule Team Tour
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}