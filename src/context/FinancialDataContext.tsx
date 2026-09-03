'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SerializedFinancialAnalysisResult } from '@/domain/analysis';
import { WorkerCategory } from '@/domain/schemes';
import {
  ExtractedStatementTransaction,
  StatementExtractionResult,
  StatementSourceType,
} from '@/lib/statement-extractor';

export interface UserProfile {
  workerType: WorkerCategory | string;
  jurisdiction: string;
  state?: string;
  city?: string;
  age?: number;
  currentCashBalanceRupees: string;
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
  setAnalysisResult: (_result: SerializedFinancialAnalysisResult | null) => void;
  analyzeCSV: (_csvData: string | File, _filename?: string) => Promise<boolean>;
  analyzeTransactions: (
    _transactions: ExtractedStatementTransaction[],
    _sourceType: StatementSourceType,
    _sourceReference?: string,
    _confirmedClosingBalanceRupees?: string
  ) => Promise<boolean>;
  extractStatement: (_file: File, _sourceType: StatementSourceType) => Promise<StatementExtractionResult>;
  loadSampleData: () => Promise<boolean>;
  clearData: () => void;
}

const defaultProfile: UserProfile = {
  workerType: 'GIG_PLATFORM',
  jurisdiction: 'Karnataka',
  state: 'Karnataka',
  city: 'Bengaluru',
  age: 27,
  currentCashBalanceRupees: '',
  financialGoal: 'Build an emergency buffer of ₹25,000 to cover slow earning periods',
  primaryConcern: 'Fluctuating weekly payouts and unexpected vehicle fuel/maintenance expenses',
  hasBankAccount: true,
  isCoveredUnderEPFO_ESIC: false,
};

const FinancialDataContext = createContext<FinancialDataContextType | undefined>(undefined);

export function FinancialDataProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [analysisResult, setAnalysisResultState] = useState<SerializedFinancialAnalysisResult | null>(null);
  const [extractedDraft, setExtractedDraftState] = useState<StatementExtractionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize from sessionStorage on mount
  useEffect(() => {
    try {
      const savedProfile = sessionStorage.getItem('flexifund_profile');
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      }
      const savedAnalysis = sessionStorage.getItem('flexifund_analysis');
      if (savedAnalysis) {
        setAnalysisResultState(JSON.parse(savedAnalysis));
      }
      const savedDraft = sessionStorage.getItem('flexifund_draft_extraction');
      if (savedDraft) {
        setExtractedDraftState(JSON.parse(savedDraft));
      }
    } catch {
      // Ignore sessionStorage parsing failures in SSR/private browsing
    }
  }, []);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const updated = { ...prev, ...updates };
      try {
        sessionStorage.setItem('flexifund_profile', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const setAnalysisResult = (result: SerializedFinancialAnalysisResult | null) => {
    setAnalysisResultState(result);
    try {
      if (result) {
        sessionStorage.setItem('flexifund_analysis', JSON.stringify(result));
      } else {
        sessionStorage.removeItem('flexifund_analysis');
      }
    } catch {}
  };

  const setExtractedDraft = (draft: StatementExtractionResult | null) => {
    setExtractedDraftState(draft);
    try {
      if (draft) {
        sessionStorage.setItem('flexifund_draft_extraction', JSON.stringify(draft));
      } else {
        sessionStorage.removeItem('flexifund_draft_extraction');
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

      const data: SerializedFinancialAnalysisResult = await res.json();
      setAnalysisResult(data);
      setExtractedDraft(null);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to process financial statement');
      setIsLoading(false);
      return false;
    }
  };

  // Extract from PDF or Screenshot
  const extractStatement = async (file: File, sourceType: StatementSourceType): Promise<StatementExtractionResult> => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sourceType', sourceType);

      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      const data: StatementExtractionResult = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.errorMessage || 'Failed to extract transactions from the uploaded statement.'
        );
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

      const data: SerializedFinancialAnalysisResult = await res.json();
      setAnalysisResult(data);
      setExtractedDraft(null);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to process reviewed transactions');
      setIsLoading(false);
      return false;
    }
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
    setError(null);
    try {
      sessionStorage.removeItem('flexifund_analysis');
      sessionStorage.removeItem('flexifund_draft_extraction');
    } catch {}
  };

  return (
    <FinancialDataContext.Provider
      value={{
        profile,
        analysisResult,
        isLoading,
        error,
        extractedDraft,
        setExtractedDraft,
        updateProfile,
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
