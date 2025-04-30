// app/layout.tsx
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Vanish Moving Company",
  description: "Stress-free moving services",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-black font-helvetica">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
