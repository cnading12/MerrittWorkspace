import "./globals.css";
import Script from "next/script";
import Navbar from "@/components/Navbar";
import LocalBusinessSchema from "@/components/LocalBusinessSchema";
import { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { BUSINESS, SITE_URL } from "@/lib/seo/site";

// Self-hosted through next/font so there is no external request and no FOUT.
const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-display",
});

const body = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const TITLE = "Coworking Space in Sloan's Lake, Denver | Merritt Workspace";
const DESCRIPTION =
  "Independent coworking in Sloan's Lake, Denver. Dedicated desks from $200/mo, private offices from $500/mo, $30 day passes. 24/7 access, free parking, 3 min to I-25, and a restored 1905 event space next door. Free trial day available.";
const SOCIAL_DESCRIPTION =
  "Independent coworking in Sloan's Lake, Denver, with a restored 1905 event space on the same lawn. Desks from $200/mo, offices from $500/mo, $30 day passes. 24/7 access, free parking.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    // The homepage carries the location term first, because that is the phrase
    // the query matches; every other page appends the brand via the template.
    default: TITLE,
    // Kept short on purpose: Google truncates around 60 characters and cuts
    // from the end, so a long suffix costs the brand rather than showing it.
    // Per-page titles are written to fit inside 60 with this appended.
    template: "%s | Merritt Workspace",
  },
  description: DESCRIPTION,
  applicationName: BUSINESS.name,
  keywords: [
    "coworking space Denver",
    "coworking space Sloan's Lake",
    "dedicated desk Denver",
    "private office rental Denver",
    "day pass coworking Denver",
    "meeting room rental Denver",
    "coworking near I-25 Denver",
    "Sloan's Lake office space",
    "West Denver coworking",
    "shared office space Denver",
    "office space 80211",
    "coworking space near me Denver",
  ],
  authors: [{ name: BUSINESS.name }],
  creator: BUSINESS.name,
  publisher: BUSINESS.name,
  formatDetection: {
    email: true,
    address: true,
    telephone: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: BUSINESS.name,
    title: TITLE,
    description: SOCIAL_DESCRIPTION,
    images: [
      {
        url: "/images/og/home-og.jpg",
        width: 1200,
        height: 630,
        alt: "Members working at dedicated desks at Merritt Workspace, a coworking space in Sloan's Lake, Denver",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: SOCIAL_DESCRIPTION,
    images: ["/images/og/home-og.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  other: {
    "geo.region": "US-CO",
    "geo.placename": "Denver",
    "geo.position": `${BUSINESS.latitude};${BUSINESS.longitude}`,
    ICBM: `${BUSINESS.latitude}, ${BUSINESS.longitude}`,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#de5f07",
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`ios-fix ${display.variable} ${body.variable}`}>
      <head>
        <LocalBusinessSchema />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-18009340460"
          strategy="afterInteractive"
        />
        <Script id="google-gtag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-18009340460');
          `}
        </Script>
      </head>
      <body className="font-sans text-ink bg-bone">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
