'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  groupName: string;
  items: NavItem[];
}

const SIDEBAR_GROUPS: NavGroup[] = [
  {
    groupName: 'MAIN',
    items: [
      {
        href: '/dashboard',
        label: 'Home',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
      {
        href: '/quick-check',
        label: 'Quick Money Check',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
      {
        href: '/my-money',
        label: 'My Money',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
    ],
  },
  {
    groupName: 'TAKE ACTION',
    items: [
      {
        href: '/add-expense',
        label: 'Add Expense',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ),
      },
      {
        href: '/can-i-spend',
        label: 'Can I Spend This?',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        ),
      },
      {
        href: '/savings',
        label: 'Save More',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        ),
      },
      {
        href: '/plan-ahead',
        label: 'Plan Ahead',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        ),
      },
    ],
  },
  {
    groupName: 'PLAN & PROGRESS',
    items: [
      {
        href: '/money-calendar',
        label: 'Money Calendar',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        href: '/my-goals',
        label: 'My Goals',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        ),
      },
      {
        href: '/my-plan',
        label: 'My Plan',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
    ],
  },
  {
    groupName: 'SUPPORT',
    items: [
      {
        href: '/opportunities',
        label: 'Support',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
      },
      {
        href: '/help-safety',
        label: 'Help & Safety',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
    ],
  },
  {
    groupName: 'ACCOUNT',
    items: [
      {
        href: '/profile',
        label: 'Profile',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
      },

    ],
  },
];

function getSectionTitle(pathname: string): string {
  if (pathname === '/dashboard' || pathname === '/') return 'Home';
  if (pathname === '/quick-check') return 'Quick Money Check';
  if (pathname === '/my-money' || pathname === '/income' || pathname === '/expenses') return 'My Money';
  if (pathname === '/add-expense') return 'Add Expense';
  if (pathname === '/can-i-spend') return 'Can I Spend This?';
  if (pathname === '/savings') return 'Save More';
  if (pathname === '/plan-ahead' || pathname === '/what-if' || pathname === '/resilience' || pathname === '/credit') return 'Plan Ahead';
  if (pathname.startsWith('/opportunities')) return 'Support';
  if (pathname === '/my-plan' || pathname === '/action-plan' || pathname === '/export') return 'My Plan';
  if (pathname === '/profile') return 'Profile';
  if (pathname === '/settings') return 'Settings';
  if (pathname === '/upload') return 'Understand Your Money';
  if (pathname === '/review') return 'Review Your Statement';
  return 'FlexiFund AI';
}

