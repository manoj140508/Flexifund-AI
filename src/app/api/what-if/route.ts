import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { simulateWhatIfScenario, serializeWhatIfScenarioResult } from '@/domain/credit';
import { moneyFromRupees, moneyFromPaise } from '@/domain/money';
import { IncomeAnalysis } from '@/domain/income';
import { ExpenseAnalysis } from '@/domain/expenses';
import { ResilienceAnalysis } from '@/domain/resilience';

const whatIfSchema = z.object({
  incomeChangePercent: z.number().optional().default(0),
  essentialExpenseChangeRupees: z.string().optional().default('0'),
  proposedMonthlyRepaymentRupees: z.string().optional().default('0'),
  baselineContext: z.object({
    conservativeBaselinePaise: z.string(),
    monthlyAverageIncomePaise: z.string(),
    essentialMonthlyBurnPaise: z.string(),
    monthlyAverageExpensesPaise: z.string(),
    dailyEssentialBurnPaise: z.string(),
    bufferCoverageDays: z.number().nullable(),
    availableBalancePaise: z.string().nullable(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = whatIfSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid What-If payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { incomeChangePercent, essentialExpenseChangeRupees, proposedMonthlyRepaymentRupees, baselineContext } = parsed.data;

    const essentialExpenseChangePaise = moneyFromRupees(essentialExpenseChangeRupees).paise;
    const proposedRepaymentPaise = moneyFromRupees(proposedMonthlyRepaymentRupees).paise;

    // Construct SimulationContext from verified baseline figures
    const baselineIncomeAnalysis: Partial<IncomeAnalysis> = {
      conservativeBaselineMonthly: moneyFromPaise(BigInt(baselineContext.conservativeBaselinePaise)),
      monthlyAverage: moneyFromPaise(BigInt(baselineContext.monthlyAverageIncomePaise)),
      sampleMonthsCount: 3,
    };

    const baselineExpenseAnalysis: Partial<ExpenseAnalysis> = {
      essentialMonthlyBurn: moneyFromPaise(BigInt(baselineContext.essentialMonthlyBurnPaise)),
      monthlyAverageExpenses: moneyFromPaise(BigInt(baselineContext.monthlyAverageExpensesPaise)),
      dailyEssentialBurnRate: moneyFromPaise(BigInt(baselineContext.dailyEssentialBurnPaise)),
      sampleMonthsCount: 3,
    };

    const baselineResilienceAnalysis: Partial<ResilienceAnalysis> = {
      bufferCoverageDays: baselineContext.bufferCoverageDays,
      userProvidedCurrentBalance: baselineContext.availableBalancePaise
        ? moneyFromPaise(BigInt(baselineContext.availableBalancePaise))
        : null,
      estimatedHistoricalNetSurplus: moneyFromPaise(
        BigInt(baselineContext.monthlyAverageIncomePaise) - BigInt(baselineContext.monthlyAverageExpensesPaise)
      ),
    };

    const result = simulateWhatIfScenario(
      {
        incomeAnalysis: baselineIncomeAnalysis as IncomeAnalysis,
        expenseAnalysis: baselineExpenseAnalysis as ExpenseAnalysis,
        resilienceAnalysis: baselineResilienceAnalysis as ResilienceAnalysis,
      },
      {
        incomeChangePercent,
        essentialExpenseChangePaise,
        proposedMonthlyRepaymentPaise: proposedRepaymentPaise,
      }
    );

    return NextResponse.json(serializeWhatIfScenarioResult(result), { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'What-If calculation failed', message: err?.message },
      { status: 500 }
    );
  }
}
