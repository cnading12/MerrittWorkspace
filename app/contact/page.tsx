"use client";

import Footer from "@/components/Footer";
import Link from 'next/link';
import { useState } from 'react';
import { trackFormSubmission, trackPhoneClick, trackEmailClick } from '@/lib/gtag';
import PageHero from '@/components/marketing/PageHero';
import { BLUR } from '@/components/marketing/blur';

const INQUIRY_TYPES = [
  { value: 'general', label: 'General Information' },
  { value: 'trial_day', label: 'Book a Free Trial Day' },
  { value: 'tour', label: 'Schedule a Tour' },
  { value: 'membership', label: 'Membership Inquiry' },
  { value: 'meeting_room', label: 'Conference Room Booking' },
  { value: 'current_member', label: 'Current Member Support' },
  { value: 'other', label: 'Other' },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
    inquiry_type: 'general',
    website: '', // honeypot field - bots fill this, humans don't see it
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [formLoadedAt] = useState(() => Date.now());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          _t: formLoadedAt, // timestamp for timing validation
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message.');
      }

      trackFormSubmission();
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again or call us at (720) 357-9499.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <main className="bg-bone">
      <PageHero
        src="/images/exterior/signage.webp"
        alt="The Merritt Workspace building at 2246 Irving Street in Sloan's Lake, Denver"
        blurDataURL={BLUR['exterior/signage']}
        eyebrow="Contact"
        title={<>Come see it. Bring your laptop.</>}
        lead="2246 Irving Street, Sloan's Lake. Call, text, email or fill in the form. Someone here answers all four."
      />

      <section className="mw-section">
        <div className="mw-container">
          <div className="grid gap-14 md:grid-cols-12 md:gap-16">
            {/* Details */}
            <div className="md:col-span-4">
              <p className="mw-eyebrow mb-5">Find us</p>
              <h2 className="mw-h3">2246 Irving Street</h2>
              <p className="mt-2 mw-body">Denver, CO 80211</p>

              <dl className="mt-10 space-y-7 border-t border-clay pt-8">
                <div>
                  <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-60">Phone</dt>
                  <dd className="mt-1.5 text-[17px]">
                    <a href="tel:7203579499" onClick={trackPhoneClick} className="mw-inline-link">
                      (720) 357-9499
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-60">Email</dt>
                  <dd className="mt-1.5 text-[17px]">
                    <a
                      href="mailto:memberservices@merrittworkspace.net"
                      onClick={trackEmailClick}
                      className="mw-inline-link break-words"
                    >
                      memberservices@merrittworkspace.net
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-60">Member access</dt>
                  <dd className="mt-1.5 text-[17px] text-ink-60">24/7 by access code</dd>
                </div>
                <div>
                  <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-60">Parking</dt>
                  <dd className="mt-1.5 text-[17px] text-ink-60">Free, on site</dd>
                </div>
              </dl>

              <div className="mt-10 border-t border-clay pt-8">
                <p className="mw-eyebrow mb-4">Quick actions</p>
                <div className="space-y-3">
                  <Link href="/membership/apply" className="block text-[16px] text-ink-60 transition hover:text-ink">
                    Apply for membership
                  </Link>
                  <Link href="/member-resources/meeting-rooms" className="block text-[16px] text-ink-60 transition hover:text-ink">
                    Book a conference room
                  </Link>
                  <Link href="/member-resources/snackshop" className="block text-[16px] text-ink-60 transition hover:text-ink">
                    Order from the snackshop
                  </Link>
                  <a
                    href="https://maps.google.com/?q=2246+Irving+Street,+Denver,+CO+80211"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[16px] text-ink-60 transition hover:text-ink"
                  >
                    Get directions
                  </a>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="md:col-span-7 md:col-start-6">
              <p className="mw-eyebrow mb-5">Send a message</p>

              {submitted ? (
                <div className="border-t border-clay pt-10">
                  <h2 className="mw-h3">Message sent.</h2>
                  <p className="mt-4 mw-body">
                    Thanks for reaching out. We&rsquo;ll come back to you within
                    24 hours. If it&rsquo;s urgent, call or text{' '}
                    <a href="tel:7203579499" className="mw-inline-link">(720) 357-9499</a>.
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
                        inquiry_type: 'general',
                        website: '',
                      });
                    }}
                    className="mw-link mt-8"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-7 border-t border-clay pt-10">
                  {/* Honeypot field - hidden from humans, bots will fill it */}
                  <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }}>
                    <label htmlFor="website">Website</label>
                    <input
                      type="text"
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  <div>
                    <label htmlFor="inquiry_type" className="mw-label">
                      What can we help you with?
                    </label>
                    <select
                      id="inquiry_type"
                      name="inquiry_type"
                      value={formData.inquiry_type}
                      onChange={handleInputChange}
                      className="mw-input"
                    >
                      {INQUIRY_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-7 md:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="mw-label">Full name *</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="mw-input"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="mw-label">Email *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        className="mw-input"
                      />
                    </div>
                  </div>

                  <div className="grid gap-7 md:grid-cols-2">
                    <div>
                      <label htmlFor="phone" className="mw-label">Phone</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="mw-input"
                      />
                    </div>
                    <div>
                      <label htmlFor="company" className="mw-label">Company</label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="mw-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="mw-label">Message *</label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleInputChange}
                      className="mw-input resize-y"
                    />
                  </div>

                  {error && (
                    <p className="border-l-2 border-accent pl-4 text-[15px] leading-relaxed text-ink">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mw-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? 'Sending message…' : 'Send message'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="mw-section-rule">
        <div className="mw-container">
          <div className="max-w-2xl">
            <p className="mw-eyebrow mb-5">The block</p>
            <h2 className="mw-h2">Next to the landmark Merritt building.</h2>
            <p className="mt-6 mw-body">
              23rd and Irving, in the heart of Sloan&rsquo;s Lake, three minutes to
              I-25 and a walk from the park.
            </p>
          </div>
          <div className="mt-12 h-[360px] w-full border border-clay md:mt-16 md:h-[460px]">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3067.4953180826856!2d-105.03225422342487!3d39.75098609588881!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x876c7932ec70db2b%3A0x8c38dd4cf4df270d!2sMerritt%20Workspace!5e0!3m2!1sen!2sus!4v1759948992207!5m2!1sen!2sus"
              width="100%"
              height="100%"
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
