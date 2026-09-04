import {
  parseDateWithMetadata,
  extractCandidateAmounts,
  preprocessOcrLine,
  cleanMerchantDescription,
} from './statement-extractor';

export interface ParsedReceiptResult {
  merchant: string;
  amountRupees: number | null;
  date: string;
  category: string;
  rawText: string;
  isUncertain: boolean;
  message?: string;
}

// Boilerplate receipt headers to ignore when identifying the merchant
const RECEIPT_NOISE_PATTERNS = [
  /^(?:tax\s*invoice|retail\s*invoice|cash\s*memo|bill\s*of\s*supply|sales\s*receipt|receipt)$/i,
  /^(?:original\s*for\s*recipient|duplicate|customer\s*copy|store\s*copy|merchant\s*copy)$/i,
  /^(?:welcome|thank\s*you|visit\s*again|have\s*a\s*nice\s*day)$/i,
  /^(?:gstin|fssai|cin|pan|tin|vat\s*no|tax\s*id|reg\s*no)[\s\d\w:]*$/i,
  /^(?:order\s*no|bill\s*no|invoice\s*no|token\s*no|table\s*no|pos\s*id)[\s\d\w:]*$/i,
  /^(?:date|time|cashier|server|counter|terminal)[\s\d\w:]*$/i,
  /^(?:phone|tel|mobile|call|fax|email|website|www\.)[\s\d\w:\+]*$/i,
];

// Contextual keywords identifying final payable total
const TOTAL_ANCHOR_PATTERNS = [
  /\b(?:grand\s*total|net\s*payable|amount\s*payable|total\s*payable|final\s*amount|total\s*amount|amount\s*due|net\s*total|net\s*amount|total\s*bill|balance\s*due)\b/i,
  /\b(?:total|paid\s*amount|total\s*paid|bill\s*amount)\b/i,
];

// Explicit exclusions to avoid subtotals and taxes
const NON_TOTAL_EXCLUSIONS = /\b(?:sub\s*total|subtotal|item\s*total|cgst|sgst|igst|vat|tax|discount|round\s*off|savings|cash\s*tendered|change\s*due|items\s*count|qty)\b/i;

// Keyword mappings for receipt categories
const RECEIPT_CATEGORY_RULES: Array<{ category: string; keywords: RegExp }> = [
  {
    category: 'DISCRETIONARY',
    keywords: /\b(restaurant|cafe|hotel|bakery|coffee|tea|snacks|food|kitchen|bites|biryani|pizza|burger|swiggy|zomato|dining|dhaba)\b/i,
  },
  {
    category: 'WORK_FUEL_TRANSIT',
    keywords: /\b(petrol|diesel|fuel|cng|indian\s*oil|bharat\s*petroleum|hp\s*petrol|shell|station|auto|cab|uber|ola|toll|fastag|parking)\b/i,
  },
  {
    category: 'ESSENTIAL_GROCERIES',
    keywords: /\b(supermarket|hypermarket|groceries|kirana|vegetables|fruits|mart|retail|provisions|stores|dmart|reliance\s*fresh|bazaar)\b/i,
  },
  {
    category: 'HEALTHCARE',
    keywords: /\b(pharmacy|medical|chemist|druggist|hospital|clinic|diagnostics|apollo|medplus|netmeds|health)\b/i,
  },
  {
    category: 'ESSENTIAL_UTILITIES',
    keywords: /\b(electricity|broadband|telecom|airtel|jio|vi|vodafone|bescom|tneb|gas|cylinder|water)\b/i,
  },
  {
    category: 'WORK_EQUIPMENT',
    keywords: /\b(hardware|tools|spares|service\s*centre|automobiles|repairs|garage|puncture|tyres)\b/i,
  },
];

/**
 * Parses raw OCR lines from a physical receipt to reliably extract:
 * 1. Merchant name
 * 2. Date
 * 3. Final Total (excluding subtotal, tax, discount)
 * 4. Inferred Category
 */
