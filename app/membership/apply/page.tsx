"use client";

import { useState } from 'react';
import { CheckCircle, AlertCircle, Loader2, User, Briefcase, Calendar, Phone, Mail, Shield, Plus, X } from 'lucide-react';
import Footer from "@/components/Footer";
import Link from 'next/link';

interface CreditReference {
  id: string;
  institution_name: string;
  account_type: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  account_number_partial: string;
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
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company_name: string;
  job_title: string;
  industry: string;
  linkedin_url?: string;
  website_url?: string;
  membership_type: 'dedicated_desk' | 'private_office_small' | 'private_office_large';
  start_date: string;
  referral_source: string;
  work_style: string[];
  meeting_frequency: 'rarely' | 'monthly' | 'weekly' | 'daily';
  team_size: number;
  special_requirements?: string;
  credit_references: CreditReference[];
  past_leases: PastLease[];
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  agrees_to_terms: boolean;
  agrees_to_background_check: boolean;
  marketing_consent: boolean;
}

const membershipPlans = [
  {
    id: 'dedicated_desk',
    name: 'Dedicated Desk',
    price: 300,
    description: 'Your own workspace in our collaborative environment'
  },
  {
    id: 'private_office_small',
    name: 'Private Office',
    price: 600,
    description: 'Complete privacy for individuals or small teams'
  },
  {
    id: 'private_office_large',
    name: 'Large Office',
    price: 1200,
    description: 'Spacious offices perfect for growing teams (4-8 people)'
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

export default function MembershipApplicationPage() {
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

  const handleWorkStyleChange = (style: string, checked: boolean) => {
    setApplication(prev => ({
      ...prev,
      work_style: checked 
        ? [...prev.work_style, style]
        : prev.work_style.filter(s => s !== style)
    }));
  };

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
      const applicationData = {
        ...application,
        id: `APP-${Date.now()}`,
        status: 'pending_review',
        submitted_at: new Date().toISOString()
      };

      console.log('Submitting membership application:', applicationData);
      
      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 2500));

      setSuccess(`Thank you ${application.first_name}! Your membership application has been submitted successfully. You'll receive a confirmation email shortly, and our team will contact you within 1-2 business days to schedule your complimentary workspace tour.`);
      
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

  const selectedPlanDetails = membershipPlans.find(plan => plan.id === application.membership_type);

  if (success) {
    return (
      <main className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
            <p className="text-gray-700 leading-relaxed">{success}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/membership" className="bg-burnt-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-burnt-orange-700 transition">
              View Membership Options
            </Link>
            <Link href="/" className="border-2 border-burnt-orange-600 text-burnt-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-burnt-orange-600 hover:text-white transition">
              Back to Homepage
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-burnt-orange-50 to-burnt-orange-100 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Apply for Membership
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Join our community of professionals in the heart of Sloan's Lake. 
            Complete your application below to get started.
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Free trial day included</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>No long-term contracts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>1-2 day response time</span>
            </div>
          </div>
        </div>
      </section>

      {/* Alert Messages */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Application Form */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmitApplication} className="space-y-8">
            {/* Selected Plan Summary */}
            {selectedPlanDetails && (
              <div className="bg-burnt-orange-50 p-6 rounded-xl border border-burnt-orange-200">
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <User className="w-6 h-6 text-burnt-orange-600" />
                <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>
              </div>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Briefcase className="w-6 h-6 text-burnt-orange-600" />
                <h3 className="text-xl font-semibold text-gray-900">Professional Information</h3>
              </div>
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

            {/* Membership Preferences */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="w-6 h-6 text-burnt-orange-600" />
                <h3 className="text-xl font-semibold text-gray-900">Membership Preferences</h3>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Membership Type *</label>
                  <div className="grid md:grid-cols-3 gap-4">
                    {membershipPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                          application.membership_type === plan.id
                            ? 'border-burnt-orange-500 bg-burnt-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setApplication(prev => ({ ...prev, membership_type: plan.id as any }))}
                      >
                        <h4 className="font-semibold text-gray-900 mb-1">{plan.name}</h4>
                        <p className="text-2xl font-bold text-burnt-orange-600 mb-2">${plan.price}/mo</p>
                        <p className="text-sm text-gray-600">{plan.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

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
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Phone className="w-6 h-6 text-burnt-orange-600" />
                <h3 className="text-xl font-semibold text-gray-900">Emergency Contact</h3>
              </div>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-burnt-orange-600" />
                <h3 className="text-xl font-semibold text-gray-900">Agreements</h3>
              </div>
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
            <div className="pt-6">
              <button
                type="submit"
                disabled={submitting || !application.agrees_to_terms || !application.agrees_to_background_check}
                className="w-full bg-burnt-orange-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-burnt-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
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
      </section>

      <Footer />
    </main>
  );
}