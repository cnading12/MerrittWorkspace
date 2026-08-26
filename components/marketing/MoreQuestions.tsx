import Link from 'next/link';
import { BUSINESS } from '@/lib/seo/business';

/**
 * The one-line replacement for the FAQ blocks that used to close every
 * membership and member-resource page.
 *
 * Each of those pages ended with four to six questions whose answers restated
 * what the page above had just spent several sections saying — the price, the
 * commitment, the trial day. A visitor who had read the page read it twice,
 * and the second pass was the less interesting one.
 *
 * The questions themselves are not gone: `/member-resources/faqs` still
 * renders every entry in `lib/seo/faqs.ts` along with the `FAQPage` structured
 * data for them, which is the page that should be carrying that markup anyway.
 * What each product page needs at the bottom is a door to it, not a copy of it.
 *
 * `hash` optionally deep-links to one entry on the FAQ page — the ids there
 * are the `id` fields from `lib/seo/faqs.ts` — so a café page lands a reader on
 * the café questions rather than at the top of the list.
 */
export default function MoreQuestions({
  lead = 'Still deciding?',
  hash,
  tone = 'plain',
}: {
  /** Opening clause, so the line can name what the page was about. */
  lead?: string;
  /** An FAQ id from lib/seo/faqs.ts, without the leading '#'. */
  hash?: string;
  tone?: 'plain' | 'alt';
}) {
  const href = hash ? `/member-resources/faqs#${hash}` : '/member-resources/faqs';

  return (
    <section className={tone === 'alt' ? 'mw-section-alt' : 'mw-section-rule'}>
      <div className="mw-container">
        <p className="max-w-2xl text-[17px] leading-relaxed text-ink-60">
          {lead}{' '}
          <Link href={href} className="mw-inline-link">
            Every question we get asked
          </Link>{' '}
          is answered in one place, or call or text{' '}
          <a href={BUSINESS.telephoneHref} className="mw-inline-link">
            {BUSINESS.telephoneDisplay}
          </a>{' '}
          and ask a person.
        </p>
      </div>
    </section>
  );
}
