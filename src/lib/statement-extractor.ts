import { moneyFromRupees } from '@/domain/money';

export type StatementSourceType = 'CSV' | 'PDF' | 'IMAGE';
export type ExtractionConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type UncertainFieldType = 'date' | 'amount' | 'type' | 'description';

export interface SpatialOcrLine {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
}

export interface ExtractedStatementTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amountPaise: string;
  type: 'CREDIT' | 'DEBIT';
  confidence: ExtractionConfidence;
  confidenceReason?: string;
  rawText?: string;
  needsReview?: boolean;
  uncertainFields?: UncertainFieldType[];
  dateNeedsReview?: boolean;
  category?: string;
  source?: string;
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
  devDebug?: {
    ocrText: string;
    detectedBlocks: Array<{ text: string; y: number; h: number; conf: number }>;
    parsedTransactions: ExtractedStatementTransaction[];
    errors: string[];
    imageMeta?: any;
  };
  debugOcr?: {
    rawText: string;
    lineCount: number;
    lines: Array<{ text: string; y0: number; y1: number; conf: number }>;
  };
}

// Common Indian month mapping
const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

// UI keywords in GPay and UPI apps that should not be treated as merchant names
const GPAY_UI_NOISE_PATTERNS = [
  /^(?:search|start\s*a\s*payment|explore|people|businesses|bills|offers|rewards)$/i,
  /^(?:pay\s*again|send\s*again|split\s*with\s*friends|split\s*expense|check\s*balance)$/i,
  /^(?:manage\s*google\s*account|view\s*all|see\s*all|history|payment\s*history)$/i,
  /^(?:completed|success|successful|failed|pending|processing|declined|payment\s*successful)$/i,
  /^(?:upi\s*transaction\s*id|google\s*transaction\s*id|bank\s*reference\s*no|ref\s*no)[\s\d:]*$/i,
  /^(?:banking\s*name:|paid\s*using|debited\s*from|credited\s*to)[\s\w•]*$/i,
  /^(?:scan\s*any\s*qr|pay\s*contacts|pay\s*phone\s*number|bank\s*transfer)$/i,
  /^(?:yesterday|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i,
  /^(?:january|february|march|april|may|june|july|august|september|october|november|december)\s*\d{0,4}$/i,
  /^(?:google\s*pay|gpay|paytm|phonepe)$/i,
];

export interface ParsedDateResult {
  isoDate: string;
  hasExplicitYear: boolean;
}

/**
 * Parses date strings embedded in mobile screenshots and bank statements.
 * Handles timestamps e.g. "12 Aug 2026, 8:45 PM" or status "Completed • 12 Aug 2026".
 */
export function parseDateWithMetadata(dateStr: string, fallbackYear?: number): ParsedDateResult | null {
  const currentYear = fallbackYear || new Date().getFullYear();
  let clean = dateStr.trim();

  // Strip timestamps e.g. "8:45 PM", "10:30am", "14:20:00"
  clean = clean.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?\b/gi, ' ').trim();
  // Strip status words e.g. "Completed", "Paid", "Success", "Transferred"
  clean = clean.replace(/\b(?:completed|success|successful|paid|received|sent|transferred|pending)\b/gi, ' ').trim();
  // Strip bullets, commas, and excess delimiters
  clean = clean.replace(/[•\|\,]/g, ' ').replace(/\s+/g, ' ').trim();

  // Reject strings that are primarily amounts or summaries
  if (/\.\d{2}\b/.test(clean) || /[₹$¥£€]/.test(clean) || /^(?:total\s*spent|spent|balance)/i.test(clean)) {
    return null;
  }

  // Relative dates: Today / Yesterday
  if (/^today$/i.test(clean)) {
    return { isoDate: new Date().toISOString().slice(0, 10), hasExplicitYear: true };
  }
  if (/^yesterday$/i.test(clean)) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return { isoDate: d.toISOString().slice(0, 10), hasExplicitYear: true };
  }

  // Format 1: Embedded DD Mon YYYY or DD Mon (e.g. "12 Aug 2026", "14 Aug", "14 August 2026", "1September")
  const monMatch = clean.match(/(\d{1,2})\s*([a-zA-Z]{3,9})\b(?:\s+(\d{2,4}))?/i);
  if (monMatch) {
    const dayVal = parseInt(monMatch[1], 10);
    if (dayVal >= 1 && dayVal <= 31) {
      const d = monMatch[1].padStart(2, '0');
      const mStr = monMatch[2].toLowerCase();
      const m = MONTH_MAP[mStr];
      if (m) {
        let y = monMatch[3];
        const hasExplicitYear = Boolean(y && y.length === 4);
        if (!y) y = currentYear.toString();
        else if (y.length === 2) y = parseInt(y, 10) > 70 ? `19${y}` : `20${y}`;
        return { isoDate: `${y}-${m}-${d}`, hasExplicitYear };
      }
    }
  }

  // Format 2: Embedded Mon DD YYYY or Mon DD (e.g. "Aug 14, 2026", "August 14")
  const revMatch = clean.match(/\b([a-zA-Z]{3,9})\b\s+(\d{1,2})(?:\s+(\d{2,4}))?/i);
  if (revMatch) {
    const dayVal = parseInt(revMatch[2], 10);
    if (dayVal >= 1 && dayVal <= 31) {
      const mStr = revMatch[1].toLowerCase();
      const m = MONTH_MAP[mStr];
      const d = revMatch[2].padStart(2, '0');
      if (m) {
        let y = revMatch[3];
        const hasExplicitYear = Boolean(y && y.length === 4);
        if (!y) y = currentYear.toString();
        return { isoDate: `${y}-${m}-${d}`, hasExplicitYear };
      }
    }
  }

  // Format 3: YYYY-MM-DD
  const isoMatch = clean.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return { isoDate: `${y}-${m}-${d}`, hasExplicitYear: true };
  }

  // Format 4: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    let y = dmyMatch[3];
    const hasExplicitYear = y.length === 4;
    if (y.length === 2) {
      y = parseInt(y, 10) > 70 ? `19${y}` : `20${y}`;
    }
    return { isoDate: `${y}-${m}-${d}`, hasExplicitYear };
  }

  return null;
}

