import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseTransactionCSV } from '@/lib/csv-parser';
import { moneyFromRupees, moneyFromPaise } from '@/domain/money';
import { runFinancialAnalysis, serializeFinancialAnalysisResult } from '@/domain/analysis';
import {
  NormalizedTransaction,
  TransactionType,
  ExpenseCategory,
} from '@/domain/transactions';
import { categorizeTransaction } from '@/lib/categorization';
import { getRepository } from '@/lib/repository';

const jsonBodySchema = z.object({
  csvContent: z.string().optional(),
  transactions: z
    .array(
      z.object({
        id: z.string().optional(),
        date: z.string(),
        description: z.string(),
        amountPaise: z.string(),
        type: z.enum(['CREDIT', 'DEBIT']),
        category: z.string().optional(),
        source: z.string().optional(),
      })
    )
    .optional(),
  sourceType: z.enum(['CSV', 'PDF', 'IMAGE']).optional(),
  currentCashBalanceRupees: z.string().optional(),
  proposedMonthlyRepaymentRupees: z.string().optional(),
  sourceReference: z.string().optional(),
});

const VALID_EXPENSE_CATEGORIES = new Set<string>([
  'ESSENTIAL_HOUSING',
  'ESSENTIAL_GROCERIES',
  'ESSENTIAL_UTILITIES',
  'WORK_FUEL_TRANSIT',
  'WORK_EQUIPMENT',
  'DEBT_REPAYMENT',
  'HEALTHCARE',
  'DISCRETIONARY',
  'FEES_CHARGES',
  'TRANSFER',
  'INCOME',
  'UNCATEGORIZED',
]);

