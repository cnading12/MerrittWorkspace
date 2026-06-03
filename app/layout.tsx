import "./globals.css";
import Script from "next/script";
import Navbar from "@/components/Navbar";
import LocalBusinessSchema from "@/components/LocalBusinessSchema";
import { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL('https://merrittworkspace.net'),
  title: {
    default: "Merritt Workspace | Coworking Space in Sloan's Lake, Denver",
    template: "%s | Merritt Workspace Denver"
  },
  description: "Premium coworking space in Sloan's Lake, Denver. Dedicated desks from $200/mo, private offices from $500/mo. 24/7 access, 3 min to I-25, historic 1905 building. Free trial day available.",
  keywords: [
    "coworking space Sloan's Lake",
    "dedicated desk Denver",
    "private office rental Denver",
    "coworking near I-25 Denver",
    "Sloan's Lake office space",
    "West Denver coworking",
    "Denver office rental",
    "shared office space Denver",
    "coworking Denver",
    "flexible office Denver"
  ],
  authors: [{ name: "Merritt Workspace" }],
  creator: "Merritt Workspace",
  publisher: "Merritt Workspace",
  formatDetection: {
    email: true,
    address: true,
    telephone: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://merrittworkspace.net",
    siteName: "Merritt Workspace",
    title: "Merritt Workspace | Coworking Space in Sloan's Lake, Denver",
    description: "Premium coworking in Sloan's Lake with member access to our stunning 1905 church. Dedicated desks from $200/mo, private offices from $500/mo. 24/7 access, 3 min to I-25.",
    images: [
      {
        url: "/images/hero/outside-hero.webp",
        width: 1200,
        height: 630,
        alt: "Merritt Workspace - Historic coworking space in Sloan's Lake, Denver",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Merritt Workspace | Coworking Space in Sloan's Lake, Denver",
    description: "Premium coworking in Sloan's Lake with member access to our stunning 1905 church. Dedicated desks from $200/mo, private offices from $500/mo. 24/7 access, 3 min to I-25.",
    images: ["/images/hero/outside-hero.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: "https://merrittworkspace.net",
  },
  icons: {
    icon: [
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' }
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  other: {
    'geo.region': 'US-CO',
    'geo.placename': 'Denver',
    'geo.position': '39.75098609588881;-105.03225422342487',
    'ICBM': '39.75098609588881, -105.03225422342487',
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
    <html lang="en" className="ios-fix">
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
      <body className="font-helvetica text-black bg-white">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
