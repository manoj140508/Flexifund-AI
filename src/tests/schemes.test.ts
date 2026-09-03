import { describe, it, expect } from 'vitest';
import {
  BenefitProgram,
  evaluateSchemeEligibility,
  UserEligibilityProfile,
  getVerifiedCatalog,
  matchCatalogForUser,
} from '../domain/schemes';

const sampleProgram: BenefitProgram = {
  id: 'eshram_accidental_cover',
  name: 'e-Shram Accidental Insurance',
  organization: 'Ministry of Labour & Employment',
  category: 'Social Security',
  targetWorkerType: 'Unorganised Workers aged 16-59',
  jurisdiction: 'Central (All India)',
  description: 'Unorganised workers not covered by EPFO/ESIC',
  criteria: {
    minAge: 16,
    maxAge: 59,
    requiresUnorganizedStatus: true,
    requiresBankAccount: true,
    maxMonthlyIncomePaise: 2500000n, // ₹25,000/mo
  },
  potentialBenefit: '₹2,00,000 accidental insurance coverage',
  requiredDocuments: ['Aadhaar', 'Active Bank Account'],
  applicationSteps: ['Register online at eshram.gov.in'],
  officialUrl: 'https://eshram.gov.in',
  lastVerifiedDate: '2024-01-01',
  verificationStatus: 'OFFICIALLY_VERIFIED',
};

describe('Welfare Scheme Eligibility Domain Module', () => {
  it('loads verified schemes from official catalog json', () => {
    const catalog = getVerifiedCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(5);
    const eshram = catalog.find((c) => c.id === 'eshram_social_security');
    expect(eshram).toBeDefined();
    expect(eshram?.officialUrl).toBe('https://eshram.gov.in');
    expect(eshram?.verificationStatus).toBe('OFFICIALLY_VERIFIED');
  });

  it('identifies LIKELY_MATCH when all published criteria are met', () => {
    const profile: UserEligibilityProfile = {
      age: 28,
      isCoveredUnderEPFO_ESIC: false,
      hasBankAccount: true,
      declaredMonthlyIncomePaise: 1800000n, // ₹18,000
    };

    const match = evaluateSchemeEligibility(sampleProgram, profile);
    expect(match.status).toBe('LIKELY_MATCH');
    expect(match.whyMatched).toContain('Age');
    expect(match.whyMatched).toContain('unorganised');
    expect(match.whatToVerify).toContain('Aadhaar');
    expect(match.officialVerificationUrl).toBe('https://eshram.gov.in');
  });

  it('identifies MORE_INFO_NEEDED when profile is incomplete', () => {
    const profile: UserEligibilityProfile = {
      age: 28,
      // isCoveredUnderEPFO_ESIC missing
      // hasBankAccount missing
    };

    const match = evaluateSchemeEligibility(sampleProgram, profile);
    expect(match.status).toBe('MORE_INFO_NEEDED');
    expect(match.whatToVerify).toContain('EPFO / ESIC membership status');
  });

  it('identifies NOT_MATCHED when formal sector coverage excludes the user', () => {
    const profileEPFO: UserEligibilityProfile = {
      age: 30,
      isCoveredUnderEPFO_ESIC: true,
      hasBankAccount: true,
    };

    const matchEPFO = evaluateSchemeEligibility(sampleProgram, profileEPFO);
    expect(matchEPFO.status).toBe('NOT_MATCHED');
    expect(matchEPFO.evaluations.some((e) => e.status === 'NOT_MET')).toBe(true);
  });

  it('matches full verified catalog for gig platform delivery worker', () => {
    const gigWorkerProfile: UserEligibilityProfile = {
      age: 26,
      workerCategory: 'GIG_PLATFORM',
      isCoveredUnderEPFO_ESIC: false,
      hasBankAccount: true,
      declaredMonthlyIncomePaise: 2200000n,
    };

    const matches = matchCatalogForUser(gigWorkerProfile);
    expect(matches.length).toBeGreaterThanOrEqual(5);

    const eshramMatch = matches.find((m) => m.program.id === 'eshram_social_security');
    expect(eshramMatch?.status).toBe('LIKELY_MATCH');
    expect(eshramMatch?.whyMatched).toBeDefined();
    expect(eshramMatch?.officialVerificationUrl).toBe('https://eshram.gov.in');
  });
});
