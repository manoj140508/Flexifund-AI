'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/dashboard';

  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setIsLoading(true);
    const result = await login(email, password);

    if (result.success) {
      router.push(from);
    } else {
      setIsLoading(false);
      setErrorMessage(result.error || 'Email or password is incorrect.');
    }
  };

  return (
    <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
      <div className="space-y-1.5 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
          Welcome back
        </h1>
        <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1]">
          Log in to continue your financial plan.
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
        {/* Email Field */}
        <div className="space-y-1.5">
          <label
            htmlFor="login-email"
            className="block text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]"
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            autoFocus
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
              htmlFor="login-password"
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
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
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
              <span>Logging in…</span>
            </>
          ) : (
            <span>Log in →</span>
          )}
        </button>
      </form>

      {/* Footer Links */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-[#52657A] dark:text-[#94A3B8] space-y-2">
        <p>
          New to FlexiFund AI?{' '}
          <Link href="/signup" className="font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
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

      {/* Main Form Card with Suspense */}
      <div className="max-w-md w-full mx-auto my-8">
        <Suspense
          fallback={
            <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-10 text-center text-xs text-[#52657A] dark:text-[#94A3B8]">
              Loading login form…
            </div>
          }
        >
          <LoginForm />
        </Suspense>
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
