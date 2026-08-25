/**
 * One place to emit a JSON-LD block.
 *
 * `<` is escaped rather than serialized literally: a stray `</script` inside any
 * string value would otherwise close the tag early and dump the rest of the
 * graph into the page as text.
 */
export default function JsonLd({ schema }: { schema: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  );
}
