'use client';

import React, { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toYMD(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function formatRupees(paise: number): string {
  const rupees = Math.round(paise / 100);
  return `₹${rupees.toLocaleString('en-IN')}`;
}

function getMondayBasedDay(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayData {
  dateStr: string;
  day: number;
  income: number;   // paise
  expense: number;  // paise
  events: Array<{ description: string; amountPaise: number; type: 'CREDIT' | 'DEBIT' }>;
}

// ─── Day Detail Panel ─────────────────────────────────────────────────────────

function DayDetailPanel({
  day,
  onClose,
}: {
  day: DayData;
  onClose: () => void;
}) {
  const net = day.income - day.expense;
  const dateLabel = new Date(day.dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Details for ${dateLabel}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full sm:max-w-sm mx-auto bg-white dark:bg-[#111C2E] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#D7E7F5] dark:border-[#2A3B52] overflow-hidden">
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#E2E8F0] dark:border-[#26354D]">
          <h2 className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">{dateLabel}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#52657A] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {day.events.length === 0 ? (
            <p className="text-sm text-[#52657A] dark:text-[#CBD5E1] py-2">No transactions recorded.</p>
          ) : (
            <>
              {/* Transaction list */}
              <div className="space-y-2">
                {day.events.map((ev, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[#0F2747] dark:text-[#F8FAFC] truncate min-w-0">
                      {ev.description}
                    </span>
                    <span
                      className={`text-xs font-bold font-mono shrink-0 ${
                        ev.type === 'CREDIT'
                          ? 'text-[#059669] dark:text-[#34D399]'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {ev.type === 'CREDIT' ? '+' : '-'}{formatRupees(ev.amountPaise)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Summary row */}
              <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#26354D] grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">In</p>
                  <p className="text-xs font-extrabold font-mono text-[#0F2747] dark:text-[#F8FAFC]">
                    {day.income > 0 ? `+${formatRupees(day.income)}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Out</p>
                  <p className="text-xs font-extrabold font-mono text-[#0F2747] dark:text-[#F8FAFC]">
                    {day.expense > 0 ? `-${formatRupees(day.expense)}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]">Net</p>
                  <p className={`text-xs font-extrabold font-mono ${net >= 0 ? 'text-[#059669] dark:text-[#34D399]' : 'text-rose-600 dark:text-rose-400'}`}>
                    {net >= 0 ? '+' : '-'}{formatRupees(Math.abs(net))}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────

function CalendarGrid({
  year,
  month,
  dayMap,
  today,
  onDayClick,
}: {
  year: number;
  month: number;
  dayMap: Map<string, DayData>;
  today: string;
  onDayClick: (_day: DayData) => void;
}) {
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const firstWeekday = getMondayBasedDay(firstDayOfMonth);
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (DayData | null)[] = [
    ...Array(firstWeekday).fill(null),
  ];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toYMD(year, month, d);
    cells.push(dayMap.get(dateStr) ?? { dateStr, day: d, income: 0, expense: 0, events: [] });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="w-full min-w-0">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((h) => (
          <div
            key={h}
            className="text-[9px] xs:text-[10px] sm:text-xs font-bold text-center text-[#52657A] dark:text-[#94A3B8] py-1 select-none"
          >
            {h}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px sm:gap-1">
        {cells.map((cell, idx) => {
          if (!cell) {
            return <div key={`empty-${idx}`} className="aspect-square" aria-hidden="true" />;
          }

          const isToday = cell.dateStr === today;
          const hasIncome = cell.income > 0;
          const hasExpense = cell.expense > 0;
          const hasActivity = hasIncome || hasExpense;
          const isPressure = hasExpense && !hasIncome;

          const fullDateLabel = new Date(cell.dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
          const ariaLabel = `${fullDateLabel}${
            cell.events.length > 0
              ? `, ${cell.events.length} transaction${cell.events.length !== 1 ? 's' : ''}, net ${
                  cell.income - cell.expense >= 0 ? 'income' : 'expense'
                } ${formatRupees(Math.abs(cell.income - cell.expense))}`
              : ''
          }`;

          return (
            <button
              key={cell.dateStr}
              type="button"
              onClick={() => onDayClick(cell)}
              aria-label={ariaLabel}
              className={`aspect-square rounded-lg sm:rounded-xl flex flex-col items-center justify-start pt-1 px-0.5 overflow-hidden transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-1 ${
                isToday
                  ? 'bg-[#2563EB] text-white shadow-md'
                  : isPressure
                  ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/60'
                  : hasActivity
                  ? 'bg-[#F0F7FF] dark:bg-[#17243A] border border-[#C3DDF8] dark:border-[#2A3B52] hover:bg-[#E0EFFF] dark:hover:bg-[#1E2E44]'
                  : 'bg-[#F8FAFC] dark:bg-[#0B1526] hover:bg-[#F0F4FA] dark:hover:bg-[#0F1A2A]'
              }`}
            >
              {/* Day number */}
              <span
                className={`text-[10px] xs:text-xs sm:text-sm font-bold leading-none ${
                  isToday ? 'text-white' : 'text-[#0F2747] dark:text-[#F8FAFC]'
                }`}
              >
                {cell.day}
              </span>

              {/* Indicators */}
              <div className="flex flex-col items-center gap-px mt-0.5 w-full px-0.5">
                {hasIncome && !isToday && (
                  <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[#059669] dark:bg-[#34D399] shrink-0" />
                )}
                {hasExpense && !isToday && (
                  <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 shrink-0" />
                )}
              </div>

              {/* Amount text — only on sm+ where cells are big enough */}
              {hasActivity && !isToday && (
                <span
                  className={`hidden sm:block text-[8px] font-semibold leading-none mt-0.5 truncate w-full text-center ${
                    hasIncome && !hasExpense
                      ? 'text-[#059669] dark:text-[#34D399]'
                      : !hasIncome && hasExpense
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-[#52657A] dark:text-[#94A3B8]'
                  }`}
                >
                  {cell.events.length === 1
                    ? `${cell.events[0].type === 'CREDIT' ? '+' : '-'}${formatRupees(cell.events[0].amountPaise)}`
                    : `${cell.events.length} acts`}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 sm:gap-4 mt-3 pt-3 border-t border-[#E2E8F0] dark:border-[#26354D] flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#059669] dark:bg-[#34D399] shrink-0" />
          <span className="text-[10px] sm:text-[11px] text-[#52657A] dark:text-[#94A3B8]">Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-rose-500 dark:bg-rose-400 shrink-0" />
          <span className="text-[10px] sm:text-[11px] text-[#52657A] dark:text-[#94A3B8]">Expense</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#2563EB] shrink-0" />
          <span className="text-[10px] sm:text-[11px] text-[#52657A] dark:text-[#94A3B8]">Today</span>
        </div>
        <span className="text-[10px] sm:text-[11px] text-[#52657A] dark:text-[#94A3B8] italic">Tap a day for details</span>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function MoneyCalendarPage() {
  const { confirmedTransactions, analysisResult } = useFinancialData();

  const now = new Date();
  const todayStr = toYMD(now.getFullYear(), now.getMonth() + 1, now.getDate());

  // ── Find the most recent transaction month to start on ───────────────────
  const defaultMonth = useMemo<{ year: number; month: number }>(() => {
    let latestDate = '';
    confirmedTransactions.forEach((tx) => {
      if (tx.date && tx.date > latestDate) latestDate = tx.date;
    });
    if (!latestDate) return { year: now.getFullYear(), month: now.getMonth() + 1 };
    const [y, m] = latestDate.slice(0, 7).split('-').map(Number);
    return { year: y, month: m };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmedTransactions.length]);

  const [viewYear, setViewYear] = useState(() => defaultMonth.year);
  const [viewMonth, setViewMonth] = useState(() => defaultMonth.month);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  // ── Build day map for the viewed month ───────────────────────────────────
  const dayMap = useMemo<Map<string, DayData>>(() => {
    const map = new Map<string, DayData>();
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toYMD(viewYear, viewMonth, d);
      map.set(dateStr, { dateStr, day: d, income: 0, expense: 0, events: [] });
    }
    confirmedTransactions.forEach((tx) => {
      if (!tx.date) return;
      const dateStr = tx.date.slice(0, 10);
      const [txY, txM] = dateStr.split('-').map(Number);
      if (txY !== viewYear || txM !== viewMonth) return;
      const entry = map.get(dateStr);
      if (!entry) return;
      const paise = Math.abs(Number(tx.amountPaise));
      if (tx.type === 'CREDIT') entry.income += paise;
      else entry.expense += paise;
      entry.events.push({ description: tx.description, amountPaise: paise, type: tx.type });
    });
    return map;
  }, [confirmedTransactions, viewYear, viewMonth]);

  const hasDatedData = useMemo(
    () => [...dayMap.values()].some((d) => d.income > 0 || d.expense > 0),
    [dayMap]
  );
  const hasAnyData = confirmedTransactions.length > 0;

  // ── Monthly totals ───────────────────────────────────────────────────────
  const monthlyIncome  = useMemo(() => [...dayMap.values()].reduce((s, d) => s + d.income,   0), [dayMap]);
  const monthlyExpense = useMemo(() => [...dayMap.values()].reduce((s, d) => s + d.expense,  0), [dayMap]);
  const monthlyNet     = monthlyIncome - monthlyExpense;

  // ── Pressure days (only shown when >= 3 expense days with no income) ─────
  const pressureDays = useMemo(() => {
    if (!hasDatedData) return [];
    return [...dayMap.values()]
      .filter((d) => d.expense > 0 && d.income === 0)
      .sort((a, b) => b.expense - a.expense)
      .slice(0, 3);
  }, [dayMap, hasDatedData]);

  const showPressureSection = pressureDays.length >= 2;

  // ── Month navigation ─────────────────────────────────────────────────────
  const goPrev = useCallback(() => {
    setViewMonth((m) => {
      if (m === 1) { setViewYear((y) => y - 1); return 12; }
      return m - 1;
    });
  }, []);

  const goNext = useCallback(() => {
    setViewMonth((m) => {
      if (m === 12) { setViewYear((y) => y + 1); return 1; }
      return m + 1;
    });
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Day detail modal */}
      {selectedDay && (
        <DayDetailPanel day={selectedDay} onClose={() => setSelectedDay(null)} />
      )}

      <div className="w-full min-w-0 max-w-3xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">

        {/* Page Header */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl sm:text-2xl shrink-0" aria-hidden="true">📅</span>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight truncate">
              Money Calendar
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1]">
            See your income and important expenses across the month.
          </p>
        </div>

        {/* ── EMPTY STATE ── */}
        {!hasAnyData && (
          <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-sm">
            <div className="flex flex-col items-center text-center gap-4 max-w-xs mx-auto">
              <span className="text-4xl" aria-hidden="true">📅</span>
              <div className="space-y-1.5">
                <p className="text-sm sm:text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                  Your money calendar starts here
                </p>
                <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                  Add or upload dated income and expenses to see your month.
                </p>
              </div>
              <div className="flex flex-col gap-2.5 w-full">
                <Link
                  href="/upload"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#2563EB] text-white font-bold text-sm hover:bg-blue-600 transition-colors shadow-sm"
                >
                  Upload financial activity →
                </Link>
                <Link
                  href="/add-expense"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] text-[#0F2747] dark:text-[#F8FAFC] font-bold text-sm hover:bg-slate-50 dark:hover:bg-[#1E304C] transition-colors shadow-sm"
                >
                  ➕ Add expense
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── CALENDAR CARD (shown when has any data) ── */}
        {hasAnyData && (
          <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-sm min-w-0">

            {/* Month navigation */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <button
                onClick={goPrev}
                aria-label="Previous month"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-[#52657A] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <h2 className="text-sm sm:text-base font-bold text-[#0F2747] dark:text-[#F8FAFC] text-center min-w-0 truncate">
                {monthLabel(viewYear, viewMonth)}
              </h2>

              <button
                onClick={goNext}
                aria-label="Next month"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-[#52657A] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* No data for this month notice */}
            {hasAnyData && !hasDatedData && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-800 dark:text-amber-200 font-semibold text-center">
                  No transactions dated in {monthLabel(viewYear, viewMonth)}.
                </p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-300 text-center mt-0.5">
                  Use ← → to navigate to a month with activity.
                </p>
              </div>
            )}

            {/* Calendar grid */}
            <CalendarGrid
              year={viewYear}
              month={viewMonth}
              dayMap={dayMap}
              today={todayStr}
              onDayClick={setSelectedDay}
            />
          </div>
        )}

        {/* ── MONTHLY SUMMARY ── */}
        {hasAnyData && hasDatedData && (
          <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm min-w-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8] mb-3">
              Month Summary
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="text-center space-y-0.5">
                <p className="text-[10px] sm:text-xs font-bold text-[#059669] dark:text-[#34D399] uppercase tracking-wider">Income</p>
                <p className="text-sm sm:text-xl font-extrabold font-mono text-[#0F2747] dark:text-[#F8FAFC] leading-none">
                  {formatRupees(monthlyIncome)}
                </p>
              </div>
              <div className="text-center space-y-0.5">
                <p className="text-[10px] sm:text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Expenses</p>
                <p className="text-sm sm:text-xl font-extrabold font-mono text-[#0F2747] dark:text-[#F8FAFC] leading-none">
                  {formatRupees(monthlyExpense)}
                </p>
              </div>
              <div className="text-center space-y-0.5">
                <p className="text-[10px] sm:text-xs font-bold text-[#52657A] dark:text-[#94A3B8] uppercase tracking-wider">Net</p>
                <p
                  className={`text-sm sm:text-xl font-extrabold font-mono leading-none ${
                    monthlyNet >= 0
                      ? 'text-[#059669] dark:text-[#34D399]'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {monthlyNet >= 0 ? '+' : '-'}{formatRupees(Math.abs(monthlyNet))}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── WATCH THIS PERIOD (only when >= 2 pressure days with data) ── */}
        {showPressureSection && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg" aria-hidden="true">⚠️</span>
              <h2 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                Watch this period
              </h2>
            </div>
            <p className="text-xs text-amber-800/80 dark:text-amber-300 leading-relaxed">
              Based on your recorded activity, these days had higher spending with no income coming in.
            </p>
            <div className="space-y-2">
              {pressureDays.map((d) => (
                <button
                  key={d.dateStr}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className="w-full flex items-center justify-between bg-white/70 dark:bg-black/20 rounded-xl px-3 sm:px-4 py-2.5 hover:bg-white dark:hover:bg-black/30 transition-colors text-left min-w-0 gap-2"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] block truncate">
                      {new Date(d.dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <span className="text-[11px] text-amber-800/70 dark:text-amber-300">
                      {d.events.length} transaction{d.events.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 shrink-0">
                    -{formatRupees(d.expense)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── ACTIVITY LIST ── */}
        {hasDatedData && (
          <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-3 min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
              Activity — {monthLabel(viewYear, viewMonth)}
            </h2>
            <div className="divide-y divide-[#E2E8F0] dark:divide-[#26354D]">
              {[...dayMap.values()]
                .filter((d) => d.events.length > 0)
                .sort((a, b) => b.dateStr.localeCompare(a.dateStr))
                .map((d) => (
                  <button
                    key={d.dateStr}
                    type="button"
                    onClick={() => setSelectedDay(d)}
                    className="w-full py-3 text-left hover:bg-slate-50 dark:hover:bg-[#17243A] transition-colors rounded-xl px-2 -mx-2 min-w-0"
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#52657A] dark:text-[#94A3B8] block">
                          {new Date(d.dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        <span className="text-[11px] text-[#52657A] dark:text-[#94A3B8]">
                          {d.events.length} transaction{d.events.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        {d.income > 0 && (
                          <span className="block text-[11px] sm:text-xs font-bold text-[#059669] dark:text-[#34D399]">
                            +{formatRupees(d.income)}
                          </span>
                        )}
                        {d.expense > 0 && (
                          <span className="block text-[11px] sm:text-xs font-bold text-rose-600 dark:text-rose-400">
                            -{formatRupees(d.expense)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* ── CROSS-LINK ── */}
        {analysisResult && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] min-w-0">
            <p className="text-xs text-[#52657A] dark:text-[#CBD5E1]">
              See your full financial picture
            </p>
            <Link
              href="/my-money"
              className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline shrink-0"
            >
              My Money →
            </Link>
          </div>
        )}

      </div>
    </>
  );
}
