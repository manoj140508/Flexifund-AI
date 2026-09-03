'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const APP_WORKFLOW_LINKS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/income', label: 'Income' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/resilience', label: 'Resilience' },
  { href: '/savings', label: 'Where I can save' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/what-if', label: 'What-If' },
  { href: '/credit', label: 'Credit' },
  { href: '/action-plan', label: 'Action Plan' },
  { href: '/profile', label: 'Profile' },
];

export default function AppNavigation() {
  const pathname = usePathname();

  // Strict check: NEVER show on landing page or public informational pages
  if (
    pathname === '/' ||
    pathname === '/upload' ||
    pathname === '/onboarding' ||
    pathname === '/help' ||
    pathname === '/security' ||
    pathname === '/privacy' ||
    pathname === '/review'
  ) {
    return null;
  }

  // Show only on explicit financial workspace pages
  const isWorkspacePage = [
    '/dashboard',
    '/income',
    '/expenses',
    '/resilience',
    '/savings',
    '/what-if',
    '/credit',
    '/action-plan',
    '/profile',
    '/export',
  ].some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (!isWorkspacePage) {
    return null;
  }

  return (
    <nav
      aria-label="Application sub-navigation"
      className="bg-white dark:bg-[#111C2E] border-b border-[#D7E7F5] dark:border-[#2A3B52] transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1.5 overflow-x-auto py-2.5 scrollbar-none">
          {APP_WORKFLOW_LINKS.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'text-[#52657A] dark:text-[#B8C5D6] hover:text-[#0F2747] dark:hover:text-[#F8FAFC] hover:bg-[#E0F2FE]/40 dark:hover:bg-slate-800/60'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
