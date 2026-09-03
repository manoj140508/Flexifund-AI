import { moneyFromRupees } from '@/domain/money';

export type StatementSourceType = 'CSV' | 'PDF' | 'IMAGE';
export type ExtractionConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ExtractedStatementTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amountPaise: string;
  type: 'CREDIT' | 'DEBIT';
  confidence: ExtractionConfidence;
  confidenceReason?: string;
  rawText?: string;
}

export interface StatementExtractionResult {
  success: boolean;
  sourceType: StatementSourceType;
  transactions: ExtractedStatementTransaction[];
  closingBalancePaise?: string;
  pagesProcessed?: number;
  quality: {
    totalDetected: number;
    highConfidenceCount: number;
    needsReviewCount: number;
    periodStart?: string;
    periodEnd?: string;
    warnings: string[];
  };
  errorMessage?: string;
}

// Common Indian month mapping
const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

/**
 * Normalizes varied bank date strings to ISO YYYY-MM-DD.
 */
export function normalizeDateString(dateStr: string): string | null {
  const clean = dateStr.trim().replace(/[\/\.]/g, '-');

  // Format 1: YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Format 2: DD-MM-YYYY or DD-MM-YY
  const dmyMatch = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    let y = dmyMatch[3];
    if (y.length === 2) {
      y = parseInt(y, 10) > 70 ? `19${y}` : `20${y}`;
    }
    return `${y}-${m}-${d}`;
  }

  // Format 3: DD-Mon-YYYY or DD Mon YYYY
  const monMatch = clean.match(/^(\d{1,2})[-\s]([a-zA-Z]{3,9})[-\s](\d{2,4})$/);
  if (monMatch) {
    const d = monMatch[1].padStart(2, '0');
    const mStr = monMatch[2].toLowerCase();
    const m = MONTH_MAP[mStr];
    let y = monMatch[3];
    if (y.length === 2) {
      y = parseInt(y, 10) > 70 ? `19${y}` : `20${y}`;
    }
    if (m) {
      return `${y}-${m}-${d}`;
    }
  }

  return null;
}

/**
 * Cleans monetary text e.g. "₹ 1,450.00 Cr" or "2,500.50" into standard minor units (paise).
 */
export function parseCleanAmount(amountStr: string): bigint | null {
  try {
    const clean = amountStr
      .replace(/[₹$,\s]/g, '')
      .replace(/rs\.?/gi, '')
      .replace(/cr|dr/gi, '')
      .trim();
    if (!clean || isNaN(Number(clean))) return null;
    return moneyFromRupees(clean).paise;
  } catch {
    return null;
  }
}

/**
 * Parses raw text extracted from PDF or OCR image into structured bank transactions.
 */
