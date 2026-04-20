"use client";

import { Check, Clock, Wifi, Shield, Coffee, Users, Calendar, MapPin, Phone, Mail, Heart, ArrowRight, Briefcase, TrendingUp, Zap } from 'lucide-react';
import Footer from "@/components/Footer";
import Link from 'next/link';
import Image from 'next/image';

export default function DedicatedDeskPage() {
  const includedFeatures = [
    {
      icon: Clock,
      title: '24/7 Access',
      description: 'Work on your schedule with round-the-clock building access'
    },
    {
      icon: Wifi,
      title: 'High-Speed WiFi',
      description: 'Enterprise-grade internet throughout the building'
    },
    {
      icon: Shield,
      title: 'Secure Storage',
      description: 'Lockable desk drawers and personal storage options'
    },
    {
      icon: Coffee,
      title: 'Full Kitchen',
      description: 'Coffee, microwave, refrigerator, and prep space'
    },
    {
      icon: Phone,
      title: '4 Phone Booths',
      description: 'Private soundproof booths for calls and video meetings (first-come, first-served)'
    },
    {
      icon: Calendar,
      title: 'Meeting Credits',
      description: '2 free hours of conference room time per month'
    },
    {
      icon: Mail,
      title: 'Mail Handling',
      description: 'Professional mail receiving and package management'
    },
    {
      icon: Heart,
      title: 'Pet-Friendly',
      description: 'Bring your well-behaved dog to work with you'
    },
    {
      icon: MapPin,
      title: 'FREE Flex Space Next Door',
      description: 'Use our beautiful flex space in the adjacent building for meetings and events—free until 4:30 PM daily'
    },
    {
      icon: Calendar,
      title: 'FREE Trial Day',
      description: 'Try the space for a full day, on the house, before you commit to a membership'
    }
  ];

  const eventSpaceFeatures = [
    {
      icon: Coffee,
      title: 'Flex Space Coffee Lounge',
      description: 'Café seating and a beautiful space to recharge in our flex space next door'
    },
    {
      icon: Users,
      title: 'Free Workshops & Meetings',
      description: 'Host team meetings, client presentations, and networking events at no cost'
    },
    {
      icon: Zap,
      title: 'Projector & Sound System',
      description: 'Professional AV equipment ready for your presentations'
    },
    {
      icon: TrendingUp,
      title: 'Recreation & Breaks',
      description: 'Ping pong, flexible seating, and space to recharge'
    }
  ];

  const idealFor = [
    {
      icon: Briefcase,
      title: 'Freelancers & Consultants',
      description: 'Professional environment separate from home with built-in networking opportunities'
    },
    {
      icon: Users,
      title: 'Remote Workers',
      description: 'Escape home distractions while maintaining flexibility and community connection'
    },
    {
      icon: TrendingUp,
      title: 'New Entrepreneurs',
      description: 'Building their business with access to professional network and meeting spaces'
    }
  ];


  return (
    <main className="min-h-screen bg-gray-50 pt-16">
      {/* Urgency Banner */}
      <div className="bg-yellow-400 text-gray-900 py-3 text-center font-semibold text-sm md:text-base">
        <Zap className="w-4 h-4 inline-block mr-1 -mt-0.5" /> Limited Deal: First 10 members lock in $100/month for life — $200 off our standard $300/month rate. Only a few spots remain.
      </div>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-burnt-orange-50 to-burnt-orange-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Dedicated Desk — $100/Month.
              <span className="text-burnt-orange-600 block">Only 10 Spots.</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Our standard rate is $300/month. For a limited time, the first 10 members lock in $100/month for life. Once those spots are claimed, this rate is gone forever.
            </p>
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold mb-6">
              <Check className="w-4 h-4" />
              Every New Member Gets a Free Trial Day — No Commitment
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
              <Link
                href="/membership/apply"
                className="bg-burnt-orange-600 hover:bg-burnt-orange-700 text-white py-4 px-8 rounded-lg font-semibold transition inline-flex items-center justify-center gap-2"
              >
                Claim Your Spot — $100/Month
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/contact"
                className="bg-white text-burnt-orange-600 py-4 px-8 rounded-lg font-semibold hover:bg-gray-100 transition inline-flex items-center justify-center border-2 border-burnt-orange-600"
              >
                Book Your Free Trial Day
              </Link>
            </div>
            <a
              href="tel:7203579499"
              className="inline-flex items-center justify-center text-burnt-orange-700 font-semibold hover:text-burnt-orange-800 transition"
            >
              Or call/text: (720) 357-9499
            </a>
          </div>

          {/* Main Content Card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-8 p-8 md:p-12">
              {/* Left Column - Details */}
              <div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl text-gray-400 line-through">$300/month</span>
                    <span className="text-5xl font-bold text-green-600">$100</span>
                    <span className="text-2xl text-gray-500">/month</span>
                  </div>
                  <p className="text-gray-600 text-lg mb-4">Lock in this rate for life • Save $200/month off standard • No long-term contracts</p>
                  <div className="bg-burnt-orange-50 border border-burnt-orange-200 rounded-lg p-3 mb-4">
                    <p className="text-burnt-orange-800 font-bold text-sm">10 SPOTS ONLY — $100/MONTH FOR LIFE</p>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">What's Included</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Your own dedicated desk with storage</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">24/7 building access with key card</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">High-speed WiFi and power outlets</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Access to 4 private phone booths (first-come, first-served)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Full kitchen with coffee, microwave, and refrigerator</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">2 hours monthly conference room credits</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Mail and package handling</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700"><strong>FREE flex space access next door</strong> until 4:30 PM daily</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700"><strong>Host workshops & meetings FREE</strong> in our flex space next door</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Pet-friendly workspace</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700"><strong>FREE trial day</strong> to experience the space before you sign up</span>
                    </li>
                  </ul>
                </div>

                <Link
                  href="/membership/apply"
                  className="w-full bg-burnt-orange-600 hover:bg-burnt-orange-700 text-white py-4 px-6 rounded-lg font-semibold transition text-center block"
                >
                  Claim Your Spot — $100/Month
                </Link>
                <Link
                  href="/contact"
                  className="w-full mt-3 border-2 border-burnt-orange-600 text-burnt-orange-600 hover:bg-burnt-orange-50 py-4 px-6 rounded-lg font-semibold transition text-center block"
                >
                  Try It Free — Book a Trial Day
                </Link>
              </div>

              {/* Right Column - Images */}
              <div className="space-y-4">
                <div className="relative h-64 md:h-80 rounded-xl overflow-hidden shadow-lg">
                  <Image
                    src="/images/hero/dedicated-desk.webp"
                    alt="Dedicated desk workspace at Merritt Workspace coworking space in Sloan's Lake, Denver - $300/month"
                    fill
                    placeholder="blur"
                    blurDataURL="data:image/webp;base64,UklGRjYAAABXRUJQVlA4ICoAAACwAQCdASoKAA0ABUB8JZACdADYt8AAAOD9JmNTjrhhjajRJ8jDWLTrgAA="
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
                <div className="relative h-64 md:h-80 rounded-xl overflow-hidden shadow-lg">
                  <Image
                    src="/images/hero/dedicated-desk2.webp"
                    alt="Private phone booths available to dedicated desk members at Merritt Workspace Denver"
                    fill
                    placeholder="blur"
                    blurDataURL="data:image/webp;base64,UklGRjgAAABXRUJQVlA4ICwAAADQAQCdASoKAA0ABUB8JbACdADzb+1ioAD8burtvIdt4s/VhXKBfhJKiewAAA=="
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything You Need to Thrive</h2>
            <p className="text-xl text-gray-600">Premium amenities included with your dedicated desk</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {includedFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-burnt-orange-100 rounded-lg flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-burnt-orange-600" />
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

      {/* Phone Booth Highlight Section */}
      <section className="py-16 bg-burnt-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="relative h-64 lg:h-full min-h-[300px]">
                <Image
                  src="/images/private-offices/phone-booth.webp"
                  alt="Private soundproof phone booths at Merritt Workspace coworking space in Denver"
                  fill
                  placeholder="blur"
                  blurDataURL="data:image/webp;base64,UklGRi4AAABXRUJQVlA4ICIAAACQAQCdASoKAA0ABUB8JYwC7ABV5SAA4HaeU5YMqltZnwAA"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="p-8 lg:p-12 flex flex-col justify-center">
                <div className="w-16 h-16 bg-burnt-orange-100 rounded-full flex items-center justify-center mb-6">
                  <Phone className="w-8 h-8 text-burnt-orange-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  4 Private Phone Booths
                </h2>
                <p className="text-xl text-gray-600 mb-6">
                  Need to take a confidential call or join a video meeting? We have four soundproof phone booths 
                  available to all members on a first-come, first-served basis.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Soundproof for complete privacy</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Perfect for video calls and client meetings</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Available anytime during your membership</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">No reservations needed - just walk in</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Event Space Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold mb-4">
              <Check className="w-4 h-4" />
              FREE for Members
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What Sets Us Apart: Beautiful Flex Space Next Door</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              This is what sets us apart. Your membership includes free access to our stunning flex space in the adjacent building—host workshops, large meetings, and networking events <strong>completely free</strong> until 4:30 PM daily. No other Denver coworking space offers this.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {eventSpaceFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="bg-gray-50 rounded-xl p-6 text-center hover:shadow-lg transition">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
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
            <p className="text-xl text-gray-600">Ideal workspace solution for these professionals</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {idealFor.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div key={index} className="bg-white p-8 rounded-xl text-center hover:shadow-lg transition">
                  <div className="w-16 h-16 bg-burnt-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-8 h-8 text-burnt-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials removed — to be added when real member quotes are collected */}

      {/* Internal Links Section */}
      <section className="py-12 bg-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Explore Other Options</h3>
          <p className="text-gray-600 mb-6">
            Need more privacy? Check out our <Link href="/membership/private-office" className="text-burnt-orange-600 hover:underline font-semibold">private office rentals in Denver</Link> starting at $500/month.
            Or <Link href="/membership" className="text-burnt-orange-600 hover:underline font-semibold">compare all membership options</Link> to find your perfect workspace.
          </p>
          <p className="text-sm text-gray-500">
            Questions? <Link href="/contact" className="text-burnt-orange-600 hover:underline">Contact us</Link> or visit our <Link href="/member-resources/faqs" className="text-burnt-orange-600 hover:underline">FAQ page</Link>
          </p>
        </div>
      </section>

      {/* Scarcity Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">This Rate Won't Last</h2>
          <p className="text-lg text-gray-600">
            Merritt Workspace has been a neighborhood coworking home for over 4 years. This $100/month rate is a one-time promotional offer — not our standard pricing. The first 10 members to sign up lock in $100/month for life. After that, the rate returns to $300/month. Claim your spot now.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-burnt-orange-500 to-burnt-orange-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white text-burnt-orange-700 px-4 py-2 rounded-full text-sm font-bold mb-6">
            <Check className="w-4 h-4" />
            Free Trial Day Included — Try Before You Commit
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Reserve Your Desk at $100/Month
          </h2>
          <p className="text-xl text-burnt-orange-100 mb-8">
            Only 10 spots at this rate — locked in for life. Standard rate is $300/month. Every potential new member gets a free trial day first.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/membership/apply"
              className="bg-white text-burnt-orange-600 py-4 px-8 rounded-lg font-semibold hover:bg-gray-100 transition inline-flex items-center justify-center gap-2"
            >
              Apply Now — $100/Month Deal
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="bg-burnt-orange-700 text-white py-4 px-8 rounded-lg font-semibold hover:bg-burnt-orange-800 transition inline-flex items-center justify-center border-2 border-white"
            >
              Book Your Free Trial Day
            </Link>
          </div>
          <p className="text-burnt-orange-200 mt-6">
            Questions? Call or text <a href="tel:7203579499" className="text-white hover:underline font-semibold">(720) 357-9499</a>
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}