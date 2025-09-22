"use client";

import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Key, Car, Calendar, Phone, Volume2, Heart, Coffee, Mail, MapPin, Shield, Users, Wifi } from 'lucide-react';
import Footer from "@/components/Footer";
import Link from 'next/link';

interface FAQItem {
  id: string;
  question: string;
  answer: string | JSX.Element;
  category: string;
  icon: any;
}

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<string[]>(['access']); // Start with first item open
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const toggleItem = (id: string) => {
    setOpenItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const faqData: FAQItem[] = [
    {
      id: 'access',
      category: 'access',
      icon: Key,
      question: 'How do I get access to the building?',
      answer: (
        <div className="space-y-3">
          <p>Getting access to Merritt Workspace is simple:</p>
          <ul className="space-y-2 ml-4">
            <li className="flex items-start">
              <Clock className="w-4 h-4 text-burnt-orange-600 mt-1 mr-2 flex-shrink-0" />
              <span><strong>Business Hours (8am - 6pm):</strong> The building is unlocked and open for all members</span>
            </li>
            <li className="flex items-start">
              <Key className="w-4 h-4 text-burnt-orange-600 mt-1 mr-2 flex-shrink-0" />
              <span><strong>24/7 Access:</strong> After your membership begins, we'll contact you within 24 hours to set up your unique access code for round-the-clock entry</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'door-lock',
      category: 'access',
      icon: Key,
      question: 'How do I lock and unlock the front door after hours?',
      answer: (
        <div className="space-y-3">
          <p>Our front door uses a keypad system for secure after-hours access.</p>
          <div className="bg-burnt-orange-50 p-4 rounded-lg border border-burnt-orange-200">
            <p className="text-burnt-orange-800 mb-2"><strong>📹 Video Tutorial Available</strong></p>
            <p className="text-burnt-orange-700 text-sm">We provide a helpful tutorial video showing exactly how to use the keypad system. You'll receive this link along with your access code setup.</p>
          </div>
          <p className="text-sm text-gray-600">Your unique access code will be provided when you start your membership.</p>
        </div>
      )
    },
    {
      id: 'parking',
      category: 'location',
      icon: Car,
      question: 'Where do I park?',
      answer: (
        <div className="space-y-3">
          <p className="text-green-700 font-semibold">🎉 Parking is completely free!</p>
          <div className="space-y-2">
            <div className="flex items-start">
              <MapPin className="w-4 h-4 text-burnt-orange-600 mt-1 mr-2 flex-shrink-0" />
              <span><strong>Parking Lot:</strong> Free spots directly in front of Merritt Workspace</span>
            </div>
            <div className="flex items-start">
              <MapPin className="w-4 h-4 text-burnt-orange-600 mt-1 mr-2 flex-shrink-0" />
              <span><strong>Street Parking:</strong> Free parking on both 23rd and Irving streets</span>
            </div>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
            <p className="text-amber-800 text-sm"><strong>⚠️ Note:</strong> Be mindful of street cleaning days when parking on the street!</p>
          </div>
        </div>
      )
    },
    {
      id: 'conference-rooms',
      category: 'amenities',
      icon: Calendar,
      question: 'How do I book a conference room?',
      answer: (
        <div className="space-y-3">
          <p>Booking our first-class meeting rooms is easy:</p>
          <div className="space-y-3">
            <div className="flex items-start">
              <Calendar className="w-4 h-4 text-burnt-orange-600 mt-1 mr-2 flex-shrink-0" />
              <span>Visit our <Link href="/meeting-rooms" className="text-burnt-orange-600 hover:underline font-semibold">Meeting Rooms page</Link> and click 'Book Now'</span>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">📅 Member Benefits:</h4>
              <ul className="space-y-1 text-green-700 text-sm">
                <li>• <strong>Two FREE hours</strong> of conference room time per month</li>
                <li>• After free hours: $30/hour</li>
                <li>• Easy online booking system</li>
                <li>• Rooms include 75" Smart TV, WiFi, and A/V equipment</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'phone-calls',
      category: 'amenities',
      icon: Phone,
      question: 'Where should I take Zoom calls and personal phone calls?',
      answer: (
        <div className="space-y-3">
          <p>We have several options for private calls:</p>
          <div className="space-y-3">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">📞 Phone Booth Options:</h4>
              <ul className="space-y-1 text-blue-700 text-sm">
                <li>• <strong>Three dedicated phone booths</strong> - first come, first served</li>
                <li>• No reservations required</li>
                <li>• Perfect for Zoom calls and personal calls</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p><strong>Alternative Options:</strong></p>
              <ul className="space-y-1 ml-4 text-sm">
                <li>• <strong>Event Space:</strong> Use if not occupied (available until 4:30 PM)</li>
                <li>• <strong>Outdoor Patio:</strong> Great spot for calls with fresh air</li>
                <li>• <strong>Private Office Members:</strong> Please close your door during calls</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'noise-policy',
      category: 'policies',
      icon: Volume2,
      question: 'What are your noise policies in the workspace?',
      answer: (
        <div className="space-y-3">
          <p>We maintain a productive, respectful environment for all members:</p>
          <div className="space-y-3">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2">🤫 Open Workspace Guidelines:</h4>
              <ul className="space-y-1 text-gray-700 text-sm">
                <li>• Keep conversations quiet and brief</li>
                <li>• Use phone booths for all calls</li>
                <li>• Take longer conversations to event space or outside</li>
                <li>• Be mindful of keyboard noise and notifications</li>
              </ul>
            </div>
            <div className="bg-burnt-orange-50 p-4 rounded-lg border border-burnt-orange-200">
              <h4 className="font-semibold text-burnt-orange-800 mb-2">🚪 Private Office Members:</h4>
              <p className="text-burnt-orange-700 text-sm">Please close your door when taking calls or conducting meetings to respect the open workspace atmosphere.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'pets',
      category: 'policies',
      icon: Heart,
      question: 'Can I bring my dog to the workspace?',
      answer: (
        <div className="space-y-3">
          <p>Our pet policy varies by membership type:</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">✅ Private Office Members</h4>
              <ul className="space-y-1 text-green-700 text-sm">
                <li>• Dogs are welcome!</li>
                <li>• Must stay in your private office</li>
                <li>• Please be respectful of other members</li>
              </ul>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-2">❌ Dedicated & Mobile Desk</h4>
              <p className="text-red-700 text-sm">Unfortunately, pets are not permitted in the shared workspace areas.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'snackshop',
      category: 'amenities',
      icon: Coffee,
      question: 'How do I buy snacks and coffee?',
      answer: (
        <div className="space-y-3">
          <p>Our convenient Snackshop makes it easy to fuel your workday:</p>
          <div className="space-y-3">
            <div className="flex items-start">
              <Coffee className="w-4 h-4 text-burnt-orange-600 mt-1 mr-2 flex-shrink-0" />
              <span>Visit our <Link href="/snackshop" className="text-burnt-orange-600 hover:underline font-semibold">Snackshop page</Link> to browse and order</span>
            </div>
            <div className="bg-burnt-orange-50 p-4 rounded-lg border border-burnt-orange-200">
              <h4 className="font-semibold text-burnt-orange-800 mb-2">🛒 How It Works:</h4>
              <ol className="space-y-1 text-burnt-orange-700 text-sm">
                <li>1. Browse our selection of drinks, snacks, and meals</li>
                <li>2. Add items to your cart</li>
                <li>3. Complete secure checkout</li>
                <li>4. Items delivered to your desk within 15 minutes</li>
              </ol>
            </div>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <p className="text-blue-800"><strong>Payment Options:</strong> Credit card or account credit</p>
              </div>
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="text-green-800"><strong>Fresh Options:</strong> Coffee, healthy snacks, and meals</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'event-space',
      category: 'amenities',
      icon: Users,
      question: 'Can I use the Event Space next door?',
      answer: (
        <div className="space-y-3">
          <p>Yes! Our Event Space is available to all coworking members:</p>
          <div className="space-y-3">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">🎯 Event Space Features:</h4>
              <ul className="space-y-1 text-blue-700 text-sm">
                <li>• Coffee shop area with permanent seating</li>
                <li>• Professional projector and sound system</li>
                <li>• Ping pong table for breaks</li>
                <li>• Flexible meeting space</li>
              </ul>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <p className="text-amber-800 text-sm"><strong>⏰ Availability:</strong> Open to coworking members daily until 4:30 PM (first come, first served)</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'wifi',
      category: 'technical',
      icon: Wifi,
      question: 'How fast is the WiFi?',
      answer: (
        <div className="space-y-3">
          <p>We provide enterprise-grade internet throughout the building:</p>
          <div className="space-y-3">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">🚀 WiFi Features:</h4>
              <ul className="space-y-1 text-green-700 text-sm">
                <li>• High-speed fiber internet</li>
                <li>• Reliable connection throughout both buildings</li>
                <li>• Perfect for video calls and large file transfers</li>
                <li>• Backup connection for redundancy</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600">Network details and passwords are provided during your member onboarding.</p>
          </div>
        </div>
      )
    },
    {
      id: 'security',
      category: 'policies',
      icon: Shield,
      question: 'How secure is the building?',
      answer: (
        <div className="space-y-3">
          <p>Your safety and security are our top priorities:</p>
          <div className="space-y-3">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">🔒 Security Features:</h4>
              <ul className="space-y-1 text-blue-700 text-sm">
                <li>• 24/7 building monitoring</li>
                <li>• Unique access codes for each member</li>
                <li>• Keycard access to private offices</li>
                <li>• Well-lit parking and entrance areas</li>
                <li>• Security cameras in common areas</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'contact',
      category: 'general',
      icon: Mail,
      question: 'Who do I contact with additional questions?',
      answer: (
        <div className="space-y-3">
          <p>We're here to help! Reach out anytime:</p>
          <div className="space-y-3">
            <div className="bg-burnt-orange-50 p-4 rounded-lg border border-burnt-orange-200">
              <h4 className="font-semibold text-burnt-orange-800 mb-3">📞 Contact Information:</h4>
              <div className="space-y-2 text-burnt-orange-700">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  <a href="mailto:manager@merrittworkspace.com" className="hover:underline">
                    manager@merrittworkspace.com
                  </a>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  <a href="tel:303-359-8337" className="hover:underline">
                    (303) 359-8337
                  </a>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p><strong>Response Time:</strong> We typically respond to emails within 4 hours during business days.</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const categories = [
    { id: 'all', name: 'All Questions', icon: Users },
    { id: 'access', name: 'Access & Security', icon: Key },
    { id: 'amenities', name: 'Amenities', icon: Coffee },
    { id: 'policies', name: 'Policies', icon: Shield },
    { id: 'location', name: 'Location & Parking', icon: Car },
    { id: 'technical', name: 'Technical', icon: Wifi },
    { id: 'general', name: 'General', icon: Mail }
  ];

  const filteredFAQs = selectedCategory === 'all' 
    ? faqData 
    : faqData.filter(faq => faq.category === selectedCategory);

  return (
    <main className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-burnt-orange-50 to-burnt-orange-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Find quick answers to common questions about Merritt Workspace. 
              Can't find what you're looking for? We're here to help!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="mailto:manager@merrittworkspace.com" className="bg-burnt-orange-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-burnt-orange-700 transition">
                Email Us
              </a>
              <a href="tel:303-359-8337" className="border-2 border-burnt-orange-600 text-burnt-orange-600 px-8 py-4 rounded-lg font-semibold hover:bg-burnt-orange-600 hover:text-white transition">
                Call: (303) 359-8337
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Filter */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Browse by Category</h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {categories.map(category => {
                const IconComponent = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                      selectedCategory === category.id
                        ? 'bg-burnt-orange-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-burnt-orange-50 hover:text-burnt-orange-600 border border-gray-200'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* FAQ Items */}
          <div className="space-y-4">
            {filteredFAQs.map((faq) => {
              const IconComponent = faq.icon;
              const isOpen = openItems.includes(faq.id);
              
              return (
                <div
                  key={faq.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  <button
                    onClick={() => toggleItem(faq.id)}
                    className="w-full p-6 text-left hover:bg-gray-50 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className="w-6 h-6 text-burnt-orange-600 flex-shrink-0" />
                      <h3 className="text-lg font-semibold text-gray-900">{faq.question}</h3>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    )}
                  </button>
                  
                  {isOpen && (
                    <div className="px-6 pb-6">
                      <div className="pl-9 text-gray-700 leading-relaxed">
                        {faq.answer}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredFAQs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">No questions found in this category.</p>
            </div>
          )}
        </div>
      </section>

      {/* Still Have Questions */}
      <section className="py-16 bg-burnt-orange-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Still Have Questions?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Our team is here to help you get the most out of your Merritt Workspace experience.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <Mail className="w-8 h-8 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Email Support</h3>
              <p className="text-gray-600 mb-4">Get detailed answers to your questions</p>
              <a 
                href="mailto:manager@merrittworkspace.com"
                className="bg-burnt-orange-600 text-white px-6 py-2 rounded-lg hover:bg-burnt-orange-700 transition inline-block"
              >
                Send Email
              </a>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <Phone className="w-8 h-8 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Phone Support</h3>
              <p className="text-gray-600 mb-4">Speak directly with our team</p>
              <a 
                href="tel:303-359-8337"
                className="bg-burnt-orange-600 text-white px-6 py-2 rounded-lg hover:bg-burnt-orange-700 transition inline-block"
              >
                Call Now
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}