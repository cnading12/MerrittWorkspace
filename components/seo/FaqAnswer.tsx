import Link from 'next/link';
import { BUSINESS, SITE_URL } from '@/lib/seo/business';

/**
 * Renders a plain-text FAQ answer as styled markup.
 *
 * The answers in `lib/seo/faqs.ts` are deliberately plain: the same string has
 * to work as visible page copy, as `acceptedAnswer.text` in FAQPage markup, and
 * as a line in `/llms.txt`. This turns that one string into the page version —
 * paragraphs, bullet lists, and live links for the addresses and URLs that are
 * written out longhand so they survive being quoted somewhere else.
 */

const EMAIL = BUSINESS.email;
const PHONE = BUSINESS.telephoneDisplay;
const HOST = SITE_URL.replace('https://', '');

// Email, phone, and bare site URLs, in one pass so the pieces stay in order.
const PATTERN = new RegExp(
  `(${EMAIL.replace(/\./g, '\\.')})|(${PHONE.replace(/[()]/g, '\\$&')})|(${HOST.replace(/\./g, '\\.')}[a-zA-Z0-9/\\-]*)`,
  'g'
);

function linkify(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(PATTERN.source, 'g');

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const key = `${keyPrefix}-${match.index}`;

    if (match[1]) {
      out.push(
        <a key={key} href={`mailto:${match[1]}`} className="text-accent-deep underline">
          {match[1]}
        </a>
      );
    } else if (match[2]) {
      out.push(
        <a key={key} href={BUSINESS.telephoneHref} className="text-accent-deep underline">
          {match[2]}
        </a>
      );
    } else if (match[3]) {
      const path = match[3].slice(HOST.length) || '/';
      out.push(
        <Link key={key} href={path} className="text-accent-deep underline">
          {match[3]}
        </Link>
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function FaqAnswer({ answer, id }: { answer: string; id: string }) {
  const blocks = answer.split('\n\n');

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        const lines = block.split('\n');

        if (lines.every(line => line.startsWith('- '))) {
          return (
            <ul key={i} className="ml-5 list-disc space-y-1.5">
              {lines.map((line, j) => (
                <li key={j}>{linkify(line.slice(2), `${id}-${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }

        return <p key={i}>{linkify(lines.join(' '), `${id}-${i}`)}</p>;
      })}
    </div>
  );
}
