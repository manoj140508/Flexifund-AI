'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  SerializedFinancialAnalysisResult,
  recalculateResilienceWithCash,
} from '@/domain/analysis';
import { WorkerCategory } from '@/domain/schemes';
import {
  ExtractedStatementTransaction,
  StatementExtractionResult,
  StatementSourceType,
} from '@/lib/statement-extractor';
import { useAuth } from '@/context/AuthContext';

export interface UserProfile {
  workerType: WorkerCategory | string;
  jurisdiction: string;
  state?: string;
  city?: string;
  age?: number;
  currentCashBalanceRupees: string;
  monthlyFinancialGoalRupees?: string;
  financialGoal: string;
  primaryConcern: string;
  hasBankAccount: boolean;
  isCoveredUnderEPFO_ESIC: boolean;
}

interface FinancialDataContextType {
  profile: UserProfile;
  analysisResult: SerializedFinancialAnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  extractedDraft: StatementExtractionResult | null;
  setExtractedDraft: (_draft: StatementExtractionResult | null) => void;
  updateProfile: (_updates: Partial<UserProfile>) => void;
  updateCurrentCash: (_cashRupees: string) => { success: boolean; error?: string };
  setAnalysisResult: (_result: SerializedFinancialAnalysisResult | null) => void;
  analyzeCSV: (_csvData: string | File, _filename?: string) => Promise<boolean>;
  analyzeTransactions: (
    _transactions: ExtractedStatementTransaction[],
    _sourceType: StatementSourceType,
    _sourceReference?: string,
    _confirmedClosingBalanceRupees?: string
  ) => Promise<boolean>;
  confirmedTransactions: ExtractedStatementTransaction[];
  addConfirmedExpense: (_expense: {
    description: string;
    amountRupees: number;
    category?: string;
    date?: string;
    source?: string;
  }) => Promise<boolean>;
  extractStatement: (_files: File | File[], _sourceType: StatementSourceType) => Promise<StatementExtractionResult>;
  loadSampleData: () => Promise<boolean>;
  clearData: () => void;
}

const defaultProfile: UserProfile = {
  workerType: 'DELIVERY_WORKER',
  jurisdiction: 'Karnataka',
  state: 'Karnataka',
  city: 'Bengaluru',
  age: 27,
  currentCashBalanceRupees: '',
  monthlyFinancialGoalRupees: '',
  financialGoal: 'Build emergency savings',
  primaryConcern: 'Income changes',
  hasBankAccount: true,
  isCoveredUnderEPFO_ESIC: false,
};

const FinancialDataContext = createContext<FinancialDataContextType | undefined>(undefined);

