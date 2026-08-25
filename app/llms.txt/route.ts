import { buildLlmsTxt } from '@/lib/seo/llms';

// Rebuilt daily so the "last updated" line stays honest without a deploy.
export const revalidate = 86400;

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
