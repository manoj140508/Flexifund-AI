/**
 * Deterministic Transaction Categorization Engine
 * 
 * Rules-based categorization tailored for Indian gig workers, delivery partners,
 * ride-hailing drivers, and informal workers.
 * 
 * Guarantees:
 * - Deterministic output.
 * - Explicit confidence scores.
 * - Falls back to UNCATEGORIZED when match confidence is insufficient.
 */

import { ExpenseCategory, TransactionType } from '../domain/transactions';

export interface CategorizationResult {
  category: ExpenseCategory;
  normalizedMerchant: string;
  confidence: number;
}

interface KeywordRule {
  pattern: RegExp;
  category: ExpenseCategory;
  normalizedMerchant: string;
  confidence: number;
}

// Rules ordered by specificity
const CATEGORY_RULES: KeywordRule[] = [
  // 1. Debt & EMI Repayments
  { pattern: /\b(bajaj\s*(?:finance|fin|auto)?|muthoot|manappuram|cholamandalam)\b/i, category: 'DEBT_REPAYMENT', normalizedMerchant: 'NBFC Loan', confidence: 0.95 },
  { pattern: /\b(navi\s*fin|kissht|kreditt|krazybee|lazypay|axio|zestmoney|home\s*credit)\b/i, category: 'DEBT_REPAYMENT', normalizedMerchant: 'Digital Lending EMI', confidence: 0.95 },
  { pattern: /\b(loan\s*emi|nach\s*debit|ecs\s*debit|loan\s*repay|emi)\b/i, category: 'DEBT_REPAYMENT', normalizedMerchant: 'Loan EMI', confidence: 0.9 },
  { pattern: /\b(credit\s*card\s*pay|cc\s*bill|sbi\s*card|hdfc\s*card|icici\s*card)\b/i, category: 'DEBT_REPAYMENT', normalizedMerchant: 'Credit Card Bill', confidence: 0.9 },

  // 2. Bank Fees & Penalty Charges
  { pattern: /\b(min\s*bal|non\s*maintenance|amb\s*charge|mab\s*charge)\b/i, category: 'FEES_CHARGES', normalizedMerchant: 'Bank Non-Maintenance Fee', confidence: 0.95 },
  { pattern: /\b(chq\s*bounce|ecs\s*return|nach\s*return|penalty|penal\s*chg)\b/i, category: 'FEES_CHARGES', normalizedMerchant: 'Penalty / Return Charge', confidence: 0.95 },
  { pattern: /\b(sms\s*charge|atm\s*fee|debit\s*card\s*ann|annual\s*fee)\b/i, category: 'FEES_CHARGES', normalizedMerchant: 'Bank Service Charge', confidence: 0.9 },

  // 3. Work Fuel & Transit (Critical for gig workers)
  { pattern: /\b(indian\s*oil|iocl|bpcl|bharat\s*petrol|hpcl|hindustan\s*petrol|shell\s*petrol|petrol|diesel|cng\s*fuel)\b/i, category: 'WORK_FUEL_TRANSIT', normalizedMerchant: 'Fuel Station', confidence: 0.95 },
  { pattern: /\b(fastag|toll\s*plaza|nhai|toll\s*debit)\b/i, category: 'WORK_FUEL_TRANSIT', normalizedMerchant: 'Fastag Toll', confidence: 0.95 },
  { pattern: /\b(metro\s*rail|bmrc|dmrc|mmrda|chalo\s*card)\b/i, category: 'WORK_FUEL_TRANSIT', normalizedMerchant: 'Public Transit', confidence: 0.9 },

  // 4. Work Equipment & Maintenance
  { pattern: /\b(bike\s*serv|garage|auto\s*spare|puncture|tyre|helmets|mechanic|service\s*center)\b/i, category: 'WORK_EQUIPMENT', normalizedMerchant: 'Vehicle Maintenance', confidence: 0.85 },

  // 5. Essential Groceries & Daily Provisions
  { pattern: /\b(dmart|d-mart|avenue\s*supermarts)\b/i, category: 'ESSENTIAL_GROCERIES', normalizedMerchant: 'D-Mart', confidence: 0.95 },
  { pattern: /\b(blinkit|grofers|zepto|instamart|bigbasket|bb\s*daily)\b/i, category: 'ESSENTIAL_GROCERIES', normalizedMerchant: 'Quick Commerce Groceries', confidence: 0.9 },
  { pattern: /\b(reliance\s*fresh|reliance\s*smart|more\s*retail|spencer|nature\s*basket)\b/i, category: 'ESSENTIAL_GROCERIES', normalizedMerchant: 'Supermarket Groceries', confidence: 0.9 },
  { pattern: /\b(dairy|milk|amul|nandini|mother\s*dairy|vegetable|sabzi|kirana|provision)\b/i, category: 'ESSENTIAL_GROCERIES', normalizedMerchant: 'Local Groceries & Dairy', confidence: 0.85 },

  // 6. Essential Utilities & Recharges
  { pattern: /\b(bescom|tneb|mseb|cesc|dhbvn|uppcl|wbsetcl|electricity|power\s*corp)\b/i, category: 'ESSENTIAL_UTILITIES', normalizedMerchant: 'Electricity Board', confidence: 0.95 },
  { pattern: /\b(indane|bharat\s*gas|hp\s*gas|lpg\s*cyl|piped\s*gas|igl|mgl)\b/i, category: 'ESSENTIAL_UTILITIES', normalizedMerchant: 'LPG / Gas Utility', confidence: 0.95 },
  { pattern: /\b(bwssb|water\s*board|jal\s*board|water\s*tanker)\b/i, category: 'ESSENTIAL_UTILITIES', normalizedMerchant: 'Water Utility', confidence: 0.9 },
  { pattern: /\b(airtel|jio|vodafone|vi\s*prepaid|bsnl|tata\s*play|dth)\b/i, category: 'ESSENTIAL_UTILITIES', normalizedMerchant: 'Telecom / Mobile Utility', confidence: 0.85 },

  // 7. Essential Housing
  { pattern: /\b(rent|rent\s*pay|house\s*rent|landlord|flat\s*rent|pg\s*rent|society\s*maint)\b/i, category: 'ESSENTIAL_HOUSING', normalizedMerchant: 'Housing Rent / Maintenance', confidence: 0.9 },

  // 8. Healthcare & Medicines
  { pattern: /\b(apollo\s*pharma|medplus|netmeds|pharmeasy|tata\s*1mg|wellness\s*forever|chemist|pharmacy)\b/i, category: 'HEALTHCARE', normalizedMerchant: 'Pharmacy', confidence: 0.95 },
  { pattern: /\b(hospital|clinic|doctor|diagnostic|pathology|dr\s*lal|thyrocare)\b/i, category: 'HEALTHCARE', normalizedMerchant: 'Medical Clinic / Hospital', confidence: 0.9 },

  // 9. Discretionary Spending (Entertainment, Dining, Subscriptions)
  { pattern: /\b(zomato|swiggy|domino|mcdonald|kfc|starbucks|pizza\s*hut|burger\s*king)\b/i, category: 'DISCRETIONARY', normalizedMerchant: 'Dining & Takeout', confidence: 0.9 },
  { pattern: /\b(netflix|amazon\s*prime|disney|hotstar|spotify|youtube\s*prem|apple\s*music)\b/i, category: 'DISCRETIONARY', normalizedMerchant: 'Media Subscription', confidence: 0.95 },
  { pattern: /\b(pvr|inox|cinepolis|bookmyshow|theatre|cinema)\b/i, category: 'DISCRETIONARY', normalizedMerchant: 'Movies & Entertainment', confidence: 0.95 },
  { pattern: /\b(amazon\s*in|flipkart|myntra|ajio|meesho|nykaa)\b/i, category: 'DISCRETIONARY', normalizedMerchant: 'Online Shopping', confidence: 0.85 },
  { pattern: /\b(bar|pub|liquor|wines|brewery)\b/i, category: 'DISCRETIONARY', normalizedMerchant: 'Pubs & Beverages', confidence: 0.9 },
];

