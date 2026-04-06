import { ReactNode } from 'react';

export const metadata = {
  title: 'Member Portal | Merritt Workspace',
};

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-semibold text-gray-900">Merritt Workspace · Member Portal</div>
          <a href="/" className="text-sm text-gray-500 hover:text-gray-900">
            Main site
          </a>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
