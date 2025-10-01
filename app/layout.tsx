import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Merritt Workspace - Premium Coworking in Denver",
  description: "Premium workspace in the heart of Sloan's Lake, Denver. Offices, dedicated desks, and conference rooms in a beautifully restored space.",
  icons: {
    icon: [
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' }
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    title: 'MW'
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="ios-fix">
      <body className="font-helvetica text-black bg-white">
        <Navbar />
        {children}
      </body>
    </html>
  );
}