/**
 * Normalizes varied bank and GPay date strings to ISO YYYY-MM-DD.
 */
export function normalizeDateString(dateStr: string, fallbackYear?: number): string | null {
  const parsed = parseDateWithMetadata(dateStr, fallbackYear);
  return parsed ? parsed.isoDate : null;
}

/**
 * Cleans monetary text e.g. "₹ 1,450.00 Cr" or "2,500.50" into standard minor units (paise).
 */
export function parseCleanAmount(amountStr: string): bigint | null {
  try {
    const clean = amountStr
      .replace(/[₹$¥£€,\s]/g, '')
      .replace(/rs\.?/gi, '')
      .replace(/inr/gi, '')
      .replace(/cr|dr/gi, '')
      .trim();
    if (!clean || isNaN(Number(clean))) return null;
    return moneyFromRupees(clean).paise;
  } catch {
    return null;
  }
}

/**
 * Extracts candidate monetary amounts from a transaction line,
 * ignoring dates, years, phone numbers, and UPI reference IDs.
 * In strictContext (GPay images), requires explicit currency symbol, directional context, or formatted decimal money.
 */
export function extractCandidateAmounts(line: string, rawDate?: string, strictContext = false): string[] {
  let withoutDate = rawDate ? line.replace(rawDate, ' ') : line;

  // Mask out phone numbers (10 digits starting with 6-9) and UPI reference IDs (12 digits)
  withoutDate = withoutDate.replace(/\b[6-9]\d{9}\b/g, ' ');
  withoutDate = withoutDate.replace(/\b\d{12}\b/g, ' ');
  // Mask out times e.g. 10:45 AM, 8:45 PM
  withoutDate = withoutDate.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?\b/gi, ' ');
  // Mask out battery percentages e.g. 85%, 100%
  withoutDate = withoutDate.replace(/\b\d{1,3}%\b/g, ' ');

  const candidatePattern = /(?:[₹$¥£€]|rs\.?\s*|inr\s*)?([0-9]{1,3}(?:,[0-9]{2,3})+(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})|(?:[₹$¥£€]|rs\.?\s*)[0-9]+|\b[1-9][0-9]{1,6}\b)/gi;

  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = candidatePattern.exec(withoutDate)) !== null) {
    const raw = match[0];
    const cleaned = raw.replace(/[₹$¥£€,\s]/g, '').replace(/rs\.?/gi, '').replace(/inr/gi, '').trim();
    if (!cleaned || isNaN(Number(cleaned))) continue;
    const num = Number(cleaned);
    if (num <= 0) continue;

    // In strictContext (for screenshots): require currency symbol OR directional/payment words OR formatted decimal
    if (strictContext) {
      const hasCurrency = /[₹$¥£€]|rs\.?|inr/i.test(raw) || /[₹$¥£€]|rs\.?|inr/i.test(line);
      const hasSign = /^[+-]/.test(raw) || /[+-]\s*(?:[₹$¥£€]|rs)/i.test(line);
      const hasPaymentWord = /(?:paid|sent|received|debited|credited|cashback|refund|payout|cr|dr|credit|debit|deposit|withdrawal|payment|completed|success|transfer)/i.test(line);
      const isFormattedMoney = /[0-9]{1,3}(?:,[0-9]{2,3})+(?:\.[0-9]{2})?|[0-9]+\.[0-9]{2}/.test(raw);

      const isLineEndingAmount = /\s+[0-9]{2,6}(?:\.[0-9]{2})?$/.test(line) && !parseDateWithMetadata(line);

      if (!hasCurrency && !hasSign && !hasPaymentWord && !isFormattedMoney && !isLineEndingAmount) {
        continue; // Reject numbers without monetary context
      }
    }

    // Avoid matching isolated 4-digit years (e.g. 2020-2035) if not currency-prefixed
    if (num >= 2020 && num <= 2035 && !raw.match(/[₹$¥£€rs]/i) && !line.match(new RegExp(`(?:cr|dr|credit|debit|paid|payout).*${cleaned}`, 'i'))) {
      continue;
    }

    results.push(cleaned);
  }

  return results;
}

/**
 * Cleans extracted merchant or person description:
 * - Strips prefixes: "Paid to", "Payment to", "Received from", "Sent to", "To:", "From:"
 * - Strips UPI ID handles e.g. "@okhdfcbank", "@upi", "@paytm"
 * - Strips masked accounts: "•••• 1234", "A/c 1234"
 * - Strips noise characters
 * If remaining description is unclear/empty, returns "Unclear merchant".
 */