/**
 * Income patterns specific to Indian gig and platform workers
 */
const INCOME_RULES: KeywordRule[] = [
  { pattern: /\b(swiggy\s*pay|swiggy\s*payout|bundl\s*technologies)\b/i, category: 'INCOME', normalizedMerchant: 'Swiggy Partner Payout', confidence: 0.95 },
  { pattern: /\b(zomato\s*pay|zomato\s*payout|eternal\s*payout)\b/i, category: 'INCOME', normalizedMerchant: 'Zomato Partner Payout', confidence: 0.95 },
  { pattern: /\b(uber\s*india|uber\s*payout|uber\s*tech)\b/i, category: 'INCOME', normalizedMerchant: 'Uber Partner Payout', confidence: 0.95 },
  { pattern: /\b(ani\s*technologies|ola\s*cabs|ola\s*payout)\b/i, category: 'INCOME', normalizedMerchant: 'Ola Partner Payout', confidence: 0.95 },
  { pattern: /\b(porter|shadowfax|dunzo|zepto\s*partner|blinkit\s*partner|rapido\s*pay)\b/i, category: 'INCOME', normalizedMerchant: 'Gig Delivery Payout', confidence: 0.95 },
  { pattern: /\b(salary|sal\s*cred|payroll|wages)\b/i, category: 'INCOME', normalizedMerchant: 'Wage / Salary Deposit', confidence: 0.95 },
  { pattern: /\b(upicredit|upi\s*cr|upi\/cr|merchant\s*settlement|qr\s*credit)\b/i, category: 'INCOME', normalizedMerchant: 'Customer / UPI Payment Received', confidence: 0.8 },
];

