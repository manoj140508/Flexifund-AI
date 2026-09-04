'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please try again.');
      return;
    }

    setIsLoading(true);
    const result = await signup(name.trim(), email.trim(), password, confirmPassword);

    if (result.success) {
      router.push('/dashboard');
    } else {
      setIsLoading(false);
      setErrorMessage(result.error || 'Failed to create account.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8FAFC] dark:bg-[#070C16] text-[#0F2747] dark:text-[#F8FAFC] font-sans antialiased selection:bg-[#2563EB] selection:text-white px-4 py-8 sm:px-6 lg:px-8 transition-colors duration-200">
      {/* Top Header */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:bg-blue-600 transition-colors">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[#0F2747] dark:text-[#F8FAFC] font-extrabold text-lg tracking-tight">
              FLEXIFUND
            </span>
            <span className="text-[#2563EB] dark:text-[#60A5FA] font-bold text-xs tracking-wider">AI</span>
          </div>
        </Link>
        <ThemeToggle />
      </div>

      {/* Main Form Card */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
          <div className="space-y-1.5 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
              Create your account
            </h1>
            <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1]">
              Your financial plan stays with your account.
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 font-medium"
            >
              ⚠️ {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="signup-name"
                className="block text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]"
              >
                Full Name
              </label>
              <input
                id="signup-name"
                type="text"
                required
                autoComplete="name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ramesh Kumar"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#17243A] border border-slate-200 dark:border-slate-700 text-sm font-medium text-[#0F2747] dark:text-[#F8FAFC] outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
              />
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="signup-email"
                className="block text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]"
              >
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#17243A] border border-slate-200 dark:border-slate-700 text-sm font-medium text-[#0F2747] dark:text-[#F8FAFC] outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="signup-password"
                  className="block text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-[#2563EB] dark:text-[#60A5FA] hover:underline"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#17243A] border border-slate-200 dark:border-slate-700 text-sm font-medium text-[#0F2747] dark:text-[#F8FAFC] outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
              />
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="signup-confirm-password"
                className="block text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]"
              >
                Confirm Password
              </label>
              <input
                id="signup-confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#17243A] border border-slate-200 dark:border-slate-700 text-sm font-medium text-[#0F2747] dark:text-[#F8FAFC] outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-sm transition-colors shadow-md active:scale-98 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Creating account…</span>
                </>
              ) : (
                <span>Create account →</span>
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-[#52657A] dark:text-[#94A3B8] space-y-2">
            <p>
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Disclaimer */}
      <div className="max-w-md w-full mx-auto text-center text-xs text-[#52657A] dark:text-[#94A3B8]">
        <Link href="/" className="hover:underline">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
