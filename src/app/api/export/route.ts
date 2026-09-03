import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const exportSchema = z.object({
  analysisData: z.any(),
  format: z.enum(['json', 'markdown', 'text']).optional().default('markdown'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = exportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid export payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { analysisData, format } = parsed.data;

    if (format === 'json') {
      return new NextResponse(JSON.stringify(analysisData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="flexifund-resilience-report-${Date.now()}.json"`,
        },
      });
    }

    // Generate clean, comprehensive Markdown report
    const meta = analysisData.metadata || {};
    const inc = analysisData.incomeAnalysis || {};
    const exp = analysisData.expenseAnalysis || {};
    const res = analysisData.resilienceAnalysis || {};
    const savings = analysisData.savingsOpportunities || [];
    const stress = analysisData.stressIndicators || [];
    const actions = analysisData.prioritizedActions || [];
    const quality = analysisData.dataQuality || {};

    const report = `# FLEXIFUND AI — FINANCIAL RESILIENCE REPORT
Generated: ${meta.generatedAt || new Date().toISOString()}
Analysis ID: ${meta.analysisId || 'N/A'}
Source Statement: ${meta.sourceReference || 'Statement'}

---

## 1. RESILIENCE ASSESSMENT
- Resilience Score: ${res.resilienceScore !== null ? `${res.resilienceScore}/100` : 'Not Calculable'}
- Score Interpretation: ${res.summaryExplanation || 'N/A'}
- Emergency Buffer Runway: ${res.bufferCoverageDays !== null ? `${res.bufferCoverageDays} days` : 'Current cash balance not provided'}
- Coverage Status: ${res.coverageStatus || 'INSUFFICIENT_DATA'}
- Historical Net Cash Surplus: ₹${(Number(res.estimatedHistoricalNetSurplus?.paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}

## 2. INCOME ANALYSIS
- Monthly Average: ₹${(Number(inc.monthlyAverage?.paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
- Median Monthly Income: ₹${(Number(inc.monthlyMedian?.paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
- Conservative Planning Reference: ₹${(Number(inc.conservativeBaselineMonthly?.paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Planning reference — not guaranteed income)
- Volatility Rating: ${inc.volatilityRating || 'N/A'} (CV: ${inc.coefficientOfVariation ? (inc.coefficientOfVariation * 100).toFixed(1) + '%' : 'N/A'})
- Directional Trend: ${inc.trend || 'N/A'}
- Sample Period: ${quality.startDate || 'N/A'} to ${quality.endDate || 'N/A'} (${quality.observedMonths || 1} months)

## 3. EXPENSES & COMMITMENTS
- Total Outflow: ₹${(Number(exp.totalExpenses?.paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
- Essential Monthly Living Burn: ₹${(Number(exp.essentialMonthlyBurn?.paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
- Daily Essential Burn Rate: ₹${(Number(exp.dailyEssentialBurnRate?.paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}/day
- Recurring Fixed Debt Outlay: ₹${(Number(exp.debtRepaymentsMonthly?.paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}/month

## 4. POTENTIAL MONEY-SAVING OPPORTUNITIES
${savings.length > 0
  ? savings.map((s: any, idx: number) => `### ${idx + 1}. ${s.title}
- Category: ${s.category}
- Potential Monthly Saving: ₹${(Number(s.potentialMonthlySaving?.paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
- Evidence: ${s.evidence?.explanation || s.description}
- Action: ${s.recommendedAction}`).join('\n\n')
  : 'No recurring discretionary leaks identified.'}

## 5. FINANCIAL PRESSURE SIGNALS
${stress.length > 0
  ? stress.map((st: any, idx: number) => `### ${idx + 1}. [${st.severity}] ${st.title}
- Finding: ${st.description}
- Evidence: ${st.evidence?.explanation || 'Empirical statement indicator'}
- Recommended Action: ${st.recommendedAction}`).join('\n\n')
  : 'No elevated early warning pressure signals identified.'}

## 6. TOP PRIORITIZED ACTIONS
${actions.length > 0
  ? actions.map((a: any, idx: number) => `${idx + 1}. [${a.urgency}] ${a.title}
   - Rationale: ${a.description}
   - Potential Impact: ${a.potentialMonthlySaving ? `₹${(Number(a.potentialMonthlySaving.paise) / 100).toFixed(2)}/mo` : 'Buffer & Stability'}
   - Next Step: ${a.actionUrlOrPrompt}`).join('\n\n')
  : 'Continue maintaining regular savings habits.'}

---
*Disclaimer: FlexiFund AI is an educational planning indicator, not a credit score or regulated financial advice. All figures are deterministically derived from your uploaded statement.*
`;

    return new NextResponse(report, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="flexifund-resilience-report-${Date.now()}.md"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to generate export', message: err?.message },
      { status: 500 }
    );
  }
}
