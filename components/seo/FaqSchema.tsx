import type { Faq } from '@/lib/seo/faqs';
import JsonLd from './JsonLd';

/**
 * `FAQPage` markup. Answer engines lean on it heavily: a question here is
 * already in the shape of the question a person types into an assistant, and
 * the answer is already the length of a quotable reply.
 *
 * The plain-text answers carry "- " list markers and blank-line paragraphs;
 * both are converted to the light HTML that `acceptedAnswer.text` allows.
 */
function toHtml(answer: string): string {
  return answer
    .split('\n\n')
    .map(block => {
      const lines = block.split('\n');
      if (lines.every(l => l.startsWith('- '))) {
        return `<ul>${lines.map(l => `<li>${l.slice(2)}</li>`).join('')}</ul>`;
      }
      return `<p>${lines.join(' ')}</p>`;
    })
    .join('');
}

export default function FaqSchema({ faqs, id }: { faqs: Faq[]; id: string }) {
  return (
    <JsonLd
      schema={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        '@id': id,
        mainEntity: faqs.map(faq => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: toHtml(faq.answer) },
        })),
      }}
    />
  );
}
