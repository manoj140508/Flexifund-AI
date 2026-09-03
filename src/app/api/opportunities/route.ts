import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedCatalog, matchCatalogForUser, UserEligibilityProfile, WorkerCategory } from '@/domain/schemes';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workerCategory = searchParams.get('workerCategory') as WorkerCategory | null;
    const ageParam = searchParams.get('age');
    const age = ageParam && !isNaN(Number(ageParam)) ? Number(ageParam) : undefined;
    const incomeParam = searchParams.get('declaredMonthlyIncomePaise');
    const declaredMonthlyIncomePaise = incomeParam ? BigInt(incomeParam) : undefined;
    const hasBankAccount = searchParams.get('hasBankAccount') === 'true' ? true : undefined;
    const isCoveredUnderEPFO_ESIC = searchParams.get('isCoveredUnderEPFO_ESIC') === 'true' ? true : false;
    const state = searchParams.get('state') || searchParams.get('jurisdiction') || undefined;

    if (workerCategory || age !== undefined || state) {
      const profile: UserEligibilityProfile = {
        workerCategory: workerCategory || undefined,
        age,
        declaredMonthlyIncomePaise,
        hasBankAccount,
        isCoveredUnderEPFO_ESIC,
        state,
      };
      const matches = matchCatalogForUser(profile);
      return NextResponse.json({ matches });
    }

    const catalog = getVerifiedCatalog();
    return NextResponse.json({ catalog });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to retrieve welfare opportunities', message: err?.message },
      { status: 500 }
    );
  }
}
