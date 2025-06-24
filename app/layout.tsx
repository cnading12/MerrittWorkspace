// app/layout.tsx
import "./globals.css";
import Navbar from "@/components/Navbar";
import "./globals-ios.css";


export const metadata = {
  title: "Vanish Moving Company",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
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
