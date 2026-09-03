import { describe, it, expect } from 'vitest';
import { INDIAN_STATES_AND_UTS } from '@/data/indian-states';
import { matchCatalogForUser, evaluateSchemeEligibility } from '@/domain/schemes';

describe('State Selection and State-Specific Scheme Matching', () => {
  it('contains all 28 Indian States and 8 Union Territories', () => {
    expect(INDIAN_STATES_AND_UTS.length).toBe(36);
    const states = INDIAN_STATES_AND_UTS.filter((s) => s.type === 'STATE');
    const uts = INDIAN_STATES_AND_UTS.filter((s) => s.type === 'UT');
    expect(states.length).toBe(28);
    expect(uts.length).toBe(8);

    // Verify key states and UTs
    expect(INDIAN_STATES_AND_UTS.some((s) => s.name === 'Karnataka')).toBe(true);
    expect(INDIAN_STATES_AND_UTS.some((s) => s.name === 'Maharashtra')).toBe(true);
    expect(INDIAN_STATES_AND_UTS.some((s) => s.name === 'Delhi')).toBe(true);
    expect(INDIAN_STATES_AND_UTS.some((s) => s.name === 'Tamil Nadu')).toBe(true);
  });

  it('matches All-India schemes when user selects a specific state', () => {
    const matches = matchCatalogForUser({
      workerCategory: 'GIG_PLATFORM',
      age: 26,
      hasBankAccount: true,
      isCoveredUnderEPFO_ESIC: false,
      state: 'Karnataka',
    });

    expect(matches.length).toBeGreaterThan(0);
    const eShram = matches.find((m) => m.program.id === 'eshram_social_security');
    expect(eShram).toBeDefined();
    expect(eShram?.status).toBe('LIKELY_MATCH');
    expect(eShram?.matchedCriteriaSummary.some((s) => s.includes('Karnataka'))).toBe(true);
  });

  it('correctly evaluates state-specific criteria for regional programs', () => {
    const mockRegionalProgram = {
      id: 'BOCW_KARNATAKA',
      name: 'Karnataka Building & Other Construction Workers Welfare Board',
      category: 'SOCIAL_SECURITY' as const,
      administeringBody: 'Govt of Karnataka Labor Dept',
      description: 'Accident insurance and maternity benefits for registered construction workers in Karnataka.',
      officialUrl: 'https://karbocw.karnataka.gov.in',
      criteria: {
        minAge: 18,
        maxAge: 60,
        allowedWorkerCategories: ['CONSTRUCTION' as const],
        allowedStates: ['Karnataka'],
        requiresBankAccount: true,
        disallowEPFO_ESIC: true,
      },
      benefitsSummary: {
        financialBenefitPaise: '5000000',
        natureOfBenefit: 'CASH_TRANSFER' as const,
        frequency: 'ONE_TIME' as const,
        description: 'Accident benefit up to ₹50,000 and medical assistance.',
      },
      requiredDocuments: ['Aadhaar', 'Bank passbook', '90-day construction work certificate'],
      lastVerifiedDate: '2026-01-01',
    };

    // User in Karnataka - meets state
    const matchSuccess = evaluateSchemeEligibility(mockRegionalProgram, {
      workerCategory: 'CONSTRUCTION',
      age: 30,
      state: 'Karnataka',
      hasBankAccount: true,
      isCoveredUnderEPFO_ESIC: false,
    });
    expect(matchSuccess.status).toBe('LIKELY_MATCH');
    const stateEvalSuccess = matchSuccess.evaluations.find((e) => e.criterionName === 'State Jurisdiction');
    expect(stateEvalSuccess?.status).toBe('MET');

    // User in Maharashtra - fails state
    const matchFail = evaluateSchemeEligibility(mockRegionalProgram, {
      workerCategory: 'CONSTRUCTION',
      age: 30,
      state: 'Maharashtra',
      hasBankAccount: true,
      isCoveredUnderEPFO_ESIC: false,
    });
    expect(matchFail.status).toBe('NOT_MATCHED');
    const stateEvalFail = matchFail.evaluations.find((e) => e.criterionName === 'State Jurisdiction');
    expect(stateEvalFail?.status).toBe('NOT_MET');
  });
});
