import { ReactNode } from 'react';
import PortalNav from '@/components/portal/PortalNav';

export const metadata = {
  title: 'Member Portal | Merritt Workspace',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-linen">
      <PortalNav />
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
