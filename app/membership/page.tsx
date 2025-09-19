"use client";

import { useState } from 'react';
import { MapPin, Wifi, Shield, Phone, Monitor, Coffee, Users, Calendar, CheckCircle, AlertCircle, Loader2, Star, Clock, Building2 } from 'lucide-react';
import Footer from '@/components/Footer';
import Link from 'next/link';

interface CreditReference {
  id: string;
  institution_name: string;
  account_type: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  account_number_partial: string; // Last 4 digits only
  relationship_length: string;
}

interface PastLease {
  id: string;
  property_name: string;
  property_address: string;
  landlord_name: string;
  landlord_phone: string;
  landlord_email: string;
  lease_start_date: string;
  lease_end_date: string;
  monthly_rent: number;
  reason_for_leaving: string;
}

interface MembershipApplication {
  // Personal Information
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  
  // Professional Information
  company_name: string;
  job_title: string;
  industry: string;
  linkedin_url?: string;
  website_url?: string;
  
  // Membership Details
  membership_type: 'dedicated_desk' | 'private_office_small' | 'private_office_large';
  start_date: string;
  referral_source: string;
  
  // Preferences and Requirements
  work_style: string[];
  meeting_frequency: 'rarely' | 'monthly' | 'weekly' | 'daily';
  team_size: number;
  special_requirements?: string;
  
  // Financial Information
  credit_references: CreditReference[];
  past_leases: PastLease[];
  
  // Emergency Contact
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  
  // Agreement
  agrees_to_terms: boolean;
  agrees_to_background_check: boolean;
  marketing_consent: boolean;
}

const membershipPlans = [
  {
    id: 'dedicated_desk',
    name: 'Dedicated Desk',
    price: 300,
    description: 'Your own workspace in our collaborative environment',
    features: [
      '24/7 access to workspace',
      'Dedicated desk with storage',
      'High-speed WiFi',
      'Access to common areas',
      'Phone booth usage',
      'Community events',
      'Snackshop access'
    ],
    ideal_for: 'Freelancers, consultants, and remote workers'
  },
  {
    id: 'private_office_small',
    name: 'Private Office',
    price: 600,
    description: 'Complete privacy for individuals or small teams',
    features: [
      'Private lockable office',
      'Professional business address',
      '24/7 building access',
      'High-speed WiFi',
      'Meeting room credits',
      'Mail handling service',
      'Phone booth priority',
      'Community events',
      'Snackshop access'
    ],
    ideal_for: 'Small businesses and established professionals'
  },
  {
    id: 'private_office_large',
    name: 'Large Office',
    price: 1200,
    description: 'Spacious offices perfect for growing teams',
    features: [
      'Large private office space',
      'Professional business address',
      '24/7 building access',
      'High-speed WiFi',
      'Unlimited meeting room access',
      'Mail and package handling',
      'Dedicated phone line option',
      'Team collaboration space',
      'Priority community events',
      'Snackshop credit included'
    ],
    ideal_for: 'Growing teams and established companies'
  }
];

const workStyleOptions = [
  'Quiet focused work',
  'Collaborative projects',
  'Client meetings',
  'Phone calls',
  'Video conferences',
  'Creative brainstorming',
  'Networking'
];

const industryOptions = [
  'Technology',
  'Consulting',
  'Marketing/Advertising',
  'Finance',
  'Healthcare',
  'Legal',
  'Real Estate',
  'Education',
  'Non-profit',
  'Creative Services',
  'Other'
];

const referralSources = [
  'Google Search',
  'Social Media',
  'Member Referral',
  'Website',
  'Walking by',
  'Networking Event',
  'Online Review',
  'Other'
];

