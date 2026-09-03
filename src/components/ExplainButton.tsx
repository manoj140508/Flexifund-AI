'use client';

import React, { useState } from 'react';

interface ExplainButtonProps {
  topic:
    | 'INCOME_VOLATILITY'
    | 'SAVINGS_OPPORTUNITY'
    | 'SAVINGS_OPPORTUNITIES'
    | 'RESILIENCE_SCORE'
    | 'WHAT_IF_IMPACT'
    | 'WHAT_IF_SIMULATION'
    | 'ACTION_PRIORITY'
    | 'PRIORITIZED_ACTIONS'
    | 'CREDIT_PRESSURE'
    | 'CREDIT_AFFORDABILITY'
    | 'CONSERVATIVE_BASELINE'
    | 'ESSENTIAL_BURN_RATE'
    | string;
  contextEvidence: {
    metricName: string;
    observedValue: string;
    calculationInputs?: string;
    calculationResult?: string;
    explanation: string;
  };
  buttonLabel?: string;
}

export default function ExplainButton({
  topic,
  contextEvidence,
  buttonLabel = 'Why this matters',
}: ExplainButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleExplain = async () => {
    setIsOpen(true);
    if (explanation) return; // Cached

    setLoading(true);
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, contextEvidence }),
      });
      const data = await res.json();
      setExplanation(data.explanation || 'Educational analysis for irregular income.');
      setSource(data.source || 'DETERMINISTIC_ENGINE');
    } catch {
      setExplanation(contextEvidence.explanation);
      setSource('LOCAL_EVIDENCE');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleExplain}
        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 transition-colors"
      >
        <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {buttonLabel}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                  i
                </div>
                <h4 className="font-bold text-slate-900 text-base">
                  Understanding Your Resilience Finding
                </h4>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Verified evidence snippet */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 mb-4 space-y-1">
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Metric Analyzed:</span>
                <span className="font-semibold text-slate-900">{contextEvidence.metricName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Observed Value:</span>
                <span className="font-mono font-semibold text-slate-900">{contextEvidence.observedValue}</span>
              </div>
            </div>

            {/* Content / Loading */}
            <div className="text-slate-700 text-sm leading-relaxed min-h-[70px]">
              {loading ? (
                <div className="flex items-center gap-2 text-slate-500 py-4">
                  <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                  Synthesizing contextual explanation...
                </div>
              ) : (
                <p>{explanation}</p>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
              <span>Source: {source === 'AI_EXPLANATION_LAYER' ? 'AI Explanation (Evidence Grounded)' : 'Deterministic Knowledge Rule'}</span>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-800"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