export async function POST(req: NextRequest) {
  try {
    let csvContent = '';
    let currentCashBalanceRupees: string | undefined;
    let proposedRepaymentRupees: string | undefined;
    let sourceReference = 'statement.csv';
    let sourceType: 'CSV' | 'PDF' | 'IMAGE' = 'CSV';
    let incomingStructuredTransactions: z.infer<typeof jsonBodySchema>['transactions'] = undefined;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');

      if (!file || typeof file === 'string') {
        return NextResponse.json(
          { error: 'Missing or invalid file in multipart form upload' },
          { status: 400 }
        );
      }

      const fileObj = file as File;
      csvContent = await fileObj.text();
      sourceReference = fileObj.name || 'statement.csv';
      const stParam = formData.get('sourceType');
      if (typeof stParam === 'string' && (stParam === 'PDF' || stParam === 'IMAGE' || stParam === 'CSV')) {
        sourceType = stParam;
      }

      const cashParam = formData.get('currentCashBalanceRupees');
      if (typeof cashParam === 'string' && cashParam.trim()) {
        currentCashBalanceRupees = cashParam.trim();
      }

      const repayParam = formData.get('proposedMonthlyRepaymentRupees');
      if (typeof repayParam === 'string' && repayParam.trim()) {
        proposedRepaymentRupees = repayParam.trim();
      }
    } else {
      // JSON body
      const body = await req.json().catch(() => null);
      const parsed = jsonBodySchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: parsed.error.format() },
          { status: 400 }
        );
      }

      if (parsed.data.csvContent) {
        csvContent = parsed.data.csvContent;
      } else if (parsed.data.transactions && parsed.data.transactions.length > 0) {
        incomingStructuredTransactions = parsed.data.transactions;
      }

      if (parsed.data.sourceType) {
        sourceType = parsed.data.sourceType;
      }
      currentCashBalanceRupees = parsed.data.currentCashBalanceRupees;
      proposedRepaymentRupees = parsed.data.proposedMonthlyRepaymentRupees;
      if (parsed.data.sourceReference) {
        sourceReference = parsed.data.sourceReference;
      }
    }

    if (!csvContent.trim() && (!incomingStructuredTransactions || incomingStructuredTransactions.length === 0)) {
      return NextResponse.json(
        { error: 'No transaction data provided for analysis.' },
        { status: 400 }
      );
    }

    // Parse user provided optional balance
    let userCashMoney = null;
    if (currentCashBalanceRupees && !isNaN(Number(currentCashBalanceRupees))) {
      userCashMoney = moneyFromRupees(currentCashBalanceRupees);
    }

    // Parse user provided optional proposed repayment
    let proposedMonthlyRepaymentPaise: bigint | null = null;
    if (proposedRepaymentRupees && !isNaN(Number(proposedRepaymentRupees))) {
      proposedMonthlyRepaymentPaise = moneyFromRupees(proposedRepaymentRupees).paise;
    }

    let normalizedTransactions: NormalizedTransaction[] = [];
    let rejectedRows: any[] = [];
    let warnings: any[] = [];
    let parseStats: any = undefined;

    if (incomingStructuredTransactions && incomingStructuredTransactions.length > 0) {
      // Directly normalize structured transactions preserving exact IDs, categories, and sources
      let totalIncomePaise = 0n;
      let totalExpensePaise = 0n;

      normalizedTransactions = incomingStructuredTransactions.map((tx, idx) => {
        const paise = BigInt(tx.amountPaise);
        const txType: TransactionType = tx.type === 'CREDIT' ? 'INCOME' : 'EXPENSE';
        if (txType === 'INCOME') totalIncomePaise += paise;
        else totalExpensePaise += paise;

        const catResult = categorizeTransaction(tx.description, txType);
        const category: ExpenseCategory =
          tx.category && VALID_EXPENSE_CATEGORIES.has(tx.category)
            ? (tx.category as ExpenseCategory)
            : catResult.category;
        const merchant = tx.description.replace(/^(UPI\/|POS\/|NEFT\/|IMPS\/|ACH\/|RTGS\/)/i, '').trim();

        return {
          id: tx.id || `tx_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          date: tx.date,
          rawDescription: tx.description,
          normalizedMerchant: merchant || tx.description,
          amount: moneyFromPaise(paise),
          type: txType,
          category,
          sourceReference: tx.source || sourceReference,
          sourceRowNumber: idx + 1,
          confidence: 1.0,
        };
      });

      parseStats = {
        totalRowsProcessed: normalizedTransactions.length,
        validCount: normalizedTransactions.length,
        rejectedCount: 0,
        duplicateSuspectCount: 0,
        totalIncomePaise,
        totalExpensePaise,
      };
    } else {
      // Parse CSV statement
      const parseResult = parseTransactionCSV(csvContent, sourceReference);
      normalizedTransactions = parseResult.validTransactions;
      rejectedRows = parseResult.rejectedRows;
      warnings = parseResult.warnings;
      parseStats = parseResult.statistics;
    }

    // 2. Run Deterministic Analysis Pipeline
    const analysisResult = runFinancialAnalysis({
      transactions: normalizedTransactions,
      rejectedRows,
      warnings,
      statistics: parseStats,
      userProvidedCashBalance: userCashMoney,
      proposedMonthlyRepaymentPaise,
      sourceReference,
      sourceType,
    });

    // 3. Save to repository
    const repo = getRepository();
    await repo.saveTransactions('default_user', normalizedTransactions);
    await repo.saveAnalysisRun({
      id: analysisResult.metadata.analysisId,
      profileId: 'default_user',
      createdAt: analysisResult.metadata.generatedAt,
      incomeAnalysis: analysisResult.incomeAnalysis,
      expenseAnalysis: analysisResult.expenseAnalysis,
      resilienceAnalysis: analysisResult.resilienceAnalysis,
      stressIndicators: analysisResult.stressIndicators,
      prioritizedActions: analysisResult.prioritizedActions,
    });

    // 4. Return serialized JSON-safe response with the canonical normalized transaction collection
    const serialized = serializeFinancialAnalysisResult(analysisResult);
    const clientTransactions = normalizedTransactions.map((tx) => ({
      id: tx.id,
      date: tx.date,
      description: tx.rawDescription || tx.normalizedMerchant,
      amountPaise: tx.amount.paise.toString(),
      type: tx.type === 'INCOME' ? ('CREDIT' as const) : ('DEBIT' as const),
      category: tx.category,
      source: tx.sourceReference || sourceType || 'CSV',
      confidence: 'HIGH' as const,
      rawText: `${tx.rawDescription} ₹${(Number(tx.amount.paise) / 100).toFixed(2)}`,
      needsReview: false,
    }));

    return NextResponse.json(
      {
        ...serialized,
        transactions: clientTransactions,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to process financial analysis', message: err?.message || String(err) },
      { status: 500 }
    );
  }
}
