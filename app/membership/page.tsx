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
      'Snackshop access',
      'Event space access until 4:30 PM'
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
      '4 hours meeting room credits',
      'Mail handling service',
      'Phone booth priority',
      'Community events',
      'Pet-friendly (dogs welcome)',
      'Event space priority access'
    ],
    ideal_for: 'Small businesses and established professionals'
  },
  {
    id: 'private_office_large',
    name: 'Large Office',
    price: 1200,
    description: 'Spacious offices perfect for growing teams',
    features: [
      'Large private office space (300-500 sq ft)',
      'Professional business address',
      '24/7 building access',
      'High-speed WiFi',
      'Unlimited meeting room access',
      'Mail and package handling',
      'Dedicated phone line options',
      'Team collaboration space',
      'Priority event space booking',
      'Monthly snackshop credits',
      'Pet-friendly team space'
    ],
    ideal_for: 'Growing teams and established companies (4-8 people)'
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
                className={`bg-white rounded-xl shadow-lg border-2 overflow-hidden cursor-pointer transition hover:shadow-xl ${
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
                  
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-3">
                    <Link 
                      href={`/membership/${plan.id.replace('_', '-')}`}
                      className="w-full bg-burnt-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-burnt-orange-700 transition text-center block"
                    >
                      Learn More
                    </Link>
                    
                    {selectedPlan === plan.id && (
                      <div className="bg-burnt-orange-100 border border-burnt-orange-200 rounded-lg p-3">
                        <p className="text-burnt-orange-800 text-sm font-medium text-center">
                          ✓ Selected Plan
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-6">All memberships include a <strong>free trial day</strong> to experience the space.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowApplication(true)}
                className="bg-burnt-orange-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-burnt-orange-700 transition"
              >
                Apply for {selectedPlanDetails?.name || 'Membership'}
              </button>
              <Link href="/contact" className="border-2 border-burnt-orange-600 text-burnt-orange-600 px-8 py-4 rounded-lg font-semibold hover:bg-burnt-orange-600 hover:text-white transition">
                Schedule a Tour
              </Link>
            </div>
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

      <Footer />
    </div>
  );
}