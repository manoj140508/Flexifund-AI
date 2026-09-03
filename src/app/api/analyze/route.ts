import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseTransactionCSV } from '@/lib/csv-parser';
import { moneyFromRupees } from '@/domain/money';
import { runFinancialAnalysis, serializeFinancialAnalysisResult } from '@/domain/analysis';
import { getRepository } from '@/lib/repository';

const jsonBodySchema = z.object({
  csvContent: z.string().optional(),
  transactions: z
    .array(
      z.object({
        date: z.string(),
        description: z.string(),
        amountPaise: z.string(),
        type: z.enum(['CREDIT', 'DEBIT']),
      })
    )
    .optional(),
  sourceType: z.enum(['CSV', 'PDF', 'IMAGE']).optional(),
  currentCashBalanceRupees: z.string().optional(),
  proposedMonthlyRepaymentRupees: z.string().optional(),
  sourceReference: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    let csvContent = '';
    let currentCashBalanceRupees: string | undefined;
    let proposedRepaymentRupees: string | undefined;
    let sourceReference = 'statement.csv';
    let sourceType: 'CSV' | 'PDF' | 'IMAGE' = 'CSV';

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
        // Convert reviewed structured transactions to normalized standard CSV
        const rows = ['Date,Description,Amount,Type'];
        for (const tx of parsed.data.transactions) {
          const rupees = (Number(tx.amountPaise) / 100).toFixed(2);
          const escapedDesc = `"${tx.description.replace(/"/g, '""')}"`;
          const typeStr = tx.type === 'CREDIT' ? 'Credit' : 'Debit';
          rows.push(`${tx.date},${escapedDesc},${rupees},${typeStr}`);
        }
        csvContent = rows.join('\n');
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

    if (!csvContent.trim()) {
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

    // 1. Ingest & Normalize CSV
    const parseResult = parseTransactionCSV(csvContent, sourceReference);

    // 2. Run Deterministic Analysis Pipeline
    const analysisResult = runFinancialAnalysis({
      transactions: parseResult.validTransactions,
      rejectedRows: parseResult.rejectedRows,
      warnings: parseResult.warnings,
      statistics: parseResult.statistics,
      userProvidedCashBalance: userCashMoney,
      proposedMonthlyRepaymentPaise,
      sourceReference,
      sourceType,
    });

    // 3. Save to repository
    const repo = getRepository();
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

    // 4. Return serialized JSON-safe response
    const serialized = serializeFinancialAnalysisResult(analysisResult);
    return NextResponse.json(serialized, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to process financial analysis', message: err?.message || String(err) },
      { status: 500 }
    );
  }
}
