// app/layout.tsx
import "./globals.css";
import Navbar from "@/components/Navbar";
import "./globals.css";
import "./globals-ios.css";


export const metadata = {
  title: "Vanish Moving Company",
  description: "Affordable, local movers based in Fort Collins, CO.",
  viewport: "width=device-width, initial-scale=1.0", // ← add this
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="ios-fix font-helvetica text-black bg-white">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
