/**
 * Emits one linked-data graph as a <script type="application/ld+json">.
 *
 * Rendered from a server component so the JSON is in the HTML Google's first
 * pass reads, rather than something it only finds after executing JavaScript.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // The payload is built by our own code from lib/seo, never from user
      // input, and JSON.stringify escapes the quoting that would break out of
      // the script element.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