function isItemActive(itemHref: string, currentPath: string): boolean {
  if (itemHref === '/dashboard') return currentPath === '/dashboard' || currentPath === '/';
  if (itemHref === '/quick-check') return currentPath === '/quick-check';
  if (itemHref === '/my-money') return currentPath === '/my-money' || currentPath === '/income' || currentPath === '/expenses';
  if (itemHref === '/add-expense') return currentPath === '/add-expense';
  if (itemHref === '/can-i-spend') return currentPath === '/can-i-spend';
  if (itemHref === '/savings') return currentPath === '/savings';
  if (itemHref === '/plan-ahead') return currentPath === '/plan-ahead' || currentPath === '/what-if' || currentPath === '/resilience' || currentPath === '/credit';
  if (itemHref === '/opportunities') return currentPath.startsWith('/opportunities');
  if (itemHref === '/my-plan') return currentPath === '/my-plan' || currentPath === '/action-plan' || currentPath === '/export';
  if (itemHref === '/profile') return currentPath === '/profile';
  return currentPath === itemHref;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  // Standalone pages (Landing page, Login, Signup have their own dedicated headers & footers)
  if (pathname === '/' || pathname === '/login' || pathname === '/signup') {
    return <>{children}</>;
  }

  // Public Experience: Show marketing header + footer
  const isPublicPage =
    pathname === '/help' ||
    pathname === '/security' ||
    pathname === '/privacy';

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
              <span className="hidden sm:inline">{user?.name ? user.name.split(' ')[0] : 'Profile'}</span>
            </Link>

            {user && (
              <button
                type="button"
                onClick={() => logout()}
                className="hidden md:inline-flex items-center px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Log out of FlexiFund AI"
              >
                Log out
              </button>
            )}
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
          <div className="flex-1 py-3 flex flex-col justify-between overflow-y-auto">
            {/* Navigation links grouped subtly */}
            <nav className="px-2 space-y-1" aria-label="Application navigation">
              {SIDEBAR_GROUPS.map((group, gIdx) => (
                <div key={group.groupName} className="space-y-0.5">
                  {!isSidebarCollapsed ? (
                    <div className={`px-3 ${gIdx === 0 ? 'pt-1' : 'pt-3'} pb-1 text-[10px] font-extrabold tracking-wider uppercase text-[#52657A]/75 dark:text-[#94A3B8]/75`}>
                      {group.groupName}
                    </div>
                  ) : (
                    gIdx > 0 && <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />
                  )}

                  {group.items.map((item) => {
                    const isActive = isItemActive(item.href, pathname);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        aria-label={item.label}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-[#E0F2FE]/70 dark:bg-[#17243A] text-[#2563EB] dark:text-[#60A5FA] font-bold shadow-xs'
                            : 'text-[#52657A] dark:text-[#B8C5D6] hover:text-[#0F2747] dark:hover:text-[#F8FAFC] hover:bg-[#F5FAFF] dark:hover:bg-[#17243A]/60'
                        } ${isSidebarCollapsed ? 'justify-center px-2 py-2.5' : ''}`}
                      >
                        <span className={`${isActive ? 'text-[#2563EB] dark:text-[#60A5FA]' : 'text-slate-400 dark:text-slate-500'}`}>
                          {item.icon}
                        </span>
                        {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Bottom Quick Actions */}
            <div className="px-2 pt-3 border-t border-[#D7E7F5] dark:border-[#2A3B52]">
              <Link
                href="/upload"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-[#2563EB] text-white hover:bg-blue-600 shadow-xs ${
                  isSidebarCollapsed ? 'justify-center px-2' : ''
                }`}
                title={isSidebarCollapsed ? 'Upload Data' : undefined}
                aria-label="Upload Statement Data"
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
            <div className="relative w-64 max-w-[80vw] bg-white dark:bg-[#111C2E] border-r border-[#D7E7F5] dark:border-[#2A3B52] flex flex-col justify-between p-4 shadow-xl z-10 overflow-y-auto">
              <div className="space-y-4">
                {/* Header in Drawer */}
                <div className="flex items-center justify-between pb-3 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs">
                      F
                    </div>
                    <span className="font-extrabold text-sm text-[#0F2747] dark:text-[#F8FAFC]">
                      Menu
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Close menu"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Mobile Grouped Links */}
                <nav className="space-y-3" aria-label="Mobile navigation">
                  {SIDEBAR_GROUPS.map((group) => (
                    <div key={group.groupName} className="space-y-1">
                      <div className="px-2 text-[10px] font-extrabold tracking-wider uppercase text-[#52657A]/75 dark:text-[#94A3B8]/75">
                        {group.groupName}
                      </div>
                      {group.items.map((item) => {
                        const isActive = isItemActive(item.href, pathname);
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
                    </div>
                  ))}
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
                  <span>Upload Statement</span>
                </Link>

                {user && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      logout();
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors"
                  >
                    Log out ({user.name})
                  </button>
                )}

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
        <main className="flex-1 min-w-0 overflow-y-auto pb-20 lg:pb-8">
          {children}
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR (Thumb-friendly for gig workers on phone) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#111C2E]/95 backdrop-blur-md border-t border-[#D7E7F5] dark:border-[#2A3B52] px-1 py-1 flex items-center justify-around shadow-lg">
          {[
            SIDEBAR_GROUPS[0].items[0], // Home
            SIDEBAR_GROUPS[0].items[1], // Quick Money Check
            SIDEBAR_GROUPS[1].items[0], // Add Expense
            SIDEBAR_GROUPS[1].items[1], // Can I Spend This?
            SIDEBAR_GROUPS[2].items[2], // My Plan
          ].map((item) => {
            const isActive = isItemActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors text-[11px] font-medium min-w-[54px] ${
                  isActive
                    ? 'text-[#2563EB] dark:text-[#60A5FA] font-bold'
                    : 'text-[#52657A] dark:text-[#94A3B8] hover:text-[#0F2747] dark:hover:text-[#F8FAFC]'
                }`}
              >
                <span className="mb-0.5">{item.icon}</span>
                <span className="truncate">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
