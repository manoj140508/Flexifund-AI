/**
 * Production CSV Ingestion & Normalization Engine
 * 
 * Non-negotiable guarantees:
 * 1. Accepts diverse bank statement formats:
 *    - Format A: Date, Description, Amount, Type
 *    - Format B: Date, Description, Debit, Credit
 *    - Format C: Date, Narration, Withdrawal, Deposit, Balance
 * 2. Parses Indian currency strings (e.g. "1,25,000.50", "₹500", "(250.00)") into exact integer paise.
 * 3. Normalizes multiple date formats (DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD/MM/YY).
 * 4. NEVER silently discards bad rows. Returns structured rejectedRows with line numbers, reasons, and original values.
 * 5. Flags duplicates as DUPLICATE_SUSPECTED without discarding them.
 * 6. BigInt safe API serialization.
 */

import { moneyFromPaise } from '../domain/money';
import { NormalizedTransaction, TransactionType, SerializedTransaction, serializeTransaction } from '../domain/transactions';
import { categorizeTransaction } from './categorization';

export interface RejectedRow {
  rowNumber: number;
  rawContent: string;
  reason: string;
  originalValues?: Record<string, string>;
}

export interface ParsingWarning {
  rowNumber?: number;
  code: 'DUPLICATE_SUSPECTED' | 'UNSUPPORTED_CURRENCY' | 'AMBIGUOUS_DATE' | 'MISSING_DESCRIPTION';
  message: string;
}

export interface ParseStatistics {
  totalRowsProcessed: number;
  validCount: number;
  rejectedCount: number;
  duplicateSuspectCount: number;
  totalIncomePaise: bigint;
  totalExpensePaise: bigint;
}

export interface SerializedParseStatistics {
  totalRowsProcessed: number;
  validCount: number;
  rejectedCount: number;
  duplicateSuspectCount: number;
  totalIncomePaise: string;
  totalExpensePaise: string;
}

export interface ParseCSVResult {
  validTransactions: NormalizedTransaction[];
  rejectedRows: RejectedRow[];
  warnings: ParsingWarning[];
  statistics: ParseStatistics;
}

export interface SerializedParseCSVResult {
  validTransactions: SerializedTransaction[];
  rejectedRows: RejectedRow[];
  warnings: ParsingWarning[];
  statistics: SerializedParseStatistics;
}

interface ColumnIndices {
  dateIdx: number;
  descIdx: number;
  amountIdx?: number;
  debitIdx?: number;
  creditIdx?: number;
  typeIdx?: number;
  currencyIdx?: number;
  balanceIdx?: number;
}

/**
 * Robust CSV parser that handles quotes, commas within quotes, and multiple newline styles.
 */
function parseCSVRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !insideQuotes) {
      currentRow.push(currentField.trim());
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Identifies column mapping from the CSV header row supporting Format A, B, and C.
 */
function identifyColumns(headers: string[]): ColumnIndices {
  const cleanHeaders = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  let dateIdx = -1;
  let descIdx = -1;
  let amountIdx = -1;
  let debitIdx = -1;
  let creditIdx = -1;
  let typeIdx = -1;
  let currencyIdx = -1;
  let balanceIdx = -1;

  for (let i = 0; i < cleanHeaders.length; i++) {
    const h = cleanHeaders[i];

    // Date
    if (dateIdx === -1 && (h === 'date' || h === 'txndate' || h === 'transactiondate' || h === 'valuedate' || h === 'postdate')) {
      dateIdx = i;
    }

    // Description / Particulars / Narration
    if (
      descIdx === -1 &&
      (h === 'description' ||
        h === 'narration' ||
        h === 'particulars' ||
        h === 'details' ||
        h === 'remark' ||
        h === 'remarks' ||
        h === 'payee' ||
        h === 'merchant')
    ) {
      descIdx = i;
    }

    // Amount (Single column)
    if (amountIdx === -1 && (h === 'amount' || h === 'txnamount' || h === 'netamount' || h === 'transactionamount')) {
      amountIdx = i;
    }

    // Separate Debit / Withdrawal (Format B & C)
    if (
      debitIdx === -1 &&
      (h === 'debit' || h === 'debitamount' || h === 'dr' || h === 'withdrawal' || h === 'withdrawalamount' || h === 'withdrawals')
    ) {
      debitIdx = i;
    }

    // Separate Credit / Deposit (Format B & C)
    if (
      creditIdx === -1 &&
      (h === 'credit' || h === 'creditamount' || h === 'cr' || h === 'deposit' || h === 'depositamount' || h === 'deposits')
    ) {
      creditIdx = i;
    }

    // Transaction Type / Direction (Format A)
    if (typeIdx === -1 && (h === 'type' || h === 'txntype' || h === 'crdr' || h === 'direction' || h === 'drcr' || h === 'transactiontype')) {
      typeIdx = i;
    }

    // Currency
    if (currencyIdx === -1 && (h === 'currency' || h === 'ccy')) {
      currencyIdx = i;
    }

    // Balance (Format C)
    if (balanceIdx === -1 && (h === 'balance' || h === 'closingbalance' || h === 'availbalance' || h === 'availablebalance' || h === 'netbalance')) {
      balanceIdx = i;
    }
  }

  return { dateIdx, descIdx, amountIdx, debitIdx, creditIdx, typeIdx, currencyIdx, balanceIdx };
}

/**
 * Normalizes dates from various bank formats into ISO 8601 (YYYY-MM-DD).
 */
export function normalizeDate(rawDate: string): string | null {
  const clean = rawDate.trim().replace(/[./]/g, '-');
  const parts = clean.split('-');

  if (parts.length !== 3) return null;

  let y: number, m: number, d: number;

  if (parts[0].length === 4) {
    // YYYY-MM-DD
    y = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
    d = parseInt(parts[2], 10);
  } else if (parts[2].length === 4) {
    // DD-MM-YYYY (Standard Indian banking date)
    d = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
    y = parseInt(parts[2], 10);
  } else if (parts[2].length === 2) {
    // DD-MM-YY
    d = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
    y = 2000 + parseInt(parts[2], 10);
  } else {
    return null;
  }

  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;

  return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
}

/**
 * Parses raw rupee string into integer paise.
 * Returns null if string is empty or invalid.
 */
export function parseAmountToPaise(rawAmount: string): { paise: bigint; isExplicitNegative: boolean } | null {
  let clean = rawAmount.trim();
  if (!clean) return null;

  // Handle accounting parentheses: "(500.00)" -> "-500.00"
  let isExplicitNegative = false;
  if (clean.startsWith('(') && clean.endsWith(')')) {
    clean = clean.slice(1, -1);
    isExplicitNegative = true;
  }

  // Remove currency symbols, INR tags, and commas
  clean = clean.replace(/[₹\s,]|INR|Rs\.?|RS\.?/gi, '');

  if (clean.startsWith('-')) {
    isExplicitNegative = true;
    clean = clean.slice(1);
  } else if (clean.startsWith('+')) {
    clean = clean.slice(1);
  }

  if (!clean || clean === '.') return null;

  const parts = clean.split('.');
  if (parts.length > 2) return null;

  const wholeStr = parts[0] || '0';
  const fracStr = (parts[1] || '').padEnd(2, '0').slice(0, 2);

  if (!/^\d+$/.test(wholeStr) || !/^\d+$/.test(fracStr)) return null;

  const paise = BigInt(wholeStr) * 100n + BigInt(fracStr);
  return { paise, isExplicitNegative };
}

/**
 * Ingests, validates, and normalizes a CSV bank statement.
 */
export function parseTransactionCSV(
  csvContent: string,
  sourceReference = 'statement.csv'
): ParseCSVResult {
  const rejectedRows: RejectedRow[] = [];
  const warnings: ParsingWarning[] = [];
  const validTransactions: NormalizedTransaction[] = [];

  const rawRows = parseCSVRows(csvContent);

  if (rawRows.length === 0) {
    return {
      validTransactions: [],
      rejectedRows: [{ rowNumber: 1, rawContent: '', reason: 'Empty file provided' }],
      warnings: [],
      statistics: {
        totalRowsProcessed: 0,
        validCount: 0,
        rejectedCount: 0,
        duplicateSuspectCount: 0,
        totalIncomePaise: 0n,
        totalExpensePaise: 0n,
      },
    };
  }

  const headers = rawRows[0];
  const col = identifyColumns(headers);

  // Validate critical columns
  const hasDate = col.dateIdx !== -1;
  const hasAmount = col.amountIdx !== -1;
  const hasDebitCredit = col.debitIdx !== -1 || col.creditIdx !== -1;

  if (!hasDate) {
    return {
      validTransactions: [],
      rejectedRows: [{ rowNumber: 1, rawContent: headers.join(','), reason: 'Missing required "Date" column in CSV header' }],
      warnings: [],
      statistics: { totalRowsProcessed: 1, validCount: 0, rejectedCount: 1, duplicateSuspectCount: 0, totalIncomePaise: 0n, totalExpensePaise: 0n },
    };
  }

  if (!hasAmount && !hasDebitCredit) {
    return {
      validTransactions: [],
      rejectedRows: [
        {
          rowNumber: 1,
          rawContent: headers.join(','),
          reason: 'CSV must contain an "Amount" column or separate "Debit"/"Credit" (or "Withdrawal"/"Deposit") columns in header',
        },
      ],
      warnings: [],
      statistics: { totalRowsProcessed: 1, validCount: 0, rejectedCount: 1, duplicateSuspectCount: 0, totalIncomePaise: 0n, totalExpensePaise: 0n },
    };
  }

  let totalIncomePaise = 0n;
  let totalExpensePaise = 0n;
  let duplicateSuspectCount = 0;
  const seenTxSignatures = new Map<string, number>(); // signature -> first seen rowNumber

  for (let r = 1; r < rawRows.length; r++) {
    const rowNumber = r + 1; // 1-indexed for human readability
    const row = rawRows[r];
    const rawLine = row.join(',');

    // Skip empty trailing lines
    if (row.length === 1 && !row[0].trim()) continue;

    // Date validation
    const rawDate = row[col.dateIdx] ?? '';
    const isoDate = normalizeDate(rawDate);
    if (!isoDate) {
      rejectedRows.push({
        rowNumber,
        rawContent: rawLine,
        reason: `Invalid or unparseable date: "${rawDate}". Expected DD/MM/YYYY or YYYY-MM-DD.`,
        originalValues: { Date: rawDate },
      });
      continue;
    }

    // Description extraction
    const rawDesc = col.descIdx !== -1 ? (row[col.descIdx] ?? '').trim() : '';
    if (!rawDesc) {
      warnings.push({
        rowNumber,
        code: 'MISSING_DESCRIPTION',
        message: `Row ${rowNumber} has an empty description. Categorized as UNCATEGORIZED.`,
      });
    }

    // Currency validation
    if (col.currencyIdx !== undefined && col.currencyIdx !== -1) {
      const ccy = (row[col.currencyIdx] ?? '').trim().toUpperCase();
      if (ccy && ccy !== 'INR' && ccy !== 'RS') {
        warnings.push({
          rowNumber,
          code: 'UNSUPPORTED_CURRENCY',
          message: `Row ${rowNumber} has non-INR currency "${ccy}". FlexiFund AI calculates in INR only.`,
        });
      }
    }

    // Determine Direction and Amount
    let type: TransactionType = 'EXPENSE';
    let amountPaise = 0n;

    if (hasDebitCredit) {
      // Debit / Credit column structure (Format B & C)
      const rawDebit = col.debitIdx !== undefined && col.debitIdx !== -1 ? (row[col.debitIdx] ?? '') : '';
      const rawCredit = col.creditIdx !== undefined && col.creditIdx !== -1 ? (row[col.creditIdx] ?? '') : '';

      const parsedDebit = parseAmountToPaise(rawDebit);
      const parsedCredit = parseAmountToPaise(rawCredit);

      if (parsedCredit && parsedCredit.paise > 0n) {
        type = 'INCOME';
        amountPaise = parsedCredit.paise;
      } else if (parsedDebit && parsedDebit.paise > 0n) {
        type = 'EXPENSE';
        amountPaise = parsedDebit.paise;
      } else {
        rejectedRows.push({
          rowNumber,
          rawContent: rawLine,
          reason: 'Both Debit/Withdrawal and Credit/Deposit columns are empty or zero.',
          originalValues: { Debit: rawDebit, Credit: rawCredit },
        });
        continue;
      }
    } else if (col.amountIdx !== undefined && col.amountIdx !== -1) {
      // Single Amount column (Format A)
      const rawAmount = row[col.amountIdx] ?? '';
      const parsed = parseAmountToPaise(rawAmount);

      if (!parsed || parsed.paise === 0n) {
        rejectedRows.push({
          rowNumber,
          rawContent: rawLine,
          reason: `Invalid or zero amount value: "${rawAmount}".`,
          originalValues: { Amount: rawAmount },
        });
        continue;
      }

      amountPaise = parsed.paise;

      // Determine type from type column or sign
      if (col.typeIdx !== undefined && col.typeIdx !== -1) {
        const typeStr = (row[col.typeIdx] ?? '').trim().toUpperCase();
        if (typeStr === 'CR' || typeStr === 'CREDIT' || typeStr === 'INCOME' || typeStr === 'DEPOSIT') {
          type = 'INCOME';
        } else if (typeStr === 'DR' || typeStr === 'DEBIT' || typeStr === 'EXPENSE' || typeStr === 'WITHDRAWAL') {
          type = 'EXPENSE';
        } else {
          type = parsed.isExplicitNegative ? 'EXPENSE' : 'INCOME';
        }
      } else {
        type = parsed.isExplicitNegative ? 'EXPENSE' : 'INCOME';
      }
    }

    // Categorize deterministically
    const { category, normalizedMerchant, confidence } = categorizeTransaction(rawDesc, type);

    // Deterministic duplicate detection: Date + Amount + NormalizedMerchant/Description + Direction
    const normalizedDescKey = (normalizedMerchant || rawDesc).toLowerCase().replace(/[^a-z0-9]/g, '');
    const signature = `${isoDate}_${amountPaise}_${type}_${normalizedDescKey}`;
    let isDuplicateSuspected = false;
    let duplicateReason: string | undefined;

    if (seenTxSignatures.has(signature)) {
      const prevRow = seenTxSignatures.get(signature)!;
      isDuplicateSuspected = true;
      duplicateReason = `Suspected duplicate: identical date, amount, direction, and description matching Row ${prevRow}.`;
      duplicateSuspectCount += 1;
      warnings.push({
        rowNumber,
        code: 'DUPLICATE_SUSPECTED',
        message: `Row ${rowNumber} appears to be a duplicate of Row ${prevRow} on ${isoDate} for ₹${Number(amountPaise) / 100}. Marked as DUPLICATE_SUSPECTED.`,
      });
    } else {
      seenTxSignatures.set(signature, rowNumber);
    }

    const tx: NormalizedTransaction = {
      id: `tx_${r}_${rowNumber}_${amountPaise}`,
      date: isoDate,
      rawDescription: rawDesc,
      normalizedMerchant,
      amount: moneyFromPaise(amountPaise),
      type,
      category,
      sourceReference,
      sourceRowNumber: rowNumber,
      confidence,
      isDuplicateSuspected,
      duplicateReason,
    };

    validTransactions.push(tx);

    if (type === 'INCOME') {
      totalIncomePaise += amountPaise;
    } else if (type === 'EXPENSE') {
      totalExpensePaise += amountPaise;
    }
  }

  return {
    validTransactions,
    rejectedRows,
    warnings,
    statistics: {
      totalRowsProcessed: rawRows.length - 1,
      validCount: validTransactions.length,
      rejectedCount: rejectedRows.length,
      duplicateSuspectCount,
      totalIncomePaise,
      totalExpensePaise,
    },
  };
}

/**
 * Serializes ParseCSVResult safely for JSON API boundaries.
 */
export function serializeParseCSVResult(result: ParseCSVResult): SerializedParseCSVResult {
  return {
    validTransactions: result.validTransactions.map(serializeTransaction),
    rejectedRows: result.rejectedRows,
    warnings: result.warnings,
    statistics: {
      totalRowsProcessed: result.statistics.totalRowsProcessed,
      validCount: result.statistics.validCount,
      rejectedCount: result.statistics.rejectedCount,
      duplicateSuspectCount: result.statistics.duplicateSuspectCount,
      totalIncomePaise: result.statistics.totalIncomePaise.toString(),
      totalExpensePaise: result.statistics.totalExpensePaise.toString(),
    },
  };
}
