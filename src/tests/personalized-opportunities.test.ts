import { describe, it, expect } from 'vitest';
import { matchCatalogForUser } from '../domain/schemes';

describe('Personalized Opportunities Matching Tests', () => {
  it('Profile 1: Delivery worker in Karnataka receives Karnataka Gig Worker Welfare at top with LIKELY_MATCH', () => {
    const karnatakaDeliveryProfile = {
      workerCategory: 'DELIVERY_WORKER' as const,
      state: 'Karnataka',
      age: 26,
      hasBankAccount: true,
      isCoveredUnderEPFO_ESIC: false,
    };

    const matches = matchCatalogForUser(karnatakaDeliveryProfile);
    expect(matches.length).toBeGreaterThan(0);

    // Karnataka Gig Worker Scheme should be prioritized at top
    const topMatch = matches[0];
    expect(topMatch.program.id).toBe('karnataka_gig_worker_welfare');
    expect(topMatch.status).toBe('LIKELY_MATCH');
    expect(topMatch.whyMatched).toContain('Karnataka');
    expect(topMatch.whyMatched).toContain('delivery worker');

    // Rajasthan Gig Worker Scheme should NOT match (wrong state)
    const rajasthanScheme = matches.find((m) => m.program.id === 'rajasthan_gig_worker_welfare');
    expect(rajasthanScheme?.status).toBe('NOT_MATCHED');

    // BOCW Construction fund should NOT match (wrong worker type)
    const bocwScheme = matches.find((m) => m.program.id === 'bocw_welfare_board');
    expect(bocwScheme?.status).toBe('NOT_MATCHED');
  });

  it('Profile 2: Freelancer in Maharashtra receives national schemes but NOT state gig schemes or construction', () => {
    const maharashtraFreelancerProfile = {
      workerCategory: 'FREELANCER' as const,
      state: 'Maharashtra',
      age: 32,
      hasBankAccount: true,
      isCoveredUnderEPFO_ESIC: false,
    };

    const matches = matchCatalogForUser(maharashtraFreelancerProfile);

    // Karnataka and Rajasthan schemes must NOT be matched
    const karnatakaScheme = matches.find((m) => m.program.id === 'karnataka_gig_worker_welfare');
    expect(karnatakaScheme?.status).toBe('NOT_MATCHED');

    const rajasthanScheme = matches.find((m) => m.program.id === 'rajasthan_gig_worker_welfare');
    expect(rajasthanScheme?.status).toBe('NOT_MATCHED');

    // Construction BOCW must NOT be matched
    const bocwScheme = matches.find((m) => m.program.id === 'bocw_welfare_board');
    expect(bocwScheme?.status).toBe('NOT_MATCHED');

    // National e-Shram should be a likely match
    const eShram = matches.find((m) => m.program.id === 'eshram_social_security');
    expect(eShram?.status).toBe('LIKELY_MATCH');

    // Atal Pension Yojana (APY) should be a likely match for age 32 (range 18-40)
    const apy = matches.find((m) => m.program.id === 'atal_pension_yojana');
    expect(apy?.status).toBe('LIKELY_MATCH');
  });

  it('Profile 3: Construction worker in Delhi matches BOCW fund but not gig-platform schemes', () => {
    const delhiConstructionProfile = {
      workerCategory: 'CONSTRUCTION' as const,
      state: 'Delhi',
      age: 35,
      hasBankAccount: true,
      isCoveredUnderEPFO_ESIC: false,
    };

    const matches = matchCatalogForUser(delhiConstructionProfile);

    // BOCW should be a likely match
    const bocwScheme = matches.find((m) => m.program.id === 'bocw_welfare_board');
    expect(bocwScheme?.status).toBe('LIKELY_MATCH');
    expect(bocwScheme?.whyMatched).toContain('construction');

    // Karnataka and Rajasthan gig schemes must NOT match
    const karnatakaScheme = matches.find((m) => m.program.id === 'karnataka_gig_worker_welfare');
    expect(karnatakaScheme?.status).toBe('NOT_MATCHED');
  });

  it('Age disqualification: 52-year-old worker fails APY and PM-SYM age ceiling of 40', () => {
    const olderWorkerProfile = {
      workerCategory: 'STREET_VENDOR' as const,
      state: 'Uttar Pradesh',
      age: 52,
      hasBankAccount: true,
      isCoveredUnderEPFO_ESIC: false,
    };

    const matches = matchCatalogForUser(olderWorkerProfile);

    // APY has max age 40 -> must be NOT_MATCHED
    const apy = matches.find((m) => m.program.id === 'atal_pension_yojana');
    expect(apy?.status).toBe('NOT_MATCHED');

    // PM-SYM has max age 40 -> must be NOT_MATCHED
    const pmsym = matches.find((m) => m.program.id === 'pmsym_pension');
    expect(pmsym?.status).toBe('NOT_MATCHED');

    // PMSBY allows age up to 70 -> should be LIKELY_MATCH
    const pmsby = matches.find((m) => m.program.id === 'pmsby_accidental_insurance');
    expect(pmsby?.status).toBe('LIKELY_MATCH');
  });
});