export function cleanMerchantDescription(rawDesc: string): string {
  let cleaned = rawDesc
    .replace(/^(?:paid\s*to|payment\s*to|sent\s*to|transferred\s*to|debited\s*for|money\s*sent\s*to)\s+/i, '')
    .replace(/^(?:received\s*from|money\s*received\s*from|credited\s*from|cashback\s*from|refund\s*from)\s+/i, '')
    .replace(/^(?:to:|from:|banking\s*name:|name:)\s*/i, '')
    .replace(/@\w+/g, '') // remove UPI handles like @okhdfcbank
    .replace(/[•\*\.]{2,}\s*\d{3,4}/g, '') // remove masked card/account endings
    .replace(/\b(?:completed|pending|successful|failed|payment\s*successful)\b/gi, '')
    .replace(/\bupi\s*(?:ref|id|transaction|reference)?\b/gi, '')
    .replace(/[₹$¥£€,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip icon prefixes / noise characters from start: e.g. ©, ®, &, (1), §, =, iE), (E), etc.
  cleaned = cleaned.replace(/^(?:[©®&§\=\(\)\d\.\,\-\+]|[a-zA-Z0-9\(\)\=\.\,\-]+\))\s*/, '').trim();

  // If starts with single letter followed by word starting with same letter (e.g. "B Balasubramani", "G Ganash")
  cleaned = cleaned.replace(/^([A-Za-z])\s+(?=[A-Za-z])/i, '').trim();

  // Strip 1-3 lowercase / symbol artifacts before a capital word (e.g. "te Zomato", "ome Zomato", "vo Vittechnovit", "iE ELITE")
  cleaned = cleaned.replace(/^(?:[a-z]{1,3}|p\s*V|iE|4\s*V)\s+(?=[A-Z])/i, '').trim();

  // If entirely stripped, too short, or app name, use unclear fallback (do not hallucinate)
  if (!cleaned || cleaned.length < 2 || /^[^a-zA-Z0-9]+$/.test(cleaned) || /^(?:google\s*pay|gpay|paytm|phonepe)$/i.test(cleaned)) {
    return 'Unclear merchant';
  }

  return cleaned.slice(0, 50).trim();
}

/**
 * Deduplicates transactions across multiple screenshots or repeated OCR chunks.
 * Matches on: date + amountPaise + normalized merchant name.
 */
