import Image from 'next/image';

type Props = {
  src: string;
  alt: string;
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  blurDataURL?: string;
  /** Bias the crop, e.g. "50% 62%". Defaults to centre. */
  objectPosition?: string;
};

/**
 * The opening section of an interior marketing page: full-bleed photograph
 * starting at y=0 with the transparent navbar over it. Shorter than the
 * homepage hero — these pages have to get to their content.
 *
 * Any route using this must also be listed in HERO_ROUTES in Navbar.tsx,
 * otherwise the bar stays solid and overlaps the headline.
 */
export default function PageHero({
  src, alt, eyebrow, title, lead, blurDataURL, objectPosition,
}: Props) {
  return (
    <section className="relative h-[62svh] min-h-[440px] w-full overflow-hidden md:h-[72svh] md:max-h-[760px]">
      <Image
        src={src}
        alt={alt}
        fill
        priority
        quality={88}
        sizes="100vw"
        placeholder={blurDataURL ? 'blur' : 'empty'}
        blurDataURL={blurDataURL}
        className="object-cover"
        style={objectPosition ? { objectPosition } : undefined}
      />
      {/* Directional scrim under the text, plus a short one at the top so the
          transparent nav's light marks stay legible. */}
      <div className="absolute inset-0 scrim-bottom" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-40 scrim-nav" aria-hidden="true" />

      <div className="absolute inset-0 flex items-end">
        <div className="mw-container pt-28 pb-12 md:pb-16">
          <p className="mw-eyebrow-light mb-4 md:mb-5">{eyebrow}</p>
          <h1 className="mw-h1 max-w-3xl text-bone">{title}</h1>
          {lead && (
            <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-bone/85 md:mt-7 md:text-lg">
              {lead}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
