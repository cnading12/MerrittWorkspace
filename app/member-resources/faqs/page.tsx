"use client";

import { useState } from 'react';
import Footer from "@/components/Footer";
import Link from 'next/link';
import PageHero from '@/components/marketing/PageHero';
import { BLUR } from '@/components/marketing/blur';
import FaqAnswer from '@/components/seo/FaqAnswer';
import { FAQS, FAQ_CATEGORIES, type FaqCategory } from '@/lib/seo/faqs';

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<string[]>([FAQS[0].id]);
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory | 'all'>('all');

  const toggleItem = (id: string) => {
    setOpenItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filteredFAQs =
    selectedCategory === 'all' ? FAQS : FAQS.filter(faq => faq.category === selectedCategory);

  return (
    <main className="bg-bone">
      <PageHero
        src="/images/amenities/kitchen-counter.webp"
        alt="A member working at the kitchen counter at Merritt Workspace in Sloan's Lake, Denver"
        blurDataURL={BLUR['amenities/kitchen-counter']}
        eyebrow="Answers"
        title={<>The questions people actually ask.</>}
        lead="Pricing, access, parking, pets, billing, WiFi, the flex space. If it isn't here, call us."
      />

      <section className="mw-section">
        <div className="mw-container">
          <div className="grid gap-12 md:grid-cols-12 md:gap-14">
            {/* Category filter — a sidebar on desktop, a scrolling row on phones. */}
            {/* min-w-0: a grid child defaults to min-width auto, which would let the
                scrolling filter row widen the page instead of scrolling. */}
            <aside className="min-w-0 md:col-span-3">
              <p className="mw-eyebrow mb-5">Browse</p>
              <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 md:mx-0 md:flex-col md:gap-0 md:overflow-visible md:px-0 md:pb-0">
                {FAQ_CATEGORIES.map(category => {
                  const active = selectedCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      aria-pressed={active}
                      className={`min-h-[44px] whitespace-nowrap border-b-2 px-3 text-left text-[15px] transition md:whitespace-normal md:border-b md:border-l-2 md:border-b-clay md:px-0 md:py-3 md:pl-4 ${
                        active
                          ? 'border-accent font-medium text-ink md:border-l-accent'
                          : 'border-transparent text-ink-60 hover:text-ink md:border-l-transparent'
                      }`}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Questions.
                Every answer is rendered into the markup and hidden with the
                `hidden` attribute when collapsed, rather than being mounted only
                on click. Visually identical, but it means the full text of all
                of them is present in the HTML a crawler or an AI assistant
                fetches — previously only the one open answer ever existed in the
                document, so the rest were invisible to everything except a
                person clicking. */}
            <div className="min-w-0 md:col-span-8 md:col-start-5">
              <div className="border-t border-clay">
                {filteredFAQs.map((faq) => {
                  const isOpen = openItems.includes(faq.id);
                  const panelId = `faq-answer-${faq.id}`;
                  return (
                    <div key={faq.id} id={faq.id} className="border-b border-clay scroll-mt-28">
                      <button
                        onClick={() => toggleItem(faq.id)}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        className="flex min-h-[44px] w-full items-start justify-between gap-6 py-6 text-left transition hover:opacity-70"
                      >
                        <h2 className="font-display text-xl font-semibold leading-snug tracking-tight text-ink md:text-2xl">
                          {faq.question}
                        </h2>
                        <span
                          aria-hidden="true"
                          className={`mt-1.5 shrink-0 text-2xl font-light leading-none text-ink-60 transition-transform duration-200 ${
                            isOpen ? 'rotate-45' : ''
                          }`}
                        >
                          +
                        </span>
                      </button>

                      <div
                        id={panelId}
                        hidden={!isOpen}
                        className="mw-legal max-w-2xl pb-7 text-[16px] leading-relaxed text-ink-60"
                      >
                        <FaqAnswer answer={faq.answer} id={faq.id} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredFAQs.length === 0 && (
                <p className="py-12 mw-body">No questions in this category yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Still have questions */}
      <section className="border-t border-clay bg-ink py-20 text-bone md:py-32">
        <div className="mw-container">
          <div className="max-w-3xl">
            <p className="mb-5 text-[12px] font-medium uppercase tracking-[0.18em] text-bone/60 md:text-[13px]">
              Still stuck
            </p>
            <h2 className="font-display text-[2rem] font-semibold leading-[1.02] tracking-tightest text-bone sm:text-4xl lg:text-[3.25rem]">
              Ask us directly.
            </h2>
            <p className="mt-7 max-w-2xl text-[17px] leading-relaxed text-bone/70 md:text-lg">
              Someone is on the other end of both of these. Email gets you a
              considered answer; the phone gets you a fast one.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <a
                href="mailto:memberservices@merrittworkspace.net"
                className="mw-btn bg-accent text-white hover:bg-accent-deep"
              >
                Email member services
              </a>
              <a
                href="tel:303-359-8337"
                className="mw-btn border border-bone/40 text-bone hover:bg-bone hover:text-ink"
              >
                Call (303) 359-8337
              </a>
            </div>
            <p className="mt-8 text-[15px] text-bone/60">
              Not a member yet?{' '}
              <Link href="/membership" className="border-b border-accent pb-0.5 text-bone hover:border-bone">
                See membership options
              </Link>.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