export default function MembershipPage() {
  const [selectedPlan, setSelectedPlan] = useState<string>('dedicated_desk');
  const [showApplication, setShowApplication] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [application, setApplication] = useState<MembershipApplication>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    job_title: '',
    industry: '',
    linkedin_url: '',
    website_url: '',
    membership_type: 'dedicated_desk',
    start_date: '',
    referral_source: '',
    work_style: [],
    meeting_frequency: 'monthly',
    team_size: 1,
    special_requirements: '',
    credit_references: [{
      id: '1',
      institution_name: '',
      account_type: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      account_number_partial: '',
      relationship_length: ''
    }],
    past_leases: [],
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    agrees_to_terms: false,
    agrees_to_background_check: false,
    marketing_consent: false
  });

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    setApplication(prev => ({ 
      ...prev, 
      membership_type: planId as MembershipApplication['membership_type']
    }));
  };

  const handleWorkStyleChange = (style: string, checked: boolean) => {
    setApplication(prev => ({
      ...prev,
      work_style: checked 
        ? [...prev.work_style, style]
        : prev.work_style.filter(s => s !== style)
    }));
  };

  // Credit Reference Management
  const addCreditReference = () => {
    const newRef: CreditReference = {
      id: Date.now().toString(),
      institution_name: '',
      account_type: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      account_number_partial: '',
      relationship_length: ''
    };
    setApplication(prev => ({
      ...prev,
      credit_references: [...prev.credit_references, newRef]
    }));
  };

  const removeCreditReference = (id: string) => {
    setApplication(prev => ({
      ...prev,
      credit_references: prev.credit_references.filter(ref => ref.id !== id)
    }));
  };

  const updateCreditReference = (id: string, field: keyof CreditReference, value: string) => {
    setApplication(prev => ({
      ...prev,
      credit_references: prev.credit_references.map(ref =>
        ref.id === id ? { ...ref, [field]: value } : ref
      )
    }));
  };

  // Past Lease Management
  const addPastLease = () => {
    const newLease: PastLease = {
      id: Date.now().toString(),
      property_name: '',
      property_address: '',
      landlord_name: '',
      landlord_phone: '',
      landlord_email: '',
      lease_start_date: '',
      lease_end_date: '',
      monthly_rent: 0,
      reason_for_leaving: ''
    };
    setApplication(prev => ({
      ...prev,
      past_leases: [...prev.past_leases, newLease]
    }));
  };

  const removePastLease = (id: string) => {
    setApplication(prev => ({
      ...prev,
      past_leases: prev.past_leases.filter(lease => lease.id !== id)
    }));
  };

  const updatePastLease = (id: string, field: keyof PastLease, value: string | number) => {
    setApplication(prev => ({
      ...prev,
      past_leases: prev.past_leases.map(lease =>
        lease.id === id ? { ...lease, [field]: value } : lease
      )
    }));
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!application.agrees_to_terms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    if (!application.agrees_to_background_check) {
      setError('Background check consent is required for membership');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // In production, this would integrate with your API
      const applicationData = {
        ...application,
        id: `APP-${Date.now()}`,
        status: 'pending_review',
        submitted_at: new Date().toISOString()
      };

      console.log('Submitting membership application:', applicationData);
      
      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Show success message
      setSuccess(`Thank you ${application.first_name}! Your membership application has been submitted successfully. You'll receive a confirmation email shortly, and our team will contact you within 1-2 business days to schedule your complimentary workspace tour.`);
      
      setShowApplication(false);
      
      // Reset form
      setApplication({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company_name: '',
        job_title: '',
        industry: '',
        linkedin_url: '',
        website_url: '',
        membership_type: 'dedicated_desk',
        start_date: '',
        referral_source: '',
        work_style: [],
        meeting_frequency: 'monthly',
        team_size: 1,
        special_requirements: '',
        credit_references: [{
          id: '1',
          institution_name: '',
          account_type: '',
          contact_name: '',
          contact_phone: '',
          contact_email: '',
          account_number_partial: '',
          relationship_length: ''
        }],
        past_leases: [],
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relationship: '',
        agrees_to_terms: false,
        agrees_to_background_check: false,
        marketing_consent: false
      });

    } catch (error) {
      console.error('Error submitting application:', error);
      setError('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPlanDetails = membershipPlans.find(plan => plan.id === selectedPlan);

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-burnt-orange-50 to-burnt-orange-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Join Our Community
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Experience premium workspace in the heart of Sloan's Lake. Choose from dedicated desks to private offices, 
              all with our distinctive burnt orange floors and collaborative atmosphere.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowApplication(true)}
                className="bg-burnt-orange-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-burnt-orange-700 transition"
              >
                Apply for Membership
              </button>
              <Link href="/contact" className="border-2 border-burnt-orange-600 text-burnt-orange-600 px-8 py-4 rounded-lg font-semibold hover:bg-burnt-orange-600 hover:text-white transition">
                Schedule a Tour
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mx-4 mt-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mx-4 mt-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <p className="text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Membership Plans */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Choose Your Membership</h2>
            <p className="text-xl text-gray-600">Find the perfect workspace solution for your needs</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {membershipPlans.map((plan) => (
              <div 
                key={plan.id}
                className={`bg-white rounded-xl shadow-lg border-2 overflow-hidden cursor-pointer transition ${
                  selectedPlan === plan.id ? 'border-burnt-orange-500 ring-2 ring-burnt-orange-200' : 'border-gray-200'
                }`}
                onClick={() => handlePlanSelect(plan.id)}
              >
                <div className={`p-6 text-center ${selectedPlan === plan.id ? 'bg-burnt-orange-50' : 'bg-gray-50'}`}>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold text-burnt-orange-600 mb-2">
                    ${plan.price}<span className="text-lg text-gray-500">/month</span>
                  </div>
                  <p className="text-gray-600 text-sm">{plan.ideal_for}</p>
                </div>

                <div className="p-6">
                  <p className="text-gray-700 mb-4">{plan.description}</p>
                  
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedPlan === plan.id && (
                  <div className="px-6 pb-6">
                    <div className="bg-burnt-orange-100 border border-burnt-orange-200 rounded-lg p-3">
                      <p className="text-burnt-orange-800 text-sm font-medium text-center">
                        ✓ Selected Plan
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-600 mb-4">All memberships include a <strong>free trial day</strong> to experience the space.</p>
            <button
              onClick={() => setShowApplication(true)}
              className="bg-burnt-orange-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-burnt-orange-700 transition"
            >
              Apply for {selectedPlanDetails?.name || 'Membership'}
            </button>
          </div>
        </div>
      </section>

      {/* Why Choose Merritt */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Choose Merritt Workspace?</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Prime Location</h3>
              <p className="text-gray-600">Heart of Sloan's Lake, 3 minutes to I-25. Walk, bike, or drive to work easily.</p>
            </div>
            
            <div className="text-center">
              <Building2 className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Historic Character</h3>
              <p className="text-gray-600">Beautifully restored space with distinctive burnt orange floors and unique charm.</p>
            </div>
            
            <div className="text-center">
              <Users className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Vibrant Community</h3>
              <p className="text-gray-600">Network with entrepreneurs, freelancers, and small businesses in a supportive environment.</p>
            </div>
            
            <div className="text-center">
              <Shield className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Secure & Professional</h3>
              <p className="text-gray-600">24/7 monitored building with professional atmosphere and business address services.</p>
            </div>
            
            <div className="text-center">
              <Calendar className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Flexible Terms</h3>
              <p className="text-gray-600">No long-term lease required. Month-to-month flexibility for your changing needs.</p>
            </div>
            
            <div className="text-center">
              <Coffee className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Full-Service Amenities</h3>
              <p className="text-gray-600">On-site snackshop, meeting rooms, high-speed WiFi, and everything you need to be productive.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Application Process */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Simple Application Process</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-burnt-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-burnt-orange-600">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Apply Online</h3>
              <p className="text-gray-600">Complete our simple application form with your details and preferences</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-burnt-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-burnt-orange-600">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Schedule Tour</h3>
              <p className="text-gray-600">We'll contact you within 1-2 days to schedule your complimentary tour</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-burnt-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-burnt-orange-600">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Free Trial Day</h3>
              <p className="text-gray-600">Experience our workspace with a full complimentary trial day</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-burnt-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-burnt-orange-600">4</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Move In!</h3>
              <p className="text-gray-600">Complete membership setup and start enjoying your new workspace</p>
            </div>
          </div>
        </div>
      </section>

      {/* Application Modal */}
      {showApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Membership Application</h2>
                <button
                  onClick={() => setShowApplication(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <AlertCircle className="w-6 h-6 rotate-45" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitApplication} className="p-6 space-y-8">
              {/* Selected Plan Summary */}
              {selectedPlanDetails && (
                <div className="bg-burnt-orange-50 p-4 rounded-lg border border-burnt-orange-200">
                  <h3 className="font-semibold text-burnt-orange-900 mb-2">Selected Membership</h3>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{selectedPlanDetails.name}</span>
                      <p className="text-sm text-burnt-orange-700">{selectedPlanDetails.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-burnt-orange-600">
                        ${selectedPlanDetails.price}/mo
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                    <input
                      type="text"
                      required
                      value={application.first_name}
                      onChange={(e) => setApplication(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={application.last_name}
                      onChange={(e) => setApplication(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={application.email}
                      onChange={(e) => setApplication(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={application.phone}
                      onChange={(e) => setApplication(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                    <input
                      type="text"
                      required
                      value={application.company_name}
                      onChange={(e) => setApplication(prev => ({ ...prev, company_name: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Job Title *</label>
                    <input
                      type="text"
                      required
                      value={application.job_title}
                      onChange={(e) => setApplication(prev => ({ ...prev, job_title: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Industry *</label>
                    <select
                      required
                      value={application.industry}
                      onChange={(e) => setApplication(prev => ({ ...prev, industry: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    >
                      <option value="">Select Industry</option>
                      {industryOptions.map(industry => (
                        <option key={industry} value={industry}>{industry}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn URL</label>
                    <input
                      type="url"
                      value={application.linkedin_url}
                      onChange={(e) => setApplication(prev => ({ ...prev, linkedin_url: e.target.value }))}
                      placeholder="https://linkedin.com/in/yourprofile"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
                    <input
                      type="url"
                      value={application.website_url}
                      onChange={(e) => setApplication(prev => ({ ...prev, website_url: e.target.value }))}
                      placeholder="https://yourcompany.com"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Credit References */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit References</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Please provide at least one credit reference from a bank, credit union, or other financial institution. This helps us process your application efficiently.
                </p>

                <div className="space-y-6">
                  {application.credit_references.map((reference, index) => (
                    <div key={reference.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900">Credit Reference {index + 1}</h4>
                        {application.credit_references.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCreditReference(reference.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Institution Name *</label>
                          <input
                            type="text"
                            required={index === 0}
                            value={reference.institution_name}
                            onChange={(e) => updateCreditReference(reference.id, 'institution_name', e.target.value)}
                            placeholder="e.g., Wells Fargo, Chase Bank"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Account Type *</label>
                          <select
                            required={index === 0}
                            value={reference.account_type}
                            onChange={(e) => updateCreditReference(reference.id, 'account_type', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                          >
                            <option value="">Select Account Type</option>
                            <option value="Checking Account">Checking Account</option>
                            <option value="Savings Account">Savings Account</option>
                            <option value="Business Account">Business Account</option>
                            <option value="Credit Card">Credit Card</option>
                            <option value="Line of Credit">Line of Credit</option>
                            <option value="Auto Loan">Auto Loan</option>
                            <option value="Mortgage">Mortgage</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                          <input
                            type="text"
                            value={reference.contact_name}
                            onChange={(e) => updateCreditReference(reference.id, 'contact_name', e.target.value)}
                            placeholder="Branch manager or representative"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone *</label>
                          <input
                            type="tel"
                            required={index === 0}
                            value={reference.contact_phone}
                            onChange={(e) => updateCreditReference(reference.id, 'contact_phone', e.target.value)}
                            placeholder="Main branch number or direct line"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                          <input
                            type="email"
                            value={reference.contact_email}
                            onChange={(e) => updateCreditReference(reference.id, 'contact_email', e.target.value)}
                            placeholder="Representative email if available"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Account # (Last 4 digits)</label>
                          <input
                            type="text"
                            maxLength={4}
                            value={reference.account_number_partial}
                            onChange={(e) => updateCreditReference(reference.id, 'account_number_partial', e.target.value.replace(/\D/g, ''))}
                            placeholder="1234"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Relationship Length *</label>
                          <select
                            required={index === 0}
                            value={reference.relationship_length}
                            onChange={(e) => updateCreditReference(reference.id, 'relationship_length', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                          >
                            <option value="">How long have you banked with them?</option>
                            <option value="Less than 6 months">Less than 6 months</option>
                            <option value="6 months to 1 year">6 months to 1 year</option>
                            <option value="1-2 years">1-2 years</option>
                            <option value="2-5 years">2-5 years</option>
                            <option value="5+ years">5+ years</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addCreditReference}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-burnt-orange-300 hover:text-burnt-orange-600 transition"
                  >
                    + Add Another Credit Reference
                  </button>
                </div>
              </div>

              {/* Past Leases */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Past Commercial/Office Leases (Optional)</h3>
                <p className="text-sm text-gray-600 mb-4">
                  If you've had previous commercial office or coworking space arrangements, please provide details. This is helpful but not required.
                </p>

                <div className="space-y-6">
                  {application.past_leases.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">No previous commercial leases to add</p>
                      <button
                        type="button"
                        onClick={addPastLease}
                        className="bg-burnt-orange-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-burnt-orange-700 transition"
                      >
                        Add Past Lease
                      </button>
                    </div>
                  ) : (
                    <>
                      {application.past_leases.map((lease, index) => (
                        <div key={lease.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-gray-900">Past Lease {index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => removePastLease(lease.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Property/Building Name</label>
                              <input
                                type="text"
                                value={lease.property_name}
                                onChange={(e) => updatePastLease(lease.id, 'property_name', e.target.value)}
                                placeholder="e.g., Downtown Business Center"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Property Address</label>
                              <input
                                type="text"
                                value={lease.property_address}
                                onChange={(e) => updatePastLease(lease.id, 'property_address', e.target.value)}
                                placeholder="Full address"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Landlord/Property Manager</label>
                              <input
                                type="text"
                                value={lease.landlord_name}
                                onChange={(e) => updatePastLease(lease.id, 'landlord_name', e.target.value)}
                                placeholder="Contact person name"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Landlord Phone</label>
                              <input
                                type="tel"
                                value={lease.landlord_phone}
                                onChange={(e) => updatePastLease(lease.id, 'landlord_phone', e.target.value)}
                                placeholder="Contact phone number"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Landlord Email</label>
                              <input
                                type="email"
                                value={lease.landlord_email}
                                onChange={(e) => updatePastLease(lease.id, 'landlord_email', e.target.value)}
                                placeholder="Contact email"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Rent</label>
                              <input
                                type="number"
                                min="0"
                                value={lease.monthly_rent || ''}
                                onChange={(e) => updatePastLease(lease.id, 'monthly_rent', parseFloat(e.target.value) || 0)}
                                placeholder="Amount paid per month"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Lease Start Date</label>
                              <input
                                type="date"
                                value={lease.lease_start_date}
                                onChange={(e) => updatePastLease(lease.id, 'lease_start_date', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Lease End Date</label>
                              <input
                                type="date"
                                value={lease.lease_end_date}
                                onChange={(e) => updatePastLease(lease.id, 'lease_end_date', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Leaving</label>
                              <textarea
                                rows={2}
                                value={lease.reason_for_leaving}
                                onChange={(e) => updatePastLease(lease.id, 'reason_for_leaving', e.target.value)}
                                placeholder="Brief explanation of why you left this location"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={addPastLease}
                        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-burnt-orange-300 hover:text-burnt-orange-600 transition"
                      >
                        + Add Another Past Lease
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Workspace Preferences */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Workspace Preferences</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Start Date *</label>
                    <input
                      type="date"
                      required
                      value={application.start_date}
                      onChange={(e) => setApplication(prev => ({ ...prev, start_date: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Work Style (select all that apply)</label>
                    <div className="grid md:grid-cols-2 gap-2">
                      {workStyleOptions.map(style => (
                        <label key={style} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={application.work_style.includes(style)}
                            onChange={(e) => handleWorkStyleChange(style, e.target.checked)}
                            className="mr-2 h-4 w-4 text-burnt-orange-600 rounded focus:ring-burnt-orange-500"
                          />
                          <span className="text-sm text-gray-700">{style}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Frequency</label>
                      <select
                        value={application.meeting_frequency}
                        onChange={(e) => setApplication(prev => ({ ...prev, meeting_frequency: e.target.value as any }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                      >
                        <option value="rarely">Rarely</option>
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="daily">Daily</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Team Size</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={application.team_size}
                        onChange={(e) => setApplication(prev => ({ ...prev, team_size: parseInt(e.target.value) || 1 }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">How did you hear about us? *</label>
                    <select
                      required
                      value={application.referral_source}
                      onChange={(e) => setApplication(prev => ({ ...prev, referral_source: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    >
                      <option value="">Select source</option>
                      {referralSources.map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Special Requirements or Accessibility Needs</label>
                    <textarea
                      rows={3}
                      value={application.special_requirements}
                      onChange={(e) => setApplication(prev => ({ ...prev, special_requirements: e.target.value }))}
                      placeholder="Any specific needs or accommodations..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      required
                      value={application.emergency_contact_name}
                      onChange={(e) => setApplication(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={application.emergency_contact_phone}
                      onChange={(e) => setApplication(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Relationship *</label>
                    <input
                      type="text"
                      required
                      value={application.emergency_contact_relationship}
                      onChange={(e) => setApplication(prev => ({ ...prev, emergency_contact_relationship: e.target.value }))}
                      placeholder="e.g., Spouse, Parent, Friend"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Agreements */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Agreements</h3>
                <div className="space-y-4">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={application.agrees_to_terms}
                      onChange={(e) => setApplication(prev => ({ ...prev, agrees_to_terms: e.target.checked }))}
                      className="mt-1 mr-3 h-4 w-4 text-burnt-orange-600 rounded focus:ring-burnt-orange-500"
                    />
                    <div className="text-sm">
                      <span className="text-gray-700">I agree to the </span>
                      <a href="/terms" target="_blank" className="text-burnt-orange-600 underline">Terms of Service</a>
                      <span className="text-gray-700"> and </span>
                      <a href="/privacy" target="_blank" className="text-burnt-orange-600 underline">Privacy Policy</a>
                      <span className="text-red-500"> *</span>
                    </div>
                  </label>
                  
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={application.agrees_to_background_check}
                      onChange={(e) => setApplication(prev => ({ ...prev, agrees_to_background_check: e.target.checked }))}
                      className="mt-1 mr-3 h-4 w-4 text-burnt-orange-600 rounded focus:ring-burnt-orange-500"
                    />
                    <div className="text-sm text-gray-700">
                      I consent to a background check as part of the membership approval process <span className="text-red-500">*</span>
                    </div>
                  </label>
                  
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={application.marketing_consent}
                      onChange={(e) => setApplication(prev => ({ ...prev, marketing_consent: e.target.checked }))}
                      className="mt-1 mr-3 h-4 w-4 text-burnt-orange-600 rounded focus:ring-burnt-orange-500"
                    />
                    <div className="text-sm text-gray-700">
                      I would like to receive updates about community events and workspace news
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={submitting || !application.agrees_to_terms || !application.agrees_to_background_check}
                  className="w-full bg-burnt-orange-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-burnt-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Submitting Application...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </button>
                
                <p className="text-sm text-gray-600 text-center mt-4">
                  By submitting this application, you acknowledge that all information provided is accurate and complete.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}