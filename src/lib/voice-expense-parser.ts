export interface ParsedVoiceExpense {
  amountRupees: number | null;
  description: string;
  category: string;
  date: string;
  rawTranscript: string;
  amountUnclear: boolean;
  confidenceMessage?: string;
}

// Map keywords to standard worker-friendly categories
const CATEGORY_KEYWORDS: Array<{ category: string; label: string; keywords: RegExp }> = [
  {
    category: 'WORK_FUEL_TRANSIT',
    label: 'Petrol & Travel',
    keywords: /\b(petrol|diesel|fuel|cng|auto|taxi|cab|uber|ola|bus|metro|train|fare|transit|bike|scooter|puncture|toll)\b/i,
  },
  {
    category: 'DISCRETIONARY',
    label: 'Food & Meals',
    keywords: /\b(lunch|dinner|breakfast|food|snacks|tea|chai|coffee|restaurant|hotel|swiggy|zomato|samosa|biryani|meal)\b/i,
  },
  {
    category: 'ESSENTIAL_GROCERIES',
    label: 'Groceries & Provisions',
    keywords: /\b(groceries|ration|vegetables|sabzi|fruits|milk|rice|dal|wheat|atta|supermarket|kirana)\b/i,
  },
  {
    category: 'ESSENTIAL_UTILITIES',
    label: 'Bills & Recharge',
    keywords: /\b(electricity|current|light\s*bill|gas|cylinder|water|wifi|broadband|internet|recharge|mobile|phone\s*bill|dth)\b/i,
  },
  {
    category: 'ESSENTIAL_HOUSING',
    label: 'Rent & Housing',
    keywords: /\b(rent|house\s*rent|room\s*rent|pg|maintenance|landlord)\b/i,
  },
  {
    category: 'WORK_EQUIPMENT',
    label: 'Work & Tools',
    keywords: /\b(tools|equipment|repair|service|spares|uniform|bag|helmets|phone\s*repair)\b/i,
  },
  {
    category: 'DEBT_REPAYMENT',
    label: 'Loan & EMI',
    keywords: /\b(loan|emi|installment|interest|credit\s*card|kist|chitti)\b/i,
  },
  {
    category: 'HEALTHCARE',
    label: 'Medicine & Health',
    keywords: /\b(medicine|tablet|doctor|hospital|clinic|pharmacy|medical|syrup|test|injection)\b/i,
  },
];

/**
 * Deterministically extracts amount, item description, and category from a spoken expense transcript.
 */
export function parseVoiceExpenseTranscript(transcript: string): ParsedVoiceExpense {
  const cleanTranscript = transcript.trim();
  const todayIso = new Date().toISOString().slice(0, 10);

  if (!cleanTranscript) {
    return {
      amountRupees: null,
      description: 'Expense',
      category: 'OTHER',
      date: todayIso,
      rawTranscript: '',
      amountUnclear: true,
      confidenceMessage: "I'm not sure about the amount. Please enter it manually.",
    };
  }

  // 1. Amount Extraction
  // Look for patterns like "250 rupees", "₹250", "Rs 250", "spent 250", "paid 500", "cost 120"
  let amount: number | null = null;

  // Pattern A: Number explicitly tied to currency words (e.g. "250 rupees", "rs. 500", "₹120", "500 bucks", "inr 300")
  const currencyMatch = cleanTranscript.match(/(?:(?:rs\.?|inr|₹)\s*([0-9]+(?:\.[0-9]{1,2})?)|([0-9]+(?:\.[0-9]{1,2})?)\s*(?:rupees?|rupaye?|rs\.?|bucks?|inr))/i);
  if (currencyMatch) {
    const rawVal = currencyMatch[1] || currencyMatch[2];
    if (rawVal && !isNaN(Number(rawVal)) && Number(rawVal) > 0) {
      amount = Number(rawVal);
    }
  }

  // Pattern B: Number preceded by spent/paid/bought/cost/of (e.g. "spent 250 on petrol", "paid 500 for electricity", "of 299")
  if (amount === null) {
    const actionMatch = cleanTranscript.match(/(?:spent|paid|bought|cost\s*(?:me)?|for|of|gave)\s*(?:about|around)?\s*([0-9]+(?:\.[0-9]{1,2})?)\b/i);
    if (actionMatch && actionMatch[1]) {
      const rawVal = actionMatch[1];
      if (!isNaN(Number(rawVal)) && Number(rawVal) > 0) {
        amount = Number(rawVal);
      }
    }
  }

  // Pattern C: Any standalone number in the sentence if only one number exists
  if (amount === null) {
    const allNumbers = cleanTranscript.match(/\b([1-9][0-9]{0,5}(?:\.[0-9]{1,2})?)\b/g);
    if (allNumbers && allNumbers.length === 1) {
      const rawVal = allNumbers[0];
      if (!isNaN(Number(rawVal)) && Number(rawVal) > 0) {
        amount = Number(rawVal);
      }
    }
  }

  // 2. Category Inference
  let category = 'OTHER';
  for (const cat of CATEGORY_KEYWORDS) {
    if (cat.keywords.test(cleanTranscript)) {
      category = cat.category;
      break;
    }
  }

  // 3. Description Extraction
  // Remove boilerplate words ("I spent", "I paid", "rupees", amounts) to isolate the item
  let desc = cleanTranscript
    .replace(/\b(?:i|we|my|just|today|yesterday)\b/gi, '')
    .replace(/\b(?:spent|paid|bought|purchased|cost\s*me|cost|gave)\b/gi, '')
    .replace(/(?:(?:rs\.?|inr|₹)\s*[0-9]+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?\s*(?:rupees?|rupaye?|rs\.?|bucks?|inr))/gi, '')
    .replace(/\b[0-9]+(?:\.[0-9]{1,2})?\b/g, '')
    .replace(/\b(?:for|on|in|to|worth\s*of|of)\b/gi, '')
    .replace(/[,\.?!;]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Capitalize first letter
  if (desc.length > 0) {
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  }

  // Fallback description if everything was stripped
  if (!desc || desc.length < 2) {
    const foundCat = CATEGORY_KEYWORDS.find((c) => c.category === category);
    desc = foundCat ? foundCat.label : 'Expense';
  }

  // 4. Verification message
  const amountUnclear = amount === null || amount <= 0;
  const confidenceMessage = amountUnclear
    ? "I'm not sure about the amount. Please enter it manually."
    : undefined;

  return {
    amountRupees: amount,
    description: desc,
    category,
    date: todayIso,
    rawTranscript: cleanTranscript,
    amountUnclear,
    confidenceMessage,
  };
}

export const parseVoiceExpenseText = parseVoiceExpenseTranscript;