export function deduplicateExtractedTransactions(
  transactions: ExtractedStatementTransaction[]
): ExtractedStatementTransaction[] {
  const seen = new Map<string, ExtractedStatementTransaction>();

  for (const tx of transactions) {
    const normDesc = tx.description.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
    const key = `${tx.date}_${tx.amountPaise}_${tx.type}_${normDesc}`;

    if (!seen.has(key)) {
      seen.set(key, tx);
    } else {
      const existing = seen.get(key)!;
      // If the incoming transaction has higher confidence or fewer uncertain fields, replace
      const existingUncertain = existing.uncertainFields?.length || 0;
      const txUncertain = tx.uncertainFields?.length || 0;
      if (txUncertain < existingUncertain || (tx.confidence === 'HIGH' && existing.confidence !== 'HIGH')) {
        seen.set(key, tx);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Preprocesses raw OCR text lines from mobile screenshots to recover misrecognized
 * currency glyphs before parsing (e.g. ₹ misread as '3', '¥', '£', '€', 'E' or 'z').
 */
export function preprocessOcrLine(rawText: string): { cleanedText: string; substitutedRupee: boolean } {
  let cleanedText = rawText.trim();
  let substitutedRupee = false;

  // Case 1: Tesseract reads '₹' as '3', '2', or '%' after +/- sign e.g. "+ 31,000", "+31,000", "+ 3%1,000", "+21,000"
  if (/([+-])\s*[32%]\s*(?=[1-9][0-9]*(?:,[0-9]+)*\b)/i.test(cleanedText)) {
    cleanedText = cleanedText.replace(/([+-])\s*[32%]\s*(?=[1-9][0-9]*(?:,[0-9]+)*\b)/gi, '$1 ₹');
    substitutedRupee = true;
  }

  // Case 2: Tesseract reads '₹' as '3' or '2' immediately after payment action keyword, e.g. "Paid 3420" -> "Paid ₹420"
  if (/(?:paid|received|sent|credited|debited)\s*(?:to|from)?\s*[32](?=[1-9][0-9]{1,5}\b)/i.test(cleanedText)) {
    cleanedText = cleanedText.replace(/(paid|received|sent|credited|debited)(\s*(?:to|from)?\s*)[32](?=[1-9][0-9]{1,5}\b)/gi, '$1$2₹');
    substitutedRupee = true;
  }

  // Case 3: 4 digits before decimal starting with 3 or 2 without comma: e.g. "3406.08" -> "₹406.08", "3148.08" -> "₹148.08"
  if (/(^|\s)[32](?=[0-9]{3}\.[0-9]{2}\b)/.test(cleanedText)) {
    cleanedText = cleanedText.replace(/(^|\s)[32](?=[0-9]{3}\.[0-9]{2}\b)/g, '$1₹');
    substitutedRupee = true;
  }

  // Case 4: 4 digits integer starting with 3 or 2 without comma: e.g. "3300" -> "₹300", "2125" -> "₹125", "2100" -> "₹100"
  // Exclude years (2020 - 2035)
  if (/(^|\s)[32](?=[0-9]{3}\b)/.test(cleanedText)) {
    cleanedText = cleanedText.replace(/(^|\s)([32])(?=[0-9]{3}\b)/g, (match, prefix, digit, offset, str) => {
      const fullNum = str.slice(offset + prefix.length, offset + prefix.length + 4);
      const num = parseInt(fullNum, 10);
      if (num >= 2020 && num <= 2035) {
        return match; // Keep year as is
      }
      substitutedRupee = true;
      return prefix + '₹';
    });
  }

  // Case 5: Tesseract reads '₹' as 'z', '?', 'E', or 'M'
  if (/(^|\s)[\?zEM](?=[0-9]{2,6}\b)/i.test(cleanedText)) {
    cleanedText = cleanedText.replace(/(^|\s)[\?zEM](?=[0-9]{2,6}\b)/gi, '$1₹');
    substitutedRupee = true;
  }

  // Case 6: Tesseract reads '₹' as Latin currency symbols '¥', '£', '€'
  if (/[¥£€]/.test(cleanedText)) {
    cleanedText = cleanedText.replace(/[¥£€]/g, '₹');
    substitutedRupee = true;
  }

  // Case 7: Standalone amount at the end of line after merchant name e.g. "SWIGGY INSTAMART 117"
  if (/\s+[1-9][0-9]{1,4}(?:\.[0-9]{2})?$/.test(cleanedText) && !/[₹$¥£€]/.test(cleanedText)) {
    const isDate = parseDateWithMetadata(cleanedText);
    if (!isDate) {
      cleanedText = cleanedText.replace(/\s+([1-9][0-9]{1,4}(?:\.[0-9]{2})?)$/, ' ₹$1');
      substitutedRupee = true;
    }
  }

  // Case 8: Standalone amount line where '₹' was read as '3', e.g. "3540.00", "3500", "31,200"
  if (/^\s*3(?=[1-9][0-9]{0,2}(?:,[0-9]{2,3})+(?:\.[0-9]{2})?|[1-9][0-9]{1,5}(?:\.[0-9]{2})?\b)/.test(cleanedText)) {
    const numMatch = cleanedText.match(/^\s*3([0-9]{4,})/);
    const num = numMatch ? parseInt(numMatch[1].slice(0, 4), 10) : 0;
    if (!(num >= 2020 && num <= 2035)) {
      cleanedText = cleanedText.replace(/^\s*3(?=[1-9])/, '₹');
      substitutedRupee = true;
    }
  }

  return { cleanedText, substitutedRupee };
}

/**
 * Spatial layout parser specifically designed for Google Pay, PhonePe, Paytm,
 * and mobile UPI screenshots (handles both transaction history and individual payment details).
 */
export function parseGPaySpatialBlocks(
  spatialLines: SpatialOcrLine[],
  rawTextFallback?: string,
  pagesProcessed = 1
): StatementExtractionResult {
  let lines: SpatialOcrLine[] = spatialLines && spatialLines.length > 0 ? spatialLines : [];

  // If no spatial coordinates provided, synthesize from rawTextFallback
  if (lines.length === 0 && rawTextFallback) {
    const splitLines = rawTextFallback.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    lines = splitLines.map((text, idx) => ({
      text,
      bbox: { x0: 40, y0: idx * 40, x1: 450, y1: idx * 40 + 30 },
      confidence: 85,
    }));
  }

  // Filter out empty lines and sort top-to-bottom
  const sortedLines = [...lines]
    .filter((l) => l.text.trim().length > 0)
    .sort((a, b) => {
      // If nearly on the same horizontal band (< 6px y diff), sort left-to-right
      if (Math.abs(a.bbox.y0 - b.bbox.y0) < 6) {
        return a.bbox.x0 - b.bbox.x0;
      }
      return a.bbox.y0 - b.bbox.y0;
    });

  const transactions: ExtractedStatementTransaction[] = [];
  const warnings: string[] = [];

  // Direction keywords
  const creditKeywords = /\b(received|received\s*from|money\s*received|credited|cashback|refund|deposit|cr|credit|payout)\b|^\s*\+/i;
  const debitKeywords = /\b(paid|paid\s*to|sent|sent\s*to|payment\s*to|transferred\s*to|debited|bill\s*paid|dr|debit|withdrawal)\b|^\s*\-/i;

  // Preprocess all lines first to clean glyphs and fix common OCR artifacts
  for (let i = 0; i < sortedLines.length; i++) {
    const { cleanedText } = preprocessOcrLine(sortedLines[i].text);
    sortedLines[i].text = cleanedText;
  }

  // 1. Scan for Global Year in the document
  let globalYear: number | null = null;
  for (const l of sortedLines) {
    const trimmed = l.text.trim();
    // Standalone 4-digit year line (e.g. "2026")
    const standaloneYear = trimmed.match(/^(?:202[0-9]|203[0-5])$/);
    if (standaloneYear) {
      globalYear = parseInt(standaloneYear[0], 10);
      break;
    }
    const mMatch = l.text.match(/(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(202[0-9]|203[0-5])\b/i);
    if (mMatch) {
      globalYear = parseInt(mMatch[1], 10);
      break;
    }
    const fullDateMatch = l.text.match(/\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.](202[0-9]|203[0-5])\b/);
    if (fullDateMatch) {
      globalYear = parseInt(fullDateMatch[1], 10);
      break;
    }
    const monYearMatch = l.text.match(/\b\d{1,2}\s+[a-zA-Z]{3,9}\s+(202[0-9]|203[0-5])\b/);
    if (monYearMatch) {
      globalYear = parseInt(monYearMatch[1], 10);
      break;
    }
  }

  const effectiveYear = globalYear || new Date().getFullYear();
  const hasGlobalYear = globalYear !== null;

  // Helper: check if a line is a monthly summary or account balance header
  const isMonthlySummaryHeader = (text: string): boolean => {
    const trimmed = text.trim();
    const isMonthAmount = /^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+\d{4})?\s*(?:[₹$¥£€\?zM32]|rs\.?)?\s*[\d,]+(?:\.\d{2})?$/i.test(trimmed);
    const hasSummaryKeywords = /(?:total\s*spent|spent\s*in|monthly\s*total|account\s*balance|available\s*balance|closing\s*balance|spent\s*this\s*month)/i.test(trimmed);
    return isMonthAmount || hasSummaryKeywords;
  };

  // Pre-calculate running active section date for every line in the document based on preceding date headers
  const lineDates: Array<{ isoDate: string; hasExplicitYear: boolean } | null> = new Array(sortedLines.length).fill(null);
  let currentRunningDate: { isoDate: string; hasExplicitYear: boolean } | null = null;

  for (let i = 0; i < sortedLines.length; i++) {
    const lText = sortedLines[i].text.trim();
    if (!isMonthlySummaryHeader(lText)) {
      const parsed = parseDateWithMetadata(lText, effectiveYear);
      if (parsed) {
        currentRunningDate = parsed;
        lineDates[i] = parsed;
      } else if (currentRunningDate) {
        lineDates[i] = currentRunningDate;
      }
    } else if (currentRunningDate) {
      lineDates[i] = currentRunningDate;
    }
  }

  // 2. Identify all line indices with strict amount candidates
  interface AmountAnchor {
    lineIdx: number;
    line: SpatialOcrLine;
    amountPaise: bigint;
    chosenAmountStr: string;
    substitutedRupee: boolean;
  }

  const amountAnchors: AmountAnchor[] = [];
  for (let i = 0; i < sortedLines.length; i++) {
    const item = sortedLines[i];
    const { cleanedText, substitutedRupee } = preprocessOcrLine(item.text);
    item.text = cleanedText;
    const text = cleanedText;

    // Skip pure noise or UPI reference lines
    if (/^(?:upi\s*transaction\s*id|google\s*transaction\s*id|bank\s*reference\s*no|ref\s*no|to:|from:)/i.test(text)) {
      continue;
    }

    // Exclude monthly summary / balance headers (e.g. "September ₹148.08", "September 3148.08", "Total spent: ₹...")
    if (isMonthlySummaryHeader(text)) {
      continue;
    }

    // Exclude standalone year headers (e.g. "2026")
    if (/^(?:202[0-9]|203[0-5])$/.test(text.trim())) {
      continue;
    }

    // Exclude standalone date headers that do not have transaction text
    if (parseDateWithMetadata(text, effectiveYear) && !/[₹$¥£€]|rs\.?|paid|received|sent|credited|debited|\+/i.test(text)) {
      continue;
    }

    const candidateAmounts = extractCandidateAmounts(text, undefined, true);
    if (candidateAmounts.length === 0) continue;

    const chosenAmountStr = candidateAmounts[0];
    const amountPaise = parseCleanAmount(chosenAmountStr);
    if (amountPaise && amountPaise > 0n) {
      amountAnchors.push({
        lineIdx: i,
        line: item,
        amountPaise,
        chosenAmountStr,
        substitutedRupee,
      });
    }
  }

  // Fallback: If no anchors found with strictContext, check if there is an individual transaction screen
  // where a single prominent number appears adjacent to payment status (Requirement 11)
  if (amountAnchors.length === 0 && sortedLines.length > 0) {
    for (let i = 0; i < sortedLines.length; i++) {
      const item = sortedLines[i];
      if (isMonthlySummaryHeader(item.text)) continue;
      if (/^(?:202[0-9]|203[0-5])$/.test(item.text.trim())) continue;
      // Skip if this line contains a date, timestamp, UPI ID, or account number
      if (parseDateWithMetadata(item.text, effectiveYear)) continue;
      if (/^(?:upi\s*transaction\s*id|google\s*transaction\s*id|to:|from:|banking|call)/i.test(item.text)) continue;
      if (/\b(?:am|pm)\b/i.test(item.text) || /\b\d{1,2}:\d{2}\b/.test(item.text)) continue;

      const pureNumberMatch = item.text.match(/(?:[₹$¥£€]|rs\.?\s*)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{2})?|[1-9][0-9]{1,5})/i);
      if (pureNumberMatch) {
        const parsed = parseCleanAmount(pureNumberMatch[1]);
        if (parsed && parsed >= 1000n) { // require at least ₹10 to avoid small numbers like 12
          // Check if document has payment keywords
          const hasPaymentEvidence = sortedLines.some(l =>
            /(?:payment\s*successful|completed|paid|received|sent|transferred|upi)/i.test(l.text)
          );
          if (hasPaymentEvidence) {
            amountAnchors.push({
              lineIdx: i,
              line: item,
              amountPaise: parsed,
              chosenAmountStr: pureNumberMatch[1],
              substitutedRupee: true,
            });
            break;
          }
        }
      }
    }
  }

  let txCounter = 1;

  // 3. Process each transaction card cluster around an amount anchor
  for (let aIdx = 0; aIdx < amountAnchors.length; aIdx++) {
    const anchor = amountAnchors[aIdx];
    const idx = anchor.lineIdx;
    const currentLine = anchor.line.text;

    // Define card boundaries:
    // If only 1 anchor in the screenshot (individual transaction screen), span entire screenshot
    let cardStart = 0;
    let cardEnd = sortedLines.length - 1;

    if (amountAnchors.length > 1) {
      const prevAnchor = aIdx > 0 ? amountAnchors[aIdx - 1] : null;
      const nextAnchor = aIdx < amountAnchors.length - 1 ? amountAnchors[aIdx + 1] : null;
      const currAnchor = anchor;

      const prevMidY = prevAnchor ? (prevAnchor.line.bbox.y0 + prevAnchor.line.bbox.y1) / 2 : null;
      const nextMidY = nextAnchor ? (nextAnchor.line.bbox.y0 + nextAnchor.line.bbox.y1) / 2 : null;
      const currMidY = (currAnchor.line.bbox.y0 + currAnchor.line.bbox.y1) / 2;

      const hasDistinctBboxes =
        (prevMidY !== null && Math.abs(currMidY - prevMidY) > 25) ||
        (nextMidY !== null && Math.abs(nextMidY - currMidY) > 25);

      if (hasDistinctBboxes) {
        // Multi-card layout with distinct vertical cards: cluster lines strictly within the vertical boundary
        const prevSplitY = prevAnchor ? (prevAnchor.line.bbox.y1 + currAnchor.line.bbox.y0) / 2 : -Infinity;
        const nextSplitY = nextAnchor ? (currAnchor.line.bbox.y1 + nextAnchor.line.bbox.y0) / 2 : Infinity;

        cardStart = currAnchor.lineIdx;
        while (cardStart > 0) {
          const l = sortedLines[cardStart - 1];
          const midY = (l.bbox.y0 + l.bbox.y1) / 2;
          if (midY < prevSplitY) break;
          cardStart--;
        }
        cardEnd = currAnchor.lineIdx;
        while (cardEnd < sortedLines.length - 1) {
          const nextIdx = cardEnd + 1;
          // If the next line is a date header that introduces a subsequent transaction before nextAnchor, do not cross it
          if (nextAnchor && nextIdx < nextAnchor.lineIdx) {
            const isNextDate = Boolean(parseDateWithMetadata(sortedLines[nextIdx].text, effectiveYear));
            const isFollowedByMerchantBeforeAnchor = nextIdx + 1 < nextAnchor.lineIdx && !parseDateWithMetadata(sortedLines[nextIdx + 1].text, effectiveYear);
            if (isNextDate && isFollowedByMerchantBeforeAnchor) {
              break;
            }
          }
          const l = sortedLines[nextIdx];
          const midY = (l.bbox.y0 + l.bbox.y1) / 2;
          if (midY > nextSplitY) break;
          cardEnd++;
        }
      } else {
        cardStart = aIdx > 0 ? amountAnchors[aIdx - 1].lineIdx + 1 : 0;
        cardEnd = aIdx < amountAnchors.length - 1 ? amountAnchors[aIdx + 1].lineIdx - 1 : sortedLines.length - 1;
      }
    }

    // Collect card lines
    const cardLines = sortedLines.slice(cardStart, cardEnd + 1);

    // Track uncertain fields for this transaction
    const uncertainFields: UncertainFieldType[] = [];

    // --- A. DIRECTION DETECTION ---
    let type: 'CREDIT' | 'DEBIT' = 'DEBIT';
    let directionCertain = false;
    let confidenceReason = '';

    // Check for explicit positive / income indicator:
    // 1. Line starts with or contains '+' followed by amount: "+₹1,000", "+ ₹1,000", "+1,000", "+ 1000", "+ ₹ 1000"
    // 2. Credit keywords: received, credited, cashback, refund, deposit, payout, etc.
    const hasPlusSign =
      /(?:^|\s)\+\s*(?:[₹$¥£€]|rs\.?)?\s*[\d,]+/i.test(currentLine) ||
      /(?:^|\s)\+\s*(?:[₹$¥£€]|rs\.?)?\s*[\d,]+/i.test(anchor.line.text) ||
      currentLine.startsWith('+') ||
      anchor.line.text.startsWith('+') ||
      currentLine.includes('+') ||
      anchor.line.text.includes('+');

    const hasCreditWord = creditKeywords.test(currentLine) || cardLines.some((cl) => creditKeywords.test(cl.text));
    const hasDebitWord = debitKeywords.test(currentLine) || cardLines.some((cl) => debitKeywords.test(cl.text));

    // In multi-transaction GPay list view (amountAnchors.length > 1),
    // the surrounding layout context confirms that amounts with '+' are Income,
    // and amounts without '+' are Expenses.
    const isMultiRowGPayList = amountAnchors.length > 1;

    if (hasPlusSign || hasCreditWord) {
      type = 'CREDIT';
      directionCertain = true;
      confidenceReason = hasPlusSign
        ? 'Income verified via + indicator.'
        : 'Income verified via credit keyword.';
    } else if (hasDebitWord || isMultiRowGPayList) {
      type = 'DEBIT';
      directionCertain = true;
      confidenceReason = hasDebitWord
        ? 'Expense verified via debit indicator.'
        : 'Expense recognized from GPay transaction list.';
    } else {
      type = 'DEBIT';
      directionCertain = false;
      uncertainFields.push('type');
      confidenceReason = 'Needs review: Direction (income vs expense) could not be verified from screenshot text.';
    }

    // --- B. DATE DETECTION ---
    let detectedDate: string | null = null;
    let dateHasExplicitYear = false;

    // Check current line for date
    const dateOnCurrent = parseDateWithMetadata(currentLine, effectiveYear);
    if (dateOnCurrent) {
      detectedDate = dateOnCurrent.isoDate;
      dateHasExplicitYear = dateOnCurrent.hasExplicitYear;
    }

    // Check lines above current anchor within the card (section header date / preceding line date)
    if (!detectedDate) {
      for (let back = idx - 1; back >= cardStart; back--) {
        const lineText = sortedLines[back].text;
        const parsed = parseDateWithMetadata(lineText, effectiveYear);
        if (parsed) {
          detectedDate = parsed.isoDate;
          dateHasExplicitYear = parsed.hasExplicitYear;
          break;
        }
      }
    }

    // Check lines directly below current anchor within the card (in GPay history, subtitle date is on idx + 1)
    if (!detectedDate) {
      for (let fwd = idx + 1; fwd <= cardEnd; fwd++) {
        const lineText = sortedLines[fwd].text;
        const parsed = parseDateWithMetadata(lineText, effectiveYear);
        if (parsed) {
          detectedDate = parsed.isoDate;
          dateHasExplicitYear = parsed.hasExplicitYear;
          break;
        }
      }
    }

    // Check pre-calculated running section date for this line
    if (!detectedDate && lineDates[idx]) {
      detectedDate = lineDates[idx]!.isoDate;
      dateHasExplicitYear = lineDates[idx]!.hasExplicitYear;
    }

    // Fallback to today
    if (!detectedDate) {
      detectedDate = new Date().toISOString().slice(0, 10);
      dateHasExplicitYear = false;
      uncertainFields.push('date');
    }

    // Year validation rule (Requirement 7):
    // If date has no explicit year AND no global year header was visible in the screenshot,
    // flag dateNeedsReview: true
    const dateNeedsReview = !dateHasExplicitYear && !hasGlobalYear;
    if (dateNeedsReview && !uncertainFields.includes('date')) {
      uncertainFields.push('date');
    }

    // --- C. MERCHANT / PERSON DESCRIPTION DETECTION ---
    let candidateDescription = '';

    // Case 1: Merchant name alongside amount on the same line, e.g. "Paid to Swiggy ₹420"
    const lineWithoutAmount = currentLine
      .replace(/(?:[₹$¥£€]|rs\.?|inr)?\s*[0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?/gi, '')
      .replace(/[₹$¥£€,+-]/g, '')
      .trim();

    if (
      lineWithoutAmount.length >= 3 &&
      !/^(?:paid|paid\s*to|sent|sent\s*to|received|received\s*from|money\s*received|completed|credited|debited|payment\s*to)$/i.test(lineWithoutAmount) &&
      !parseDateWithMetadata(lineWithoutAmount, effectiveYear)
    ) {
      candidateDescription = lineWithoutAmount;
    } else {
      // Case 2: Inspect lines above the amount anchor within the card
      for (let back = idx - 1; back >= cardStart; back--) {
        const candidateLine = sortedLines[back].text.trim();
        const isNoise = GPAY_UI_NOISE_PATTERNS.some((p) => p.test(candidateLine));
        const isDate = Boolean(parseDateWithMetadata(candidateLine, effectiveYear));
        const isUpiHandle = /@\w+/.test(candidateLine);
        const isAmountOnly = /^[+-]?\s*(?:[₹$¥£€]|rs\.?)?\s*[\d,]+(?:\.\d{2})?$/i.test(candidateLine);

        if (!isNoise && !isDate && !isUpiHandle && !isAmountOnly && candidateLine.length >= 2) {
          candidateDescription = candidateLine;
          break;
        }
      }

      // Case 3: If still empty, check lines below
      if (!candidateDescription) {
        for (let fwd = idx + 1; fwd <= cardEnd; fwd++) {
          const candidateLine = sortedLines[fwd].text.trim();
          const isNoise = GPAY_UI_NOISE_PATTERNS.some((p) => p.test(candidateLine));
          const isDate = Boolean(parseDateWithMetadata(candidateLine, effectiveYear));
          const isUpiHandle = /@\w+/.test(candidateLine);
          const isAmountOnly = /^[+-]?\s*(?:[₹$¥£€]|rs\.?)?\s*[\d,]+(?:\.\d{2})?$/i.test(candidateLine);

          if (!isNoise && !isDate && !isUpiHandle && !isAmountOnly && candidateLine.length >= 2) {
            candidateDescription = candidateLine;
            break;
          }
        }
      }
    }

    const finalDescription = cleanMerchantDescription(candidateDescription);
    if (finalDescription === 'Unclear merchant') {
      uncertainFields.push('description');
    }

    // --- D. CONFIDENCE & QUALITY ASSIGNMENT ---
    let confidence: ExtractionConfidence = 'HIGH';
    if (uncertainFields.length >= 2 || !directionCertain) {
      confidence = 'LOW';
    } else if (uncertainFields.length === 1) {
      confidence = 'MEDIUM';
    }

    const needsReview = uncertainFields.length > 0;

    transactions.push({
      id: `gpay_${Date.now()}_${txCounter++}`,
      date: detectedDate,
      description: finalDescription,
      amountPaise: anchor.amountPaise.toString(),
      type,
      confidence,
      confidenceReason,
      rawText: currentLine,
      needsReview,
      uncertainFields,
      dateNeedsReview,
    });
  }

  // Deduplicate overlapping transactions across cards or screenshots
  const deduplicated = deduplicateExtractedTransactions(transactions);
  deduplicated.sort((a, b) => a.date.localeCompare(b.date));

  if (deduplicated.length === 0) {
    return {
      success: false,
      sourceType: 'IMAGE',
      transactions: [],
      pagesProcessed,
      quality: {
        totalDetected: 0,
        highConfidenceCount: 0,
        needsReviewCount: 0,
        warnings: ["We couldn't read the transactions in this screenshot."],
      },
      errorMessage: "We couldn't read the transactions in this screenshot. Try a clearer GPay screenshot with transaction dates, names and amounts visible.",
    };
  }

  const highConfidenceCount = deduplicated.filter((t) => t.confidence === 'HIGH').length;
  const needsReviewCount = deduplicated.length - highConfidenceCount;

  if (needsReviewCount > 0) {
    warnings.push(`${needsReviewCount} transaction(s) need your review before analysis.`);
  }

  return {
    success: true,
    sourceType: 'IMAGE',
    transactions: deduplicated,
    pagesProcessed,
    quality: {
      totalDetected: deduplicated.length,
      highConfidenceCount,
      needsReviewCount,
      periodStart: deduplicated[0]?.date,
      periodEnd: deduplicated[deduplicated.length - 1]?.date,
      warnings,
    },
  };
}

/**
 * Convenience wrapper that invokes parseGPaySpatialBlocks with text-only lines.
 */
export function parseGPayAndMobileScreenshots(
  rawText: string,
  pagesProcessed = 1
): StatementExtractionResult {
  return parseGPaySpatialBlocks([], rawText, pagesProcessed);
}

/**
 * Tabular line-by-line bank statement parsing (for standard PDF and CSV statements).
 */
export function parseTabularStatementLines(
  rawText: string,
  sourceType: StatementSourceType,
  pagesProcessed = 1
): StatementExtractionResult {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const transactions: ExtractedStatementTransaction[] = [];
  let closingBalancePaise: string | undefined = undefined;
  const warnings: string[] = [];

  const dateRegex = /(\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b|\b\d{1,2}[\/\-\s](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\/\-\s]\d{2,4}\b|\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b)/i;
  const creditKeywords = /\b(cr|credit|deposit|payout|refund|received|cashback|salary|credited|earnings|interest|dividend|bonus|settlement)\b/i;
  const debitKeywords = /\b(dr|debit|withdrawal|paid|sent|pos|atm|charge|bill|fuel|swiggy|zomato|uber|ola|emi|transfer\s*to)\b/i;

  const balanceKeywords = /(?:closing\s*balance|available\s*balance|net\s*balance|clear\s*balance)[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{2})?)/i;
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
  let previousRunningBalance: bigint | null = null;

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

    const amounts = extractCandidateAmounts(line, rawDate);
    if (amounts.length === 0) {
      continue;
    }

    let chosenAmount = amounts[0];
    let type: 'CREDIT' | 'DEBIT' = 'DEBIT';
    let confidence: ExtractionConfidence = 'HIGH';
    let reason = 'High confidence: complete date, amount, and transaction direction matched.';

    const hasCr = /\b(cr|credit|deposit)\b/i.test(line);
    const hasDr = /\b(dr|debit|withdrawal)\b/i.test(line);

    if (amounts.length >= 2) {
      const currentBal = parseCleanAmount(amounts[amounts.length - 1]);

      if (amounts.length >= 3) {
        const first = parseCleanAmount(amounts[0]);
        const second = parseCleanAmount(amounts[1]);
        if (first && first > 0n && (!second || second === 0n)) {
          chosenAmount = amounts[0];
          type = 'DEBIT';
        } else if (second && second > 0n) {
          chosenAmount = amounts[1];
          type = 'CREDIT';
        }
        if (currentBal !== null) {
          previousRunningBalance = currentBal;
          if (!closingBalancePaise) closingBalancePaise = currentBal.toString();
        }
      } else if (amounts.length === 2) {
        chosenAmount = amounts[0];
        if (hasCr) {
          type = 'CREDIT';
        } else if (hasDr) {
          type = 'DEBIT';
        } else if (previousRunningBalance !== null && currentBal !== null) {
          if (currentBal > previousRunningBalance) {
            type = 'CREDIT';
            reason = 'Direction inferred from positive balance delta.';
          } else if (currentBal < previousRunningBalance) {
            type = 'DEBIT';
            reason = 'Direction inferred from negative balance delta.';
          }
        } else {
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

        if (currentBal !== null) {
          previousRunningBalance = currentBal;
          if (!closingBalancePaise) closingBalancePaise = currentBal.toString();
        }
      }
    } else {
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
      needsReview: confidence !== 'HIGH',
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
        warnings: ['No transaction records could be reliably extracted from the tabular lines.'],
      },
      errorMessage:
        sourceType === 'IMAGE'
          ? "We couldn't read the transactions in this screenshot. Try a clearer GPay screenshot with transaction dates, names and amounts visible."
          : "We couldn't reliably read the transaction table from this file.",
    };
  }

  // Deduplicate and sort chronologically
  const deduplicated = deduplicateExtractedTransactions(transactions);
  deduplicated.sort((a, b) => a.date.localeCompare(b.date));

  const highConfidenceCount = deduplicated.filter((t) => t.confidence === 'HIGH').length;
  const needsReviewCount = deduplicated.length - highConfidenceCount;

  if (needsReviewCount > 0) {
    warnings.push(`${needsReviewCount} transaction(s) require review due to ambiguous columns or keywords.`);
  }

  return {
    success: true,
    sourceType,
    transactions: deduplicated,
    closingBalancePaise,
    pagesProcessed,
    quality: {
      totalDetected: deduplicated.length,
      highConfidenceCount,
      needsReviewCount,
      periodStart: deduplicated[0]?.date,
      periodEnd: deduplicated[deduplicated.length - 1]?.date,
      warnings,
    },
  };
}

