// app/privacy/page.tsx
"use client";

import { Shield, Lock, Eye, Mail, FileText, Users, AlertCircle } from 'lucide-react';
import Footer from "@/components/Footer";
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-blue-100 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Privacy Policy
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              Last Updated: January 1, 2025
            </p>
            <p className="text-lg text-gray-600">
              Your privacy is important to us. This policy explains how Merritt Workspace collects, 
              uses, and protects your personal information.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Introduction */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <FileText className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Merritt Workspace ("we," "our," or "us") operates a coworking space located at 
                  2246 Irving Street, Denver, CO 80211. We are committed to protecting your privacy 
                  and ensuring the security of your personal information.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  This Privacy Policy describes how we collect, use, disclose, and safeguard your 
                  information when you visit our facility, use our website, or engage with our services.
                </p>
              </div>
            </div>
          </div>

          {/* Information We Collect */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <Eye className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Information We Collect</h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Personal Information</h3>
                <p className="text-gray-700 mb-3">We may collect the following personal information:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                  <li><strong>Contact Information:</strong> Name, email address, phone number, business address</li>
                  <li><strong>Account Information:</strong> Username, password, membership preferences</li>
                  <li><strong>Payment Information:</strong> Credit card details, billing address (processed securely through Stripe)</li>
                  <li><strong>Business Information:</strong> Company name, job title, industry, LinkedIn profile</li>
                  <li><strong>Emergency Contact:</strong> Name, phone number, relationship</li>
                  <li><strong>Identification:</strong> Photo ID for security purposes</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">Usage Information</h3>
                <p className="text-gray-700 mb-3">We automatically collect certain information when you use our services:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                  <li>Building access logs (entry/exit times)</li>
                  <li>Meeting room bookings and usage</li>
                  <li>Snackshop purchases</li>
                  <li>Website usage data (IP address, browser type, pages visited)</li>
                  <li>Security camera footage (in common areas only)</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">Communications</h3>
                <p className="text-gray-700">
                  We collect information when you contact us via email, phone, or in person, 
                  including the content of your communications and any attachments.
                </p>
              </div>
            </div>
          </div>

          {/* How We Use Your Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <Users className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">How We Use Your Information</h2>
                
                <p className="text-gray-700 mb-4">We use your information for the following purposes:</p>
                
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Service Delivery</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                      <li>Process membership applications and manage accounts</li>
                      <li>Provide building access and security</li>
                      <li>Process meeting room bookings and payments</li>
                      <li>Fulfill snackshop orders</li>
                      <li>Provide customer support</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Communication</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                      <li>Send booking confirmations and receipts</li>
                      <li>Notify you about service updates or changes</li>
                      <li>Send community event invitations (with your consent)</li>
                      <li>Respond to your inquiries and requests</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Business Operations</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                      <li>Maintain building security and safety</li>
                      <li>Prevent fraud and unauthorized access</li>
                      <li>Comply with legal obligations</li>
                      <li>Improve our services and facilities</li>
                      <li>Analyze usage patterns and trends</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Information Sharing */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <Lock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Information Sharing and Disclosure</h2>
                
                <p className="text-gray-700 mb-4">
                  We do not sell, rent, or trade your personal information. We may share your 
                  information only in the following circumstances:
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <strong className="text-gray-900">Service Providers:</strong>
                      <span className="text-gray-700"> We use third-party services (Stripe for payments, Google for calendar, 
                      Resend for emails, Supabase for data storage) that may access your information to provide services on our behalf.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <strong className="text-gray-900">Legal Requirements:</strong>
                      <span className="text-gray-700"> We may disclose information if required by law, court order, or 
                      government authority, or to protect our rights, property, or safety.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <strong className="text-gray-900">Business Transfers:</strong>
                      <span className="text-gray-700"> In the event of a merger, acquisition, or sale of assets, 
                      your information may be transferred to the acquiring entity.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <strong className="text-gray-900">With Your Consent:</strong>
                      <span className="text-gray-700"> We may share information with third parties when you 
                      have given us explicit permission to do so.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Security */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Security</h2>
                
                <p className="text-gray-700 mb-4">
                  We implement appropriate technical and organizational measures to protect your 
                  personal information against unauthorized access, alteration, disclosure, or destruction:
                </p>

                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Encrypted data transmission (SSL/TLS)</li>
                  <li>Secure password storage with industry-standard hashing</li>
                  <li>Regular security audits and updates</li>
                  <li>Limited access to personal information (need-to-know basis)</li>
                  <li>Physical security measures (keycard access, security cameras)</li>
                  <li>PCI-compliant payment processing through Stripe</li>
                </ul>

                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mt-4">
                  <p className="text-amber-800 text-sm">
                    <strong>Note:</strong> While we strive to protect your information, no method of 
                    transmission over the internet or electronic storage is 100% secure. We cannot 
                    guarantee absolute security.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Your Rights */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Rights and Choices</h2>
                
                <p className="text-gray-700 mb-4">You have the following rights regarding your personal information:</p>

                <div className="space-y-3">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Access and Correction</h4>
                    <p className="text-gray-700 text-sm">
                      You can request access to your personal information and ask us to correct any inaccuracies.
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Data Portability</h4>
                    <p className="text-gray-700 text-sm">
                      You can request a copy of your personal information in a structured, commonly used format.
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Deletion</h4>
                    <p className="text-gray-700 text-sm">
                      You can request deletion of your personal information, subject to legal retention requirements.
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Marketing Communications</h4>
                    <p className="text-gray-700 text-sm">
                      You can opt out of marketing emails by clicking "unsubscribe" or contacting us directly.
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Account Deactivation</h4>
                    <p className="text-gray-700 text-sm">
                      You can request to deactivate your account at any time by contacting us.
                    </p>
                  </div>
                </div>

                <p className="text-gray-700 mt-4 text-sm">
                  To exercise any of these rights, please contact us at{' '}
                  <a href="mailto:privacy@merrittworkspace.net" className="text-blue-600 hover:underline font-medium">
                    privacy@merrittworkspace.net
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Data Retention */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Retention</h2>
            <p className="text-gray-700 mb-4">
              We retain your personal information for as long as necessary to provide our services 
              and comply with legal obligations:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>Active Members:</strong> Duration of membership plus 7 years for financial records</li>
              <li><strong>Booking Records:</strong> 7 years for tax and accounting purposes</li>
              <li><strong>Security Footage:</strong> 30-90 days unless needed for an investigation</li>
              <li><strong>Marketing Contacts:</strong> Until you unsubscribe or request deletion</li>
            </ul>
          </div>

          {/* Cookies and Tracking */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies and Tracking Technologies</h2>
            <p className="text-gray-700 mb-4">
              Our website uses cookies and similar technologies to improve your experience:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li><strong>Essential Cookies:</strong> Required for website functionality (login, shopping cart)</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our website</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="text-gray-700 text-sm">
              You can control cookies through your browser settings, but disabling some cookies may affect 
              website functionality.
            </p>
          </div>

          {/* Children's Privacy */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Children's Privacy</h2>
            <p className="text-gray-700">
              Our services are not directed to individuals under 18 years of age. We do not knowingly 
              collect personal information from children. If we learn that we have collected information 
              from a child without parental consent, we will delete it promptly.
            </p>
          </div>

          {/* Changes to Policy */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to This Privacy Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any material 
              changes by:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Posting the updated policy on our website with a new "Last Updated" date</li>
              <li>Sending an email notification to active members</li>
              <li>Displaying a notice in our facility</li>
            </ul>
            <p className="text-gray-700 mt-4">
              Your continued use of our services after changes are posted constitutes acceptance of 
              the updated policy.
            </p>
          </div>

          {/* Contact Section */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-8">
            <div className="flex items-start gap-4">
              <Mail className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
                <p className="text-gray-700 mb-4">
                  If you have any questions, concerns, or requests regarding this Privacy Policy or 
                  our data practices, please contact us:
                </p>
                
                <div className="space-y-2 text-gray-700">
                  <p><strong>Merritt Workspace</strong></p>
                  <p>2246 Irving Street</p>
                  <p>Denver, CO 80211</p>
                  <p className="mt-4">
                    <strong>Email:</strong>{' '}
                    <a href="mailto:privacy@merrittworkspace.net" className="text-blue-600 hover:underline">
                      privacy@merrittworkspace.net
                    </a>
                  </p>
                  <p>
                    <strong>Phone:</strong>{' '}
                    <a href="tel:303-359-8337" className="text-blue-600 hover:underline">
                      (303) 359-8337
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Back Link */}
          <div className="text-center mt-12">
            <Link 
              href="/" 
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
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