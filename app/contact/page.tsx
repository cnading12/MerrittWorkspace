"use client";

import { MapPin, Phone, Mail, Clock, Calendar, MessageSquare, Building2, Car } from 'lucide-react';
import Footer from "@/components/Footer";
import { useState } from 'react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
    inquiry_type: 'general'
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Mock form submission
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('Contact form submitted:', formData);
    setSubmitted(true);
    setSubmitting(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <main className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-burnt-orange-50 to-burnt-orange-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Get in Touch
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Ready to join our community or have questions about our workspace?
              We're here to help you find the perfect solution for your business needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="tel:303-359-8337" className="bg-burnt-orange-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-burnt-orange-700 transition inline-flex items-center justify-center gap-2">
                <Phone className="w-5 h-5" />
                Call Now: (303) 359-8337
              </a>
              <a href="mailto:manager@merrittworkspace.com" className="border-2 border-burnt-orange-600 text-burnt-orange-600 px-8 py-4 rounded-lg font-semibold hover:bg-burnt-orange-600 hover:text-white transition inline-flex items-center justify-center gap-2">
                <Mail className="w-5 h-5" />
                Email Us
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Contact Information</h2>

            {/* Location */}
            <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-burnt-orange-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Our Location</h3>
                  <p className="text-gray-700 mb-2">
                    <strong>2246 Irving Street</strong><br />
                    Denver, CO 80211
                  </p>
                  <p className="text-sm text-burnt-orange-600 mb-4">
                    Located in the heart of Sloan's Lake at 23rd and Irving St, next to the historic Landmark Merritt Church Building
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Car className="w-4 h-4" />
                    <span>Just 3 minutes to I-25 • Walk, bike, or drive to work</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Methods */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Phone className="w-6 h-6 text-burnt-orange-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Phone</h3>
                  <a href="tel:303-359-8337" className="text-burnt-orange-600 hover:underline">
                    (303) 359-8337
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Mail className="w-6 h-6 text-burnt-orange-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Email</h3>
                  <a href="mailto:manager@merrittworkspace.com" className="text-burnt-orange-600 hover:underline">
                    manager@merrittworkspace.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Clock className="w-6 h-6 text-burnt-orange-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Hours</h3>
                  <div className="space-y-1 text-gray-700">
                    <p><strong>Building Access:</strong> 24/7 for members</p>
                    <p><strong>Office Hours:</strong> Monday - Friday, 9 AM - 5 PM</p>
                    <p><strong>Tours & Support:</strong> Monday - Friday, 9 AM - 5 PM</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Calendar className="w-6 h-6 text-burnt-orange-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Schedule a Tour</h3>
                  <p className="text-gray-700 mb-3">
                    Experience our workspace with a complimentary tour and free trial day.
                  </p>
                  <a href="tel:303-359-8337" className="bg-burnt-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-burnt-orange-700 transition inline-block">
                    Call to Schedule
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="mt-8 p-6 bg-burnt-orange-50 rounded-xl border border-burnt-orange-200">
              <h3 className="font-semibold text-burnt-orange-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <a href="/membership" className="block text-burnt-orange-700 hover:text-burnt-orange-900 hover:underline">
                  → Apply for Membership
                </a>
                <a href="/meeting-rooms" className="block text-burnt-orange-700 hover:text-burnt-orange-900 hover:underline">
                  → Book a Meeting Room
                </a>
                <a href="/snackshop" className="block text-burnt-orange-700 hover:text-burnt-orange-900 hover:underline">
                  → Order from Snackshop
                </a>
                <a href="https://maps.google.com/?q=2246+Irving+Street,+Denver,+CO+80211" target="_blank" className="block text-burnt-orange-700 hover:text-burnt-orange-900 hover:underline">
                  → Get Directions
                </a>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Send Us a Message</h2>

              {submitted ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-600 mb-4">
                    Thanks for reaching out! We'll get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        name: '',
                        email: '',
                        phone: '',
                        company: '',
                        message: '',
                        inquiry_type: 'general'
                      });
                    }}
                    className="text-burnt-orange-600 hover:underline"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="inquiry_type" className="block text-sm font-medium text-gray-700 mb-2">
                      What can we help you with?
                    </label>
                    <select
                      id="inquiry_type"
                      name="inquiry_type"
                      value={formData.inquiry_type}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500 focus:border-burnt-orange-500"
                    >
                      <option value="general">General Information</option>
                      <option value="tour">Schedule a Tour</option>
                      <option value="membership">Membership Inquiry</option>
                      <option value="meeting_room">Meeting Room Booking</option>
                      <option value="current_member">Current Member Support</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500 focus:border-burnt-orange-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500 focus:border-burnt-orange-500"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500 focus:border-burnt-orange-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500 focus:border-burnt-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Tell us how we can help you..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500 focus:border-burnt-orange-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-burnt-orange-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-burnt-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Sending Message...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Visit Our Historic Location</h2>
            <p className="text-xl text-gray-600">
              Located next to the historic Landmark Merritt Church Building in the heart of Sloan's Lake
            </p>
          </div>

          {/* Map */}
          <div className="rounded-xl overflow-hidden shadow-lg">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3048.3751849999447!2d-105.02659242404156!3d39.75089969486985!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x876c79e0c86f6b7b%3A0x8c8b8b8b8b8b8b8b!2s2246%20Irving%20St%2C%20Denver%2C%20CO%2080211!5e0!3m2!1sen!2sus!4v1693846800000!5m2!1sen!2sus"
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Merritt Workspace Location - 2246 Irving Street, Denver, CO"
            />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}