/**
 * Parses raw text extracted from PDF or OCR image into structured bank transactions.
 * Intelligently evaluates both tabular bank statement format and GPay layout format,
 * picking the most accurate extraction.
 */
export function parseBankStatementText(
  rawText: string,
  sourceType: StatementSourceType,
  pagesProcessed = 1
): StatementExtractionResult {
  // If explicitly an IMAGE, compare GPay layout vs Tabular
  if (sourceType === 'IMAGE') {
    const gpayResult = parseGPayAndMobileScreenshots(rawText, pagesProcessed);
    const tabularResult = parseTabularStatementLines(rawText, sourceType, pagesProcessed);

    // If tabular extracted more (e.g. image of a printed bank statement table)
    if (tabularResult.success && tabularResult.transactions.length > gpayResult.transactions.length) {
      return tabularResult;
    }
    if (gpayResult.success && gpayResult.transactions.length > 0) {
      return gpayResult;
    }
    if (tabularResult.success && tabularResult.transactions.length > 0) {
      return tabularResult;
    }
    return gpayResult;
  }

  // For PDF / CSV, try tabular first
  const tabularResult = parseTabularStatementLines(rawText, sourceType, pagesProcessed);
  if (tabularResult.success && tabularResult.transactions.length > 0) {
    return tabularResult;
  }

  // Fallback: scanned PDF that might be a mobile screenshot
  const gpayFallback = parseGPayAndMobileScreenshots(rawText, pagesProcessed);
  if (gpayFallback.success && gpayFallback.transactions.length > 0) {
    return gpayFallback;
  }

  return tabularResult;
}
