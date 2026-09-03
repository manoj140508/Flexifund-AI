'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ThemeToggle from '@/components/ThemeToggle';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const SIDEBAR_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    href: '/income',
    label: 'Income',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    href: '/expenses',
    label: 'Expenses',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    href: '/resilience',
    label: 'Resilience',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    href: '/savings',
    label: 'Where I can save',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/opportunities',
    label: 'Opportunities',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: '/what-if',
    label: 'What-If',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    href: '/credit',
    label: 'Credit',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/action-plan',
    label: 'Action Plan',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

function getSectionTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Overview & Resilience';
  if (pathname === '/income') return 'Income Volatility';
  if (pathname === '/expenses') return 'Expense Breakdown';
  if (pathname === '/resilience') return 'Financial Resilience & Buffer';
  if (pathname === '/savings') return 'Where I Can Save';
  if (pathname.startsWith('/opportunities')) return 'Verified Opportunities';
  if (pathname === '/what-if') return 'Scenario Planning';
  if (pathname === '/credit') return 'Credit Commitment Check';
  if (pathname === '/action-plan') return 'Prioritized Action Plan';
  if (pathname === '/profile') return 'Worker Profile & Planning Floor';
  if (pathname === '/settings') return 'Settings';
  if (pathname === '/upload') return 'Upload Financial Statement';
  if (pathname === '/review') return 'Review Extracted Statement';
  if (pathname === '/export') return 'Export Resilience Report';
  return 'Financial Resilience';
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  // Determine if current page is public marketing
  const isPublicPage =
    pathname === '/' ||
    pathname === '/help' ||
    pathname === '/security' ||
    pathname === '/privacy' ||
    pathname === '/onboarding';

  // Public Experience: Show marketing header + footer
  if (isPublicPage) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </div>
    );
  }

  // Application Experience: ONE clean application header + Collapsible Sidebar
  const currentTitle = getSectionTitle(pathname);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5FAFF] dark:bg-[#0B1220] transition-colors">
      {/* ONE COMPACT APPLICATION HEADER */}
      <header className="sticky top-0 z-40 h-14 bg-white/95 dark:bg-[#111C2E]/95 backdrop-blur-md border-b border-[#D7E7F5] dark:border-[#2A3B52] transition-colors">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* LEFT: Logo & Sidebar Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Mobile Drawer Trigger Button */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
              className="lg:hidden p-1.5 rounded-lg text-[#52657A] dark:text-[#B8C5D6] hover:bg-[#F5FAFF] dark:hover:bg-[#17243A] transition-colors"
              aria-label="Toggle navigation drawer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileDrawerOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* Desktop Sidebar Collapse Toggle */}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:flex p-1.5 rounded-lg text-[#52657A] dark:text-[#B8C5D6] hover:bg-[#F5FAFF] dark:hover:bg-[#17243A] transition-colors"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>

            {/* FlexiFund AI Brand Logo */}
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:bg-blue-600 transition-colors">
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[#0F2747] dark:text-[#F8FAFC] font-extrabold text-base tracking-tight">
                  FlexiFund
                </span>
                <span className="text-[#2563EB] dark:text-[#60A5FA] font-bold text-xs">AI</span>
              </div>
            </Link>
          </div>

          {/* CENTER: Current Section Title */}
          <div className="flex-1 text-center truncate px-2">
            <h1 className="text-sm sm:text-base font-bold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight truncate">
              {currentTitle}
            </h1>
          </div>

          {/* RIGHT: Theme Toggle & Profile Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ThemeToggle />

            <Link
              href="/profile"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                pathname === '/profile'
                  ? 'bg-[#E0F2FE]/70 dark:bg-blue-950/60 border-[#2563EB] text-[#2563EB] dark:text-[#60A5FA]'
                  : 'bg-white dark:bg-[#17243A] border-[#D7E7F5] dark:border-[#2A3B52] text-[#0F2747] dark:text-[#F8FAFC] hover:bg-[#F5FAFF] dark:hover:bg-[#1E304C]'
              }`}
              title="Profile & Settings"
            >
              <svg className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="hidden sm:inline">Profile</span>
            </Link>
          </div>
        </div>
      </header>

      {/* WORKSPACE BODY: Sidebar + Main Content */}
      <div className="flex-1 flex min-h-[calc(100vh-3.5rem)]">
        {/* DESKTOP SIDEBAR */}
        <aside
          className={`hidden lg:flex flex-col shrink-0 border-r border-[#D7E7F5] dark:border-[#2A3B52] bg-white dark:bg-[#111C2E] transition-all duration-200 ${
            isSidebarCollapsed ? 'w-16' : 'w-56'
          }`}
        >
          <div className="flex-1 py-4 flex flex-col justify-between overflow-y-auto">
            {/* Navigation links */}
            <nav className="px-2 space-y-1" aria-label="Application navigation">
              {SIDEBAR_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#E0F2FE]/70 dark:bg-[#17243A] text-[#2563EB] dark:text-[#60A5FA] font-bold shadow-xs'
                        : 'text-[#52657A] dark:text-[#B8C5D6] hover:text-[#0F2747] dark:hover:text-[#F8FAFC] hover:bg-[#F5FAFF] dark:hover:bg-[#17243A]/60'
                    } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                  >
                    <span className={`${isActive ? 'text-[#2563EB] dark:text-[#60A5FA]' : 'text-slate-400 dark:text-slate-500'}`}>
                      {item.icon}
                    </span>
                    {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom Quick Actions */}
            <div className="px-2 pt-4 border-t border-[#D7E7F5] dark:border-[#2A3B52]">
              <Link
                href="/upload"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-[#2563EB] text-white hover:bg-blue-600 shadow-xs ${
                  isSidebarCollapsed ? 'justify-center px-2' : ''
                }`}
                title={isSidebarCollapsed ? 'Upload Data' : undefined}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {!isSidebarCollapsed && <span>Upload Data</span>}
              </Link>
            </div>
          </div>
        </aside>

        {/* MOBILE DRAWER OVERLAY */}
        {isMobileDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileDrawerOpen(false)}
            />

            {/* Drawer */}
            <div className="relative w-64 max-w-[80vw] bg-white dark:bg-[#111C2E] border-r border-[#D7E7F5] dark:border-[#2A3B52] flex flex-col justify-between p-4 shadow-xl z-10">
              <div className="space-y-4">
                {/* Header in Drawer */}
                <div className="flex items-center justify-between pb-3 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs">
                      F
                    </div>
                    <span className="font-extrabold text-sm text-[#0F2747] dark:text-[#F8FAFC]">
                      Navigation
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Mobile Links */}
                <nav className="space-y-1">
                  {SIDEBAR_ITEMS.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileDrawerOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                          isActive
                            ? 'bg-[#E0F2FE]/80 dark:bg-[#17243A] text-[#2563EB] dark:text-[#60A5FA] font-bold'
                            : 'text-[#52657A] dark:text-[#B8C5D6] hover:bg-[#F5FAFF] dark:hover:bg-[#17243A]'
                        }`}
                      >
                        <span className={isActive ? 'text-[#2563EB] dark:text-[#60A5FA]' : 'text-slate-400 dark:text-slate-500'}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Drawer Bottom Actions */}
              <div className="pt-4 border-t border-[#D7E7F5] dark:border-[#2A3B52] space-y-2">
                <Link
                  href="/upload"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold bg-[#2563EB] text-white hover:bg-blue-600 transition-colors shadow-xs"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Upload Financial Data</span>
                </Link>

                <div className="flex items-center justify-center pt-1 px-1 text-xs text-[#52657A] dark:text-[#B8C5D6]">
                  <Link href="/security" onClick={() => setIsMobileDrawerOpen(false)} className="hover:underline">
                    Security & Privacy
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MAIN APPLICATION CONTENT AREA */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
