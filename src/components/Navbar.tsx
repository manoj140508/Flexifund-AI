'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const publicNavLinks = [
    { href: '/help', label: 'How it works' },
    { href: '/#features', label: 'Features' },
    { href: '/opportunities', label: 'Opportunities' },
    { href: '/security', label: 'Security' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#FFFFFF]/90 dark:bg-[#0B1220]/90 backdrop-blur-md border-b border-[#D7E7F5] dark:border-[#2A3B52] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 1. Left: Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm tracking-tighter shadow-xs group-hover:bg-blue-600 transition-colors">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[#0F2747] dark:text-[#F8FAFC] font-extrabold text-lg tracking-tight">
                  FlexiFund
                </span>
                <span className="text-[#2563EB] dark:text-[#60A5FA] font-bold text-sm tracking-tight">AI</span>
              </div>
            </Link>
          </div>

          {/* 2. Center: Navigation Links */}
          <nav className="hidden md:flex items-center justify-center gap-1.5 flex-1 max-w-xl mx-auto" aria-label="Main navigation">
            {publicNavLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'text-[#2563EB] dark:text-[#60A5FA] bg-[#E0F2FE]/50 dark:bg-blue-950/40 font-bold'
                      : 'text-[#52657A] dark:text-[#B8C5D6] hover:text-[#0F2747] dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* 3. Right: Theme Toggle & Primary CTA */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <ThemeToggle />

            <Link
              href="/onboarding"
              className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-xs"
            >
              Check my resilience
            </Link>
          </div>

          {/* Mobile Menu Button & Quick Theme Toggle */}
          <div className="flex sm:hidden items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-[#D7E7F5] dark:border-[#2A3B52] bg-white dark:bg-[#111C2E] px-4 pt-3 pb-5 space-y-3">
          <div className="flex flex-col space-y-1">
            {publicNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-2 border-t border-[#D7E7F5] dark:border-[#2A3B52] flex items-center justify-between">
            <span className="text-xs text-slate-500">Theme</span>
            <ThemeToggle showLabel />
          </div>

          <div className="pt-2">
            <Link
              href="/onboarding"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center px-4 py-2.5 rounded-lg bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-600 transition-colors"
            >
              Check my resilience
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
