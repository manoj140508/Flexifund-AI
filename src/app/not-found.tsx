import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-2xl mx-auto">
        404
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
        Page Not Found
      </h1>
      <p className="text-slate-600 text-sm leading-relaxed">
        The financial resilience tool or page you are looking for does not exist or has been relocated.
      </p>
      <div className="flex items-center justify-center gap-4 pt-2">
        <Link
          href="/"
          className="px-5 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
        >
          Return to Home
        </Link>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
        >
          Open Dashboard
        </Link>
      </div>
    </div>
  );
}
