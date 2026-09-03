/**
 * Transaction Domain Module
 * 
 * Defines standard normalized transaction models, categorization types,
 * duplicate suspect markers, and serialization contracts.
 */

import { Money, SerializedMoney, serializeMoney, deserializeMoney } from './money';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export type ExpenseCategory =
  | 'ESSENTIAL_HOUSING'
  | 'ESSENTIAL_GROCERIES'
  | 'ESSENTIAL_UTILITIES'
  | 'WORK_FUEL_TRANSIT'
  | 'WORK_EQUIPMENT'
  | 'DEBT_REPAYMENT'
  | 'HEALTHCARE'
  | 'DISCRETIONARY'
  | 'FEES_CHARGES'
  | 'TRANSFER'
  | 'INCOME'
  | 'UNCATEGORIZED';

export interface RecurringMetadata {
  isRecurring: boolean;
  frequencyDays?: number; // Estimated interval in days (e.g. 7, 14, 30, 90)
  clusterId?: string; // Grouping ID for related repeated transactions
  frequencyType?: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY';
  serviceTypeNote?: string; // e.g. "May be a subscription or recurring service"
}

export interface NormalizedTransaction {
  id: string;
  date: string; // ISO 8601 YYYY-MM-DD
  rawDescription: string;
  normalizedMerchant: string;
  amount: Money;
  type: TransactionType;
  category: ExpenseCategory;
  sourceReference: string; // e.g. filename or statement ID
  sourceRowNumber: number;
  confidence: number; // 0.0 to 1.0
  isDuplicateSuspected?: boolean;
  duplicateReason?: string;
  recurring?: RecurringMetadata;
}

export interface SerializedTransaction {
  id: string;
  date: string;
  rawDescription: string;
  normalizedMerchant: string;
  amount: SerializedMoney;
  type: TransactionType;
  category: ExpenseCategory;
  sourceReference: string;
  sourceRowNumber: number;
  confidence: number;
  isDuplicateSuspected?: boolean;
  duplicateReason?: string;
  recurring?: RecurringMetadata;
}

/**
 * Checks whether an expense category is considered essential for gig and informal workers.
 * Essential categories are non-negotiable costs required for basic living and earning.
 */
export function isEssentialCategory(category: ExpenseCategory): boolean {
  switch (category) {
    case 'ESSENTIAL_HOUSING':
    case 'ESSENTIAL_GROCERIES':
    case 'ESSENTIAL_UTILITIES':
    case 'WORK_FUEL_TRANSIT': // Crucial for ride-hailing/delivery gig workers
    case 'HEALTHCARE':
    case 'DEBT_REPAYMENT': // Non-discretionary contractual commitments
      return true;
    default:
      return false;
  }
}

/**
 * Serializes a NormalizedTransaction for safe JSON transmission.
 */
export function serializeTransaction(tx: NormalizedTransaction): SerializedTransaction {
  return {
    ...tx,
    amount: serializeMoney(tx.amount),
  };
}

/**
 * Deserializes a SerializedTransaction from JSON into the internal domain model.
 */
export function deserializeTransaction(tx: SerializedTransaction): NormalizedTransaction {
  return {
    ...tx,
    amount: deserializeMoney(tx.amount),
  };
}
