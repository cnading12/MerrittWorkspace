"use client";

import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin error boundary caught:', error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto bg-white border rounded-lg p-8 mt-8">
      <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-gray-600">
        An error occurred while loading this page. You can try again, or return to the
        admin dashboard.
      </p>
      {error.message && (
        <pre className="mt-4 bg-gray-50 border rounded p-3 text-xs text-gray-700 overflow-auto">
          {error.message}
        </pre>
      )}
      <div className="mt-6 flex gap-2">
        <button
          onClick={reset}
          className="text-sm bg-gray-900 text-white rounded px-4 py-2 hover:bg-gray-800"
        >
          Try again
        </button>
        <Link
          href="/admin/dashboard"
          className="text-sm border rounded px-4 py-2 hover:bg-gray-50"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
