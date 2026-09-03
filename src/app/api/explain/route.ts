import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const explainSchema = z.object({
  topic: z.enum([
    'INCOME_VOLATILITY',
    'SAVINGS_OPPORTUNITY',
    'SAVINGS_OPPORTUNITIES',
    'RESILIENCE_SCORE',
    'WHAT_IF_IMPACT',
    'WHAT_IF_SIMULATION',
    'ACTION_PRIORITY',
    'PRIORITIZED_ACTIONS',
    'CREDIT_PRESSURE',
    'CREDIT_AFFORDABILITY',
    'CONSERVATIVE_BASELINE',
    'ESSENTIAL_BURN_RATE',
  ]),
  contextEvidence: z.object({
    metricName: z.string(),
    observedValue: z.string(),
    calculationInputs: z.string().optional(),
    calculationResult: z.string().optional(),
    explanation: z.string(),
  }),
});

/**
 * Deterministic template explanation generator used as primary or fallback.
 */
function getDeterministicExplanation(topic: string, evidence: { metricName: string; observedValue: string; explanation: string }): string {
  switch (topic) {
    case 'INCOME_VOLATILITY':
    case 'CONSERVATIVE_BASELINE':
      return `Income volatility of ${evidence.observedValue} means your earnings swing significantly between peak and quiet months. In gig and informal work, budgeting around average earnings creates risk of shortfalls during low-earning periods. Anchoring fixed commitments to your conservative baseline provides a reliable cushion.`;
    case 'SAVINGS_OPPORTUNITY':
    case 'SAVINGS_OPPORTUNITIES':
      return `This opportunity was flagged because ${evidence.explanation}. Unlike salary earners, informal workers can benefit from converting discretionary recurring leaks into an automated emergency buffer to withstand seasonal income dips.`;
    case 'RESILIENCE_SCORE':
      return `Your resilience score reflects your capacity to absorb shocks without high-cost borrowing. It combines cash buffer coverage (runway), income predictability, non-essential expense flexibility, and debt service burden.`;
    case 'WHAT_IF_IMPACT':
    case 'WHAT_IF_SIMULATION':
      return `This scenario tests how your cash flow holds up if earnings decline or living costs rise. ${evidence.explanation} Planning for these shifts in advance helps identify safe borrowing limits and emergency buffer targets.`;
    case 'CREDIT_PRESSURE':
    case 'CREDIT_AFFORDABILITY':
      return `When earnings vary, a fixed repayment remains constant even in low months. ${evidence.explanation} Evaluating commitments against your conservative income floor prevents debt from crowding out essential living costs.`;
    case 'ESSENTIAL_BURN_RATE':
      return `Essential burn represents your non-negotiable living costs (rent, food, fuel, debt). Keeping essential costs comfortably below your conservative income baseline guarantees survival runway even in quiet earning periods.`;
    case 'ACTION_PRIORITY':
    case 'PRIORITIZED_ACTIONS':
    default:
      return `This action is prioritized because ${evidence.explanation}. Focusing on high-impact, low-effort changes first builds financial breathing room fastest.`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = explainSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid explanation request payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { topic, contextEvidence } = parsed.data;
    const deterministicText = getDeterministicExplanation(topic, contextEvidence);

    // Check if server-side AI_API_KEY exists for contextual enrichment
    const apiKey = process.env.AI_API_KEY;

    if (!apiKey) {
      // Return deterministic explanation
      return NextResponse.json({
        explanation: deterministicText,
        source: 'DETERMINISTIC_ENGINE',
      });
    }

    // Server-side AI explanation (strictly constrained to verified facts)
    try {
      const prompt = `You are the explanation layer of FlexiFund AI, an educational financial resilience tool for gig workers.
Explain clearly and empathetically to a worker what this metric means:
Topic: ${topic}
Metric: ${contextEvidence.metricName}
Observed Value: ${contextEvidence.observedValue}
Underlying Evidence: ${contextEvidence.explanation}

RULES:
- Do NOT calculate or change any numbers.
- Do NOT invent any schemes, banks, or transactions.
- Keep it under 3 concise sentences.
- Focus on resilience and practical planning.`;

      const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.2 },
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const candidateText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (candidateText) {
          return NextResponse.json({
            explanation: candidateText,
            source: 'AI_EXPLANATION_LAYER',
          });
        }
      }
    } catch {
      // Fallback silently to deterministic explanation on AI failure
    }

    return NextResponse.json({
      explanation: deterministicText,
      source: 'DETERMINISTIC_ENGINE',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to generate explanation', message: err?.message },
      { status: 500 }
    );
  }
}