export function parseReceiptOcrLines(rawLines: string[]): ParsedReceiptResult {
  const lines = rawLines.map((l) => l.trim()).filter((l) => l.length > 0);
  const todayIso = new Date().toISOString().slice(0, 10);

  if (lines.length === 0) {
    return {
      merchant: 'Receipt Expense',
      amountRupees: null,
      date: todayIso,
      category: 'OTHER',
      rawText: '',
      isUncertain: true,
      message: "We couldn't read readable receipt details in this image.",
    };
  }

  // 1. Merchant Extraction
  // Look at the top 6 lines of the receipt for the business name
  let merchant = '';
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const candidate = lines[i];
    const isNoise = RECEIPT_NOISE_PATTERNS.some((p) => p.test(candidate));
    const hasDate = Boolean(parseDateWithMetadata(candidate));
    const hasOnlyNumbers = /^[^a-zA-Z]*$/.test(candidate);

    if (!isNoise && !hasDate && !hasOnlyNumbers && candidate.length >= 3) {
      merchant = cleanMerchantDescription(candidate);
      if (merchant && merchant !== 'Unclear merchant') {
        break;
      }
    }
  }

  if (!merchant || merchant === 'Unclear merchant') {
    merchant = 'Receipt Expense';
  }

  // 2. Date Extraction
  let detectedDate = todayIso;
  for (const line of lines) {
    const parsed = parseDateWithMetadata(line);
    if (parsed) {
      detectedDate = parsed.isoDate;
      break;
    }
  }

  // 3. Final Total Amount Extraction
  // Scan for explicit Total labels while strictly skipping subtotal / tax
  let totalRupees: number | null = null;
  let isUncertain = false;

  // Pass 1: Strict Total Anchor (Grand Total / Net Payable / Payable)
  for (let i = 0; i < lines.length; i++) {
    const { cleanedText } = preprocessOcrLine(lines[i]);

    // Check if line matches primary total patterns and is NOT excluded as subtotal/tax
    if (TOTAL_ANCHOR_PATTERNS[0].test(cleanedText) && !NON_TOTAL_EXCLUSIONS.test(cleanedText)) {
      const candidates = extractCandidateAmounts(cleanedText);
      if (candidates.length > 0) {
        totalRupees = Number(candidates[candidates.length - 1]);
        break;
      } else if (i + 1 < lines.length) {
        // Amount might be on the line directly below the label
        const nextLineAmounts = extractCandidateAmounts(lines[i + 1]);
        if (nextLineAmounts.length > 0) {
          totalRupees = Number(nextLineAmounts[0]);
          break;
        }
      }
    }
  }

  // Pass 2: Secondary Total Anchor (e.g. "Total ₹420", "Total Paid 420")
  if (totalRupees === null) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const { cleanedText } = preprocessOcrLine(lines[i]);
      if (TOTAL_ANCHOR_PATTERNS[1].test(cleanedText) && !NON_TOTAL_EXCLUSIONS.test(cleanedText)) {
        const candidates = extractCandidateAmounts(cleanedText);
        if (candidates.length > 0) {
          totalRupees = Number(candidates[candidates.length - 1]);
          break;
        } else if (i + 1 < lines.length) {
          const nextLineAmounts = extractCandidateAmounts(lines[i + 1]);
          if (nextLineAmounts.length > 0) {
            totalRupees = Number(nextLineAmounts[0]);
            break;
          }
        }
      }
    }
  }

  // Pass 3: Fallback if no explicit "Total" label was recognized
  // Pick the largest valid monetary amount found in the bottom 40% of the receipt
  if (totalRupees === null) {
    const bottomSlice = lines.slice(Math.floor(lines.length * 0.5));
    const allBottomAmounts: number[] = [];
    for (const l of bottomSlice) {
      if (NON_TOTAL_EXCLUSIONS.test(l)) continue;
      const amounts = extractCandidateAmounts(l);
      for (const a of amounts) {
        const num = Number(a);
        if (num > 0 && num < 100000) {
          allBottomAmounts.push(num);
        }
      }
    }

    if (allBottomAmounts.length > 0) {
      totalRupees = Math.max(...allBottomAmounts);
      isUncertain = true;
    }
  }

  // 4. Category Inference
  let category = 'OTHER';
  const fullText = lines.join(' ');
  for (const rule of RECEIPT_CATEGORY_RULES) {
    if (rule.keywords.test(merchant) || rule.keywords.test(fullText)) {
      category = rule.category;
      break;
    }
  }

  let message: string | undefined = undefined;
  if (totalRupees === null || totalRupees <= 0) {
    isUncertain = true;
    message = "We found a possible receipt, but the final total is unclear. Please check and enter the amount.";
  } else if (isUncertain) {
    message = "We found a possible total. Please check it before confirming.";
  }

  return {
    merchant,
    amountRupees: totalRupees,
    date: detectedDate,
    category,
    rawText: lines.join('\n'),
    isUncertain,
    message,
  };
}

export function extractReceiptFromText(text: string): ParsedReceiptResult {
  const lines = text.split('\n');
  return parseReceiptOcrLines(lines);
}
