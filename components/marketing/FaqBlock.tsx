import Link from 'next/link';
import FaqAnswer from '@/components/seo/FaqAnswer';
import FaqSchema from '@/components/seo/FaqSchema';
import { FAQS } from '@/lib/seo/faqs';

/**
 * A visible set of questions and answers, plus the `FAQPage` markup for them.
 *
 * Both halves ship together deliberately. FAQ structured data is only
 * legitimate when the page really shows the questions it claims — markup
 * describing content a visitor cannot see is the kind of thing that costs a
 * site its rich results. Binding the two into one component means a page can
 * never end up with one and not the other.
 *
 * Answers are always open, not behind an accordion: this block exists to be
 * read by people skimming for a number and by assistants fetching the page, and
 * neither benefits from a click.
 */
export default function FaqBlock({
  ids,
  id,
  eyebrow = 'Common questions',
  heading = 'The things people ask first.',
  tone = 'plain',
}: {
  /** FAQ ids from `lib/seo/faqs.ts`, rendered in the order given. */
  ids: string[];
  /** Absolute URL with a fragment, identifying this block in the graph. */
  id: string;
  eyebrow?: string;
  heading?: string;
  tone?: 'plain' | 'alt';
}) {
  // Preserve the caller's order rather than the order of the source array.
  const faqs = ids.map(faqId => FAQS.find(f => f.id === faqId)).filter((f): f is NonNullable<typeof f> => Boolean(f));
  if (faqs.length === 0) return null;

  return (
    <section className={tone === 'alt' ? 'mw-section-alt' : 'mw-section-rule'}>
      <div className="mw-container">
        <FaqSchema faqs={faqs} id={id} />

        <div className="max-w-2xl">
          <p className="mw-eyebrow mb-5">{eyebrow}</p>
          <h2 className="mw-h2">{heading}</h2>
        </div>

        <div className="mt-12 grid gap-x-14 gap-y-10 border-t border-clay pt-10 md:mt-16 md:grid-cols-2">
          {faqs.map(faq => (
            <div key={faq.id}>
              <h3 className="font-display text-xl font-semibold leading-snug tracking-tight text-ink md:text-2xl">
                {faq.question}
              </h3>
              <div className="mw-legal mt-4 text-[16px] leading-relaxed text-ink-60">
                <FaqAnswer answer={faq.answer} id={`${faq.id}-block`} />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-12 text-[15px] text-ink-60">
          <Link
            href="/member-resources/faqs"
            className="border-b border-accent pb-0.5 text-accent-deep transition hover:border-accent-deep"
          >
            Every question we get asked
          </Link>
          , or call{' '}
          <a href="tel:+17203579499" className="border-b border-clay pb-0.5 text-ink transition hover:border-ink">
            (720) 357-9499
          </a>
          .
        </p>
      </div>
    </section>
  );
}