/**
 * Deterministically categorizes a transaction based on its description and direction.
 */
export function categorizeTransaction(
  description: string,
  direction: TransactionType
): CategorizationResult {
  const clean = description.trim();

  // If transaction is incoming income
  if (direction === 'INCOME') {
    for (const rule of INCOME_RULES) {
      if (rule.pattern.test(clean)) {
        return {
          category: 'INCOME',
          normalizedMerchant: rule.normalizedMerchant,
          confidence: rule.confidence,
        };
      }
    }
    return {
      category: 'INCOME',
      normalizedMerchant: extractMerchantFallback(clean) || 'Earnings Deposit',
      confidence: 0.7,
    };
  }

  // Transfer checks
  if (direction === 'TRANSFER' || /\b(self\s*transfer|funds\s*transfer\s*to\s*self|own\s*acc)\b/i.test(clean)) {
    return {
      category: 'TRANSFER',
      normalizedMerchant: 'Account Transfer',
      confidence: 0.9,
    };
  }

  // Expense checks against rule table
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(clean)) {
      return {
        category: rule.category,
        normalizedMerchant: rule.normalizedMerchant,
        confidence: rule.confidence,
      };
    }
  }

  // Fallback: If no rule matches with high confidence, use UNCATEGORIZED
  return {
    category: 'UNCATEGORIZED',
    normalizedMerchant: extractMerchantFallback(clean) || 'UNKNOWN',
    confidence: 0.3,
  };
}

/**
 * Heuristic to extract merchant name from standard UPI transaction strings
 * e.g. "UPI/4059281920/PAYTM/merchant_name@okaxis" -> "PAYTM"
 */
function extractMerchantFallback(desc: string): string {
  if (desc.startsWith('UPI/') || desc.startsWith('UPI-')) {
    const parts = desc.split(/[/|-]/);
    if (parts.length >= 3 && parts[2].trim()) {
      return parts[2].trim().toUpperCase();
    }
  }
  const words = desc.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  return words.slice(0, 2).join(' ').toUpperCase();
}