export function FinancialDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userPrefix = user?.id ? `flexifund_${user.id}_` : 'flexifund_guest_';

  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [analysisResult, setAnalysisResultState] = useState<SerializedFinancialAnalysisResult | null>(null);
  const [confirmedTransactions, setConfirmedTransactions] = useState<ExtractedStatementTransaction[]>([]);
  const [extractedDraft, setExtractedDraftState] = useState<StatementExtractionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize from sessionStorage on mount or when user changes
  useEffect(() => {
    try {
      const savedProfile = sessionStorage.getItem(`${userPrefix}profile`);
      let savedAnalysis = sessionStorage.getItem(`${userPrefix}analysis`);
      let savedTxs = sessionStorage.getItem(`${userPrefix}confirmed_transactions`);

      // Guest to user session fallback: If logging in with existing guest data in session, migrate it
      if (user?.id && !savedTxs) {
        const guestTxs = sessionStorage.getItem('flexifund_guest_confirmed_transactions');
        if (guestTxs) {
          savedTxs = guestTxs;
          try {
            sessionStorage.setItem(`${userPrefix}confirmed_transactions`, guestTxs);
          } catch {}
        }
      }
      if (user?.id && !savedAnalysis) {
        const guestAnalysis = sessionStorage.getItem('flexifund_guest_analysis');
        if (guestAnalysis) {
          savedAnalysis = guestAnalysis;
          try {
            sessionStorage.setItem(`${userPrefix}analysis`, guestAnalysis);
          } catch {}
        }
      }

      let initialAnalysis: SerializedFinancialAnalysisResult | null = savedAnalysis ? JSON.parse(savedAnalysis) : null;

      if (savedTxs) {
        try {
          setConfirmedTransactions(JSON.parse(savedTxs));
        } catch {
          setConfirmedTransactions([]);
        }
      } else {
        setConfirmedTransactions([]);
      }

      if (savedProfile) {
        const parsedProfile: UserProfile = JSON.parse(savedProfile);
        setProfile(parsedProfile);
        if (
          initialAnalysis &&
          parsedProfile.currentCashBalanceRupees &&
          !isNaN(Number(parsedProfile.currentCashBalanceRupees)) &&
          Number(parsedProfile.currentCashBalanceRupees) >= 0
        ) {
          const paise = BigInt(Math.round(Number(parsedProfile.currentCashBalanceRupees) * 100));
          initialAnalysis = recalculateResilienceWithCash(initialAnalysis, paise);
        }
      } else {
        setProfile(user ? { ...defaultProfile } : defaultProfile);
      }

      if (initialAnalysis) {
        setAnalysisResultState(initialAnalysis);
      } else {
        setAnalysisResultState(null);
      }

      const savedDraft = sessionStorage.getItem(`${userPrefix}draft_extraction`);
      if (savedDraft) {
        setExtractedDraftState(JSON.parse(savedDraft));
      } else {
        setExtractedDraftState(null);
      }
    } catch {
      // Ignore sessionStorage parsing failures in SSR/private browsing
    }
  }, [user, userPrefix]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const updated = { ...prev, ...updates };
      try {
        sessionStorage.setItem(`${userPrefix}profile`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const updateCurrentCash = (cashRupees: string): { success: boolean; error?: string } => {
    const cleanStr = cashRupees.trim().replace(/,/g, '');
    if (cleanStr === '') {
      updateProfile({ currentCashBalanceRupees: '' });
      if (analysisResult) {
        const updated = recalculateResilienceWithCash(analysisResult, null);
        setAnalysisResult(updated);
      }
      return { success: true };
    }

    const num = Number(cleanStr);
    if (isNaN(num) || num < 0 || !isFinite(num)) {
      return {
        success: false,
        error: 'Please enter a valid non-negative currency amount (e.g. ₹12,000).',
      };
    }

    const paise = BigInt(Math.round(num * 100));
    updateProfile({ currentCashBalanceRupees: cleanStr });

    if (analysisResult) {
      const updated = recalculateResilienceWithCash(analysisResult, paise);
      setAnalysisResult(updated);
    }
    return { success: true };
  };

  const setAnalysisResult = (result: SerializedFinancialAnalysisResult | null) => {
    setAnalysisResultState(result);
    try {
      if (result) {
        sessionStorage.setItem(`${userPrefix}analysis`, JSON.stringify(result));
      } else {
        sessionStorage.removeItem(`${userPrefix}analysis`);
      }
    } catch {}
  };

  const setExtractedDraft = (draft: StatementExtractionResult | null) => {
    setExtractedDraftState(draft);
    try {
      if (draft) {
        sessionStorage.setItem(`${userPrefix}draft_extraction`, JSON.stringify(draft));
      } else {
        sessionStorage.removeItem(`${userPrefix}draft_extraction`);
      }
    } catch {}
  };

  // CSV Ingestion
  const analyzeCSV = async (csvData: string | File, filename = 'statement.csv'): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      let res: Response;
      if (typeof csvData === 'string') {
        res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            csvContent: csvData,
            sourceReference: filename,
            sourceType: 'CSV',
            currentCashBalanceRupees: profile.currentCashBalanceRupees || undefined,
          }),
        });
      } else {
        const formData = new FormData();
        formData.append('file', csvData);
        formData.append('sourceReference', csvData.name);
        formData.append('sourceType', 'CSV');
        if (profile.currentCashBalanceRupees) {
          formData.append('currentCashBalanceRupees', profile.currentCashBalanceRupees);
        }
        res = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
        });
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.message || `Analysis failed with status ${res.status}`);
      }

      const data: SerializedFinancialAnalysisResult & { transactions?: ExtractedStatementTransaction[] } = await res.json();
      setAnalysisResult(data);
      setExtractedDraft(null);
      if (data.transactions && Array.isArray(data.transactions)) {
        setConfirmedTransactions(data.transactions);
        try {
          sessionStorage.setItem(`${userPrefix}confirmed_transactions`, JSON.stringify(data.transactions));
        } catch {}
      }
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to process financial statement');
      setIsLoading(false);
      return false;
    }
  };

  // Extract from PDF or Screenshot(s)
  const extractStatement = async (files: File | File[], sourceType: StatementSourceType): Promise<StatementExtractionResult> => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      const fileList = Array.isArray(files) ? files : [files];
      for (const f of fileList) {
        formData.append('files', f);
      }
      formData.append('sourceType', sourceType);

      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      const data: StatementExtractionResult = await res.json();

      if (!res.ok || !data.success) {
        const errorObj: any = new Error(
          data.errorMessage || "We couldn't read the transactions in this screenshot."
        );
        errorObj.devDebug = data.devDebug;
        errorObj.debugOcr = data.debugOcr;
        throw errorObj;
      }

      setExtractedDraft(data);
      setIsLoading(false);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to extract bank statement.');
      setIsLoading(false);
      throw err;
    }
  };

  // Analyze confirmed reviewed transactions from PDF / Image / CSV
  const analyzeTransactions = async (
    transactions: ExtractedStatementTransaction[],
    sourceType: StatementSourceType,
    sourceReference = 'statement',
    confirmedClosingBalanceRupees?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      // If user explicitly confirmed closing balance as cash buffer
      const effectiveCash =
        confirmedClosingBalanceRupees !== undefined && confirmedClosingBalanceRupees !== ''
          ? confirmedClosingBalanceRupees
          : profile.currentCashBalanceRupees;

      if (confirmedClosingBalanceRupees) {
        updateProfile({ currentCashBalanceRupees: confirmedClosingBalanceRupees });
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions,
          sourceType,
          sourceReference,
          currentCashBalanceRupees: effectiveCash || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.message || `Analysis failed with status ${res.status}`);
      }

      const data: SerializedFinancialAnalysisResult & { transactions?: ExtractedStatementTransaction[] } = await res.json();
      setAnalysisResult(data);
      setExtractedDraft(null);
      const finalTxs = data.transactions && Array.isArray(data.transactions) ? data.transactions : transactions;
      setConfirmedTransactions(finalTxs);
      try {
        sessionStorage.setItem(`${userPrefix}confirmed_transactions`, JSON.stringify(finalTxs));
      } catch {}
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to process reviewed transactions');
      setIsLoading(false);
      return false;
    }
  };

  const addConfirmedExpense = async (expense: {
    description: string;
    amountRupees: number;
    category?: string;
    date?: string;
    source?: string;
  }): Promise<boolean> => {
    // Read current transactions list (fallback to sessionStorage if React state hasn't populated yet)
    let currentList = confirmedTransactions;
    if (currentList.length === 0 && typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(`${userPrefix}confirmed_transactions`);
        if (saved) {
          currentList = JSON.parse(saved);
        }
      } catch {}
    }

    const paise = BigInt(Math.round(expense.amountRupees * 100));
    const newTxId = `expense_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newTx: ExtractedStatementTransaction = {
      id: newTxId,
      date: expense.date || new Date().toISOString().slice(0, 10),
      description: expense.description.trim() || 'General Expense',
      amountPaise: paise.toString(),
      type: 'DEBIT',
      category: expense.category || 'OTHER_EXPENSE',
      source: expense.source || 'Manual',
      confidence: 'HIGH',
      confidenceReason: 'Confirmed by user via direct entry',
      rawText: `${expense.description} ₹${expense.amountRupees}`,
      needsReview: false,
    };

    // Duplicate protection: prevent accidental rapid double-click or replay within 3 seconds
    const isDuplicate = currentList.some(
      (t) =>
        t.id === newTxId ||
        (t.description.toLowerCase() === newTx.description.toLowerCase() &&
          t.date === newTx.date &&
          t.amountPaise === newTx.amountPaise &&
          t.id.startsWith('expense_') &&
          Date.now() - (Number(t.id.split('_')[1]) || 0) < 3000)
    );
    if (isDuplicate) {
      return true;
    }

    // IMMUTABLE APPEND — Never overwrite or replace original transactions
    const updated = [...currentList, newTx];
    return await analyzeTransactions(updated, 'IMAGE', 'user-added-expense');
  };

  const loadSampleData = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const sampleRes = await fetch('/sample-statement.csv');
      if (!sampleRes.ok) throw new Error('Could not fetch sample CSV file');
      const csvText = await sampleRes.text();
      return await analyzeCSV(csvText, 'sample-statement.csv');
    } catch (err: any) {
      setError(err.message || 'Failed to load sample dataset');
      setIsLoading(false);
      return false;
    }
  };

  const clearData = () => {
    setAnalysisResult(null);
    setExtractedDraft(null);
    setConfirmedTransactions([]);
    setError(null);
    try {
      sessionStorage.removeItem(`${userPrefix}analysis`);
      sessionStorage.removeItem(`${userPrefix}draft_extraction`);
      sessionStorage.removeItem(`${userPrefix}confirmed_transactions`);
      sessionStorage.removeItem(`${userPrefix}profile`);
    } catch {}
  };

  return (
    <FinancialDataContext.Provider
      value={{
        profile,
        analysisResult,
        confirmedTransactions,
        addConfirmedExpense,
        isLoading,
        error,
        extractedDraft,
        setExtractedDraft,
        updateProfile,
        updateCurrentCash,
        setAnalysisResult,
        analyzeCSV,
        analyzeTransactions,
        extractStatement,
        loadSampleData,
        clearData,
      }}
    >
      {children}
    </FinancialDataContext.Provider>
  );
}

export function useFinancialData() {
  const context = useContext(FinancialDataContext);
  if (!context) {
    throw new Error('useFinancialData must be used within a FinancialDataProvider');
  }
  return context;
}
