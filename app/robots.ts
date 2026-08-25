import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/business';

/**
 * Paths that are either private, transactional, or meaningless out of context.
 * `/portal/` is deliberately absent: it carries `robots: noindex` in its own
 * metadata, and blocking the crawl would stop a crawler from ever reading that
 * directive.
 */
const PRIVATE_PATHS = [
  '/api/',
  '/admin/',
  '/booking-success/',
  '/order-confirmation/',
];

/**
 * The crawlers behind AI assistants and answer engines.
 *
 * They are already covered by the wildcard rule below, but naming them is not
 * redundant: several of these agents look for a rule addressed to themselves
 * before falling back to `*`, and a future edit to the wildcard block is far
 * less likely to lock them out by accident when the intent is written down.
 *
 * Two groups, and the distinction matters:
 *  - "training/index" crawlers build the corpus a model is trained or grounded
 *    on (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot ...).
 *  - "live fetch" agents retrieve a page in the moment a user asks a question
 *    (ChatGPT-User, Claude-User, Perplexity-User, OAI-SearchBot ...). These are
 *    the ones that decide whether we can be cited in an answer today.
 */
const AI_CRAWLERS = [
  // OpenAI
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  // Anthropic
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  // Perplexity
  'PerplexityBot',
  'Perplexity-User',
  // Google / Gemini grounding
  'Google-Extended',
  'GoogleOther',
  // Apple
  'Applebot',
  'Applebot-Extended',
  // Microsoft / Copilot
  'bingbot',
  'msnbot',
  // Meta
  'meta-externalagent',
  'FacebookBot',
  // Others that feed assistant products
  'Amazonbot',
  'DuckAssistBot',
  'cohere-ai',
  'cohere-training-data-crawler',
  'YouBot',
  'Diffbot',
  'CCBot',
  'Timpibot',
  'omgili',
  'Kangaroo Bot',
  'MistralAI-User',
  'AI2Bot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [...PRIVATE_PATHS, '/_next/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      ...AI_CRAWLERS.map(userAgent => ({
        userAgent,
        allow: '/',
        disallow: PRIVATE_PATHS,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
