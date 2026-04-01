"use client";

import { FileText, AlertTriangle, Scale, Ban, DollarSign, Shield, Clock, Users } from 'lucide-react';
import Footer from "@/components/Footer";
import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-50 to-orange-100 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Terms of Service
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              Last Updated: January 1, 2025
            </p>
            <p className="text-lg text-gray-600">
              Please read these terms carefully before using Merritt Workspace services.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Agreement to Terms */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <Scale className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Agreement to Terms</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  These Terms of Service ("Terms") constitute a legally binding agreement between you 
                  ("Member," "you," or "your") and Merritt Workspace ("Merritt," "we," "us," or "our") 
                  regarding your use of our coworking space and services located at 2246 Irving Street, 
                  Denver, CO 80211.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  By accessing our facility, using our services, or signing a membership agreement, you 
                  acknowledge that you have read, understood, and agree to be bound by these Terms.
                </p>
              </div>
            </div>
          </div>

          {/* Membership */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <Users className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Membership</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Types of Membership</h3>
                <p className="text-gray-700 mb-4">We offer the following membership options:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                  <li><strong>Dedicated Desk:</strong> Your own assigned workspace in our shared environment</li>
                  <li><strong>Private Office (Single):</strong> Lockable office for one person</li>
                  <li><strong>Private Office (Double):</strong> Lockable office for up to two people</li>
                  <li><strong>Private Office (Large):</strong> Lockable office for 4-8 people</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">Membership Requirements</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                  <li>Members must be at least 18 years of age</li>
                  <li>Complete membership application and provide required information</li>
                  <li>Submit to background check (for security purposes)</li>
                  <li>Agree to these Terms of Service</li>
                  <li>Maintain valid payment information</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">Membership Term</h3>
                <p className="text-gray-700 mb-4">
                  All memberships are month-to-month unless otherwise specified in your membership 
                  agreement. We do not require long-term lease commitments.
                </p>

                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <p className="text-orange-800 text-sm">
                    <strong>Note:</strong> Membership fees are non-refundable except as required by law.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <DollarSign className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Terms</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Membership Fees</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                  <li>Monthly membership fees are due on the 1st of each month</li>
                  <li>Payment must be made via credit card or ACH bank transfer</li>
                  <li>First month's payment and refundable security deposit due upon approval</li>
                  <li>We accept major credit cards through our secure payment processor (Stripe)</li>
                  <li>Late payments may incur a $25 late fee after a 5-day grace period</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">Additional Services</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                  <li><strong>Meeting Room Bookings:</strong> Members receive monthly credits; additional hours charged at posted rates</li>
                  <li><strong>Snackshop Purchases:</strong> Charged separately to your account or credit card</li>
                  <li><strong>Printing Services:</strong> Charged per page at posted rates</li>
                  <li><strong>Mail Services:</strong> Included in private office memberships</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">Price Changes</h3>
                <p className="text-gray-700 mb-4">
                  We reserve the right to change membership fees with 30 days' written notice. 
                  Continued use of our services after price changes constitutes acceptance of new rates.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">Refund Policy</h3>
                <p className="text-gray-700">
                  Membership fees are non-refundable. If you cancel mid-month, you will retain access 
                  until the end of your billing cycle.
                </p>
              </div>
            </div>
          </div>

          {/* Facility Access */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <Clock className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Facility Access and Use</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Access Hours</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                  <li><strong>Members:</strong> 24/7 building access via keycard</li>
                  <li><strong>Business Hours:</strong> Monday-Friday, 9 AM - 5 PM (staff available)</li>
                  <li><strong>Event Space:</strong> Available to members daily until 4:30 PM</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">Security</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                  <li>Keycards are non-transferable and must not be shared</li>
                  <li>Lost or stolen keycards must be reported immediately ($25 replacement fee)</li>
                  <li>Members are responsible for guests and must accompany them at all times</li>
                  <li>Security cameras monitor common areas (not private offices)</li>
                  <li>Building is monitored 24/7 for security purposes</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">Workspace Etiquette</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 mb-3"><strong>Members agree to:</strong></p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm">
                    <li>Maintain a professional, respectful environment</li>
                    <li>Keep noise levels appropriate for a shared workspace</li>
                    <li>Use phone booths for calls (required in shared spaces)</li>
                    <li>Clean up after themselves in kitchen and common areas</li>
                    <li>Respect other members' workspace and privacy</li>
                    <li>Not conduct illegal activities on premises</li>
                    <li>Comply with all posted rules and staff instructions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Prohibited Activities */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <Ban className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Prohibited Activities</h2>
                
                <p className="text-gray-700 mb-4">
                  The following activities are strictly prohibited at Merritt Workspace:
                </p>

                <div className="space-y-2 text-gray-700">
                  <div className="flex items-start gap-3">
                    <span className="text-red-600 font-bold">✗</span>
                    <p>Harassment, discrimination, or threatening behavior toward any person</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-red-600 font-bold">✗</span>
                    <p>Use of illegal drugs or excessive alcohol consumption</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-red-600 font-bold">✗</span>
                    <p>Smoking or vaping anywhere inside the building</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-red-600 font-bold">✗</span>
                    <p>Bringing weapons of any kind onto the premises</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-red-600 font-bold">✗</span>
                    <p>Damaging property or equipment</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-red-600 font-bold">✗</span>
                    <p>Unauthorized access to other members' offices or belongings</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-red-600 font-bold">✗</span>
                    <p>Running illegal businesses or conducting illegal activities</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-red-600 font-bold">✗</span>
                    <p>Excessive noise or disruptive behavior</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-red-600 font-bold">✗</span>
                    <p>Sleeping or living in the workspace</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-red-600 font-bold">✗</span>
                    <p>Bringing pets (except service animals and with private office approval)</p>
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg border border-red-200 mt-4">
                  <p className="text-red-800 text-sm">
                    <strong>Warning:</strong> Violation of these rules may result in immediate 
                    termination of membership without refund.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Liability */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <Shield className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Liability and Insurance</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Limitation of Liability</h3>
                <p className="text-gray-700 mb-4">
                  Members use Merritt Workspace at their own risk. We are not liable for:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                  <li>Loss, theft, or damage to personal property</li>
                  <li>Injuries sustained on premises (except those caused by our negligence)</li>
                  <li>Data loss or technology failures</li>
                  <li>Business losses or interruptions</li>
                  <li>Acts of other members or third parties</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">Member Responsibilities</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                  <li>Members are responsible for securing their own belongings</li>
                  <li>Members must maintain adequate business insurance</li>
                  <li>Members are liable for any damage they cause to property</li>
                  <li>Members indemnify Merritt Workspace against claims arising from their use</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">Insurance Requirements</h3>
                <p className="text-gray-700">
                  While not required, we strongly recommend all members maintain general liability 
                  insurance for their business activities.
                </p>
              </div>
            </div>
          </div>

          {/* Termination */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Termination</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Cancellation by Member</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                  <li>Members may cancel with 30 days' written notice</li>
                  <li>Notice must be submitted by the 1st of the month</li>
                  <li>Final month's payment is required</li>
                  <li>Security deposit returned within 30 days (minus any damages)</li>
                  <li>Member must remove all belongings by final day</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">Termination by Merritt Workspace</h3>
                <p className="text-gray-700 mb-3">We may terminate membership immediately for:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                  <li>Non-payment of fees (after 10-day notice)</li>
                  <li>Violation of Terms of Service</li>
                  <li>Illegal activities</li>
                  <li>Harassment or threatening behavior</li>
                  <li>Damage to property</li>
                  <li>Repeated rule violations</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">Effects of Termination</h3>
                <p className="text-gray-700">
                  Upon termination, all access rights cease immediately. Members must return keycards 
                  and remove all belongings within 48 hours, or items may be disposed of.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Questions About These Terms?</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            
            <div className="space-y-2 text-gray-700">
              <p><strong>Merritt Workspace</strong></p>
              <p>2246 Irving Street</p>
              <p>Denver, CO 80211</p>
              <p className="mt-4">
                <strong>Email:</strong>{' '}
                <a href="mailto:legal@merrittworkspace.net" className="text-orange-600 hover:underline">
                  legal@merrittworkspace.net
                </a>
              </p>
              <p>
                <strong>Phone:</strong>{' '}
                <a href="tel:720-357-9499" className="text-orange-600 hover:underline">
                  (720) 357-9499
                </a>
              </p>
            </div>
          </div>

          {/* Back Link */}
          <div className="text-center mt-12">
            <Link 
              href="/" 
              className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium"
            >
              ← Back to Home
            </Link>
          </div>

        </div>
      </section>

      <Footer />
    </main>
  );
}