export function parseBankStatementText(
  rawText: string,
  sourceType: StatementSourceType,
  pagesProcessed = 1
): StatementExtractionResult {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const transactions: ExtractedStatementTransaction[] = [];
  let closingBalancePaise: string | undefined = undefined;
  const warnings: string[] = [];

  // Patterns for detecting transaction lines
  // Standard bank row: Date Description [Ref/Chq] [Debit] [Credit] [Balance]
  // Date pattern: DD/MM/YYYY or DD-MM-YYYY or DD Mon YYYY or YYYY-MM-DD
  const dateRegex = /(\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b|\b\d{1,2}[\/\-\s](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\/\-\s]\d{2,4}\b|\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b)/i;
  // Amount pattern: ₹1,234.56 or 1234.50 or 1,234.00
  const amountRegex = /(?:₹\s*)?([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2}))/g;

  // Credit/Debit indicators
  const creditKeywords = /\b(cr|credit|deposit|payout|refund|received|cashback)\b/i;
  const debitKeywords = /\b(dr|debit|withdrawal|paid|sent|pos|atm|charge|bill|fuel|swiggy|zomato|uber|ola)\b/i;

  // Track closing balance if explicitly stated
  const balanceKeywords = /(?:closing\s*balance|available\s*balance|net\s*balance|clear\s*balance)[:\s]*₹?\s*([0-9,]+\.[0-9]{2})/i;
  for (const line of lines) {
    const bMatch = line.match(balanceKeywords);
    if (bMatch && bMatch[1]) {
      const parsed = parseCleanAmount(bMatch[1]);
      if (parsed !== null && parsed >= 0n) {
        closingBalancePaise = parsed.toString();
      }
    }
  }

  let rowCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip table header lines
    if (
      /date.*description.*amount/i.test(line) ||
      /txn\s*date.*narration.*balance/i.test(line) ||
      /sl\s*no.*particulars/i.test(line)
    ) {
      continue;
    }

    const dateMatch = line.match(dateRegex);
    if (!dateMatch) {
      continue;
    }

    const rawDate = dateMatch[0];
    const normalizedDate = normalizeDateString(rawDate);
    if (!normalizedDate) {
      continue;
    }

    // Extract all potential monetary amounts in the line
    const amounts: string[] = [];
    let match: RegExpExecArray | null;
    const localAmountRegex = new RegExp(amountRegex.source, 'g');
    while ((match = localAmountRegex.exec(line)) !== null) {
      // Exclude numbers that might be part of the date or year
      if (match[1] !== rawDate && !rawDate.includes(match[1])) {
        amounts.push(match[1]);
      }
    }

    if (amounts.length === 0) {
      continue;
    }

    // Identify amount and type
    let chosenAmount = amounts[0];
    let type: 'CREDIT' | 'DEBIT' = 'DEBIT';
    let confidence: ExtractionConfidence = 'HIGH';
    let reason = 'High confidence: complete date, amount, and transaction direction matched.';

    // Check line for Cr / Dr flags
    const hasCr = /\b(cr|credit|deposit)\b/i.test(line);
    const hasDr = /\b(dr|debit|withdrawal)\b/i.test(line);

    if (amounts.length >= 2) {
      // Typical multi-column: [Debit] [Credit] [Balance] or [Amount] [Balance]
      if (amounts.length >= 3) {
        // Line has 3 amounts: Debit, Credit, Balance
        const first = parseCleanAmount(amounts[0]);
        const second = parseCleanAmount(amounts[1]);
        if (first && first > 0n && (!second || second === 0n)) {
          chosenAmount = amounts[0];
          type = 'DEBIT';
        } else if (second && second > 0n) {
          chosenAmount = amounts[1];
          type = 'CREDIT';
        }
        // Last amount is likely running balance
        const lastBal = parseCleanAmount(amounts[amounts.length - 1]);
        if (lastBal !== null && !closingBalancePaise) {
          closingBalancePaise = lastBal.toString();
        }
      } else if (amounts.length === 2) {
        // [Amount] [Balance]
        chosenAmount = amounts[0];
        if (hasCr) {
          type = 'CREDIT';
        } else if (hasDr) {
          type = 'DEBIT';
        } else {
          // Infer from narration
          if (creditKeywords.test(line)) {
            type = 'CREDIT';
            confidence = 'MEDIUM';
            reason = 'Medium confidence: Direction inferred from narration keywords.';
          } else {
            type = 'DEBIT';
            confidence = 'MEDIUM';
            reason = 'Medium confidence: No explicit CR/DR column; defaulted to debit.';
          }
        }
      }
    } else {
      // Single amount found
      if (hasCr) {
        type = 'CREDIT';
      } else if (hasDr) {
        type = 'DEBIT';
      } else if (creditKeywords.test(line)) {
        type = 'CREDIT';
        confidence = 'MEDIUM';
        reason = 'Direction inferred from deposit keywords.';
      } else if (debitKeywords.test(line)) {
        type = 'DEBIT';
        confidence = 'MEDIUM';
        reason = 'Direction inferred from expense keywords.';
      } else {
        confidence = 'LOW';
        reason = 'Low confidence: No explicit debit/credit marker detected. Review required.';
      }
    }

    const amountPaiseBigInt = parseCleanAmount(chosenAmount);
    if (!amountPaiseBigInt || amountPaiseBigInt <= 0n) {
      continue;
    }

    // Extract description by removing date and amounts from the line
    let desc = line.replace(rawDate, '');
    for (const amt of amounts) {
      desc = desc.replace(amt, '');
    }
    desc = desc
      .replace(/[₹$,]/g, '')
      .replace(/\b(cr|dr|credit|debit)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!desc || desc.length < 2) {
      desc = type === 'CREDIT' ? 'Direct Credit / Payout' : 'Debit Transaction';
      confidence = confidence === 'HIGH' ? 'MEDIUM' : confidence;
    }

    transactions.push({
      id: `extracted_${Date.now()}_${rowCounter++}`,
      date: normalizedDate,
      description: desc,
      amountPaise: amountPaiseBigInt.toString(),
      type,
      confidence,
      confidenceReason: reason,
      rawText: line,
    });
  }

  if (transactions.length === 0) {
    return {
      success: false,
      sourceType,
      transactions: [],
      pagesProcessed,
      quality: {
        totalDetected: 0,
        highConfidenceCount: 0,
        needsReviewCount: 0,
        warnings: ['No transaction records could be reliably extracted from the uploaded document.'],
      },
      errorMessage: "We couldn't reliably read the transaction table from this file.",
    };
  }

  // Sort chronologically
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  const highConfidenceCount = transactions.filter((t) => t.confidence === 'HIGH').length;
  const needsReviewCount = transactions.length - highConfidenceCount;

  if (needsReviewCount > 0) {
    warnings.push(`${needsReviewCount} transaction(s) require review due to ambiguous columns or keywords.`);
  }

  return {
    success: true,
    sourceType,
    transactions,
    closingBalancePaise,
    pagesProcessed,
    quality: {
      totalDetected: transactions.length,
      highConfidenceCount,
      needsReviewCount,
      periodStart: transactions[0]?.date,
      periodEnd: transactions[transactions.length - 1]?.date,
      warnings,
    },
  };
}
