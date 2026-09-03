/**
 * Persistence Abstraction Layer
 * 
 * Provides a clean repository contract (Hexagonal Port) allowing seamless switching
 * between in-memory local development and production database adapters (e.g. PostgreSQL via Prisma/Drizzle).
 * 
 * Non-negotiable: We do not pretend that an in-memory or JSON file is a production multi-user database.
 */

import { NormalizedTransaction } from '../domain/transactions';
import { UserEligibilityProfile } from '../domain/schemes';
import { IncomeAnalysis } from '../domain/income';
import { ExpenseAnalysis } from '../domain/expenses';
import { ResilienceAnalysis } from '../domain/resilience';
import { FinancialStressIndicator } from '../domain/stress';
import { ActionItem } from '../domain/prioritization';
import { Money } from '../domain/money';

export interface StoredUserProfile {
  id: string;
  createdAt: string;
  updatedAt: string;
  profile: UserEligibilityProfile;
  currentCashBalance?: Money | null;
}

export interface StoredAnalysisRun {
  id: string;
  profileId: string;
  createdAt: string;
  incomeAnalysis: IncomeAnalysis;
  expenseAnalysis: ExpenseAnalysis;
  resilienceAnalysis: ResilienceAnalysis;
  stressIndicators: FinancialStressIndicator[];
  prioritizedActions: ActionItem[];
}

/**
 * Production-ready repository interface
 */
export interface FinancialDataRepository {
  saveUserProfile(_user: StoredUserProfile): Promise<void>;
  getUserProfile(_id: string): Promise<StoredUserProfile | null>;
  saveTransactions(_profileId: string, _transactions: NormalizedTransaction[]): Promise<void>;
  getTransactions(_profileId: string): Promise<NormalizedTransaction[]>;
  saveAnalysisRun(_run: StoredAnalysisRun): Promise<void>;
  getLatestAnalysisRun(_profileId: string): Promise<StoredAnalysisRun | null>;
  clearData(_profileId: string): Promise<void>;
}

/**
 * In-Memory implementation for fast, friction-free local development and automated testing.
 */
export class InMemoryFinancialRepository implements FinancialDataRepository {
  private users = new Map<string, StoredUserProfile>();
  private transactions = new Map<string, NormalizedTransaction[]>();
  private analysisRuns = new Map<string, StoredAnalysisRun[]>();

  async saveUserProfile(user: StoredUserProfile): Promise<void> {
    this.users.set(user.id, { ...user, updatedAt: new Date().toISOString() });
  }

  async getUserProfile(id: string): Promise<StoredUserProfile | null> {
    return this.users.get(id) ?? null;
  }

  async saveTransactions(profileId: string, txs: NormalizedTransaction[]): Promise<void> {
    const existing = this.transactions.get(profileId) ?? [];
    this.transactions.set(profileId, [...existing, ...txs]);
  }

  async getTransactions(profileId: string): Promise<NormalizedTransaction[]> {
    return this.transactions.get(profileId) ?? [];
  }

  async saveAnalysisRun(run: StoredAnalysisRun): Promise<void> {
    const runs = this.analysisRuns.get(run.profileId) ?? [];
    runs.push(run);
    this.analysisRuns.set(run.profileId, runs);
  }

  async getLatestAnalysisRun(profileId: string): Promise<StoredAnalysisRun | null> {
    const runs = this.analysisRuns.get(profileId) ?? [];
    if (runs.length === 0) return null;
    return runs[runs.length - 1];
  }

  async clearData(profileId: string): Promise<void> {
    this.users.delete(profileId);
    this.transactions.delete(profileId);
    this.analysisRuns.delete(profileId);
  }
}

// Global default repository instance for the application runtime
let globalRepo: FinancialDataRepository = new InMemoryFinancialRepository();

export function getRepository(): FinancialDataRepository {
  return globalRepo;
}

export function setRepository(repo: FinancialDataRepository): void {
  globalRepo = repo;
}
