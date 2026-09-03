/**
 * Government Welfare & Benefit Schemes Domain Module
 * 
 * Verified social security and worker welfare catalog matching engine.
 * 
 * NON-NEGOTIABLE PRINCIPLES:
 * 1. Data model and deterministic matcher only. Do not invent scheme details.
 * 2. Matches are categorized strictly as:
 *    - 'LIKELY_MATCH'
 *    - 'POSSIBLE_MATCH'
 *    - 'MORE_INFO_NEEDED'
 *    - 'NOT_MATCHED'
 * 3. NEVER claim 'DEFINITELY_ELIGIBLE'. Every match includes "Why this matched",
 *    "What you need to verify", and "Verify on official source".
 */

import catalogData from '../data/schemes-catalog.json';

export type WorkerCategory =
  | 'GIG_PLATFORM' // Ride-hailing, food delivery, logistics delivery
  | 'STREET_VENDOR' // Urban informal retail, vending
  | 'CONSTRUCTION' // Daily wage construction & building workers
  | 'DOMESTIC_WORKER' // Home services, cleaners, cooks
  | 'FREELANCER' // Digital/creative independent contractors
  | 'AGRICULTURAL' // Farm/allied laborers
  | 'OTHER_INFORMAL';

export interface UserEligibilityProfile {
  age?: number;
  state?: string; // e.g. "Karnataka", "Maharashtra", "ALL_INDIA"
  workerCategory?: WorkerCategory;
  declaredMonthlyIncomePaise?: bigint;
  hasBankAccount?: boolean;
  hasAadhaarLinkedMobile?: boolean;
  isRegisteredOnEShram?: boolean;
  isCoveredUnderEPFO_ESIC?: boolean; // Disqualifier for most unorganised worker schemes
}

export interface EligibilityCriteria {
  minAge?: number;
  maxAge?: number;
  allowedWorkerCategories?: WorkerCategory[];
  maxMonthlyIncomePaise?: number | bigint;
  allowedStates?: string[]; // Empty or ['ALL_INDIA'] for national
  requiresBankAccount?: boolean;
  requiresUnorganizedStatus?: boolean; // Must NOT be registered under EPFO/ESIC
}

export interface BenefitProgram {
  id: string;
  name: string;
  organization: string;
  category: string;
  targetWorkerType: string;
  jurisdiction: string;
  description: string;
  potentialBenefit: string;
  criteria: EligibilityCriteria;
  requiredDocuments: string[];
  applicationSteps: string[];
  officialUrl: string;
  lastVerifiedDate: string; // ISO 8601 YYYY-MM-DD
  verificationStatus: 'OFFICIALLY_VERIFIED' | 'PENDING_VERIFICATION';
}

export type MatchStatus =
  | 'LIKELY_MATCH'
  | 'POSSIBLE_MATCH'
  | 'MORE_INFO_NEEDED'
  | 'NOT_MATCHED'
  // Backward-compatibility aliases for earlier phase tests:
  | 'POTENTIAL_MATCH'
  | 'NEEDS_MORE_INFORMATION'
  | 'DOES_NOT_APPEAR_TO_MATCH';

export interface CriterionEvaluation {
  criterionName: string;
  status: 'MET' | 'NOT_MET' | 'UNCONFIRMED';
  userValue: string;
  requiredValue: string;
  explanation: string;
}

export interface BenefitMatch {
  program: BenefitProgram;
  status: MatchStatus;
  evaluations: CriterionEvaluation[];
  matchedCriteriaSummary: string[];
  whyMatched: string;
  whatToVerify: string;
  missingInformationPrompt?: string;
  officialVerificationUrl: string;
}

export interface SerializedBenefitMatch {
  program: BenefitProgram;
  status: MatchStatus;
  evaluations: CriterionEvaluation[];
  matchedCriteriaSummary: string[];
  whyMatched: string;
  whatToVerify: string;
  missingInformationPrompt?: string;
  officialVerificationUrl: string;
}

/**
 * Loads the structured verified schemes catalog.
 */
export function getVerifiedCatalog(): BenefitProgram[] {
  return catalogData.map((item) => ({
    id: item.id,
    name: item.name,
    organization: item.organization,
    category: item.category,
    targetWorkerType: item.targetWorkerType,
    jurisdiction: item.jurisdiction,
    description: item.description,
    potentialBenefit: item.potentialBenefit,
    criteria: {
      minAge: item.eligibilityRules.minAge,
      maxAge: item.eligibilityRules.maxAge,
      allowedWorkerCategories: (item.eligibilityRules.allowedWorkerCategories as WorkerCategory[]) || undefined,
      maxMonthlyIncomePaise: item.eligibilityRules.maxMonthlyIncomePaise ? Number(item.eligibilityRules.maxMonthlyIncomePaise) : undefined,
      requiresBankAccount: item.eligibilityRules.requiresBankAccount,
      requiresUnorganizedStatus: item.eligibilityRules.requiresUnorganizedStatus,
    },
    requiredDocuments: item.requiredDocuments,
    applicationSteps: item.applicationSteps,
    officialUrl: item.officialUrl,
    lastVerifiedDate: item.lastVerifiedDate,
    verificationStatus: item.verificationStatus as 'OFFICIALLY_VERIFIED' | 'PENDING_VERIFICATION',
  }));
}

/**
 * Deterministically evaluates a user profile against a benefit program's eligibility rules.
 */
export function evaluateSchemeEligibility(
  program: BenefitProgram,
  profile: UserEligibilityProfile
): BenefitMatch {
  const evaluations: CriterionEvaluation[] = [];
  const matchedSummary: string[] = [];
  const missingInfoList: string[] = [];
  let hasDefiniteMismatch = false;

  const crit = program.criteria;

  // 1. Age check
  if (crit.minAge !== undefined || crit.maxAge !== undefined) {
    if (profile.age === undefined) {
      evaluations.push({
        criterionName: 'Age Requirement',
        status: 'UNCONFIRMED',
        userValue: 'Not provided',
        requiredValue: `${crit.minAge ?? 'Any'} to ${crit.maxAge ?? 'Any'} years`,
        explanation: 'User age was not provided in profile.',
      });
      missingInfoList.push('Your age');
    } else {
      const minOk = crit.minAge === undefined || profile.age >= crit.minAge;
      const maxOk = crit.maxAge === undefined || profile.age <= crit.maxAge;
      if (minOk && maxOk) {
        evaluations.push({
          criterionName: 'Age Requirement',
          status: 'MET',
          userValue: `${profile.age} years`,
          requiredValue: `${crit.minAge ?? 'Any'} to ${crit.maxAge ?? 'Any'} years`,
          explanation: `Age ${profile.age} falls within the eligible range.`,
        });
        matchedSummary.push(`Age (${profile.age}) is within ${crit.minAge ?? ''}–${crit.maxAge ?? ''} range`);
      } else {
        evaluations.push({
          criterionName: 'Age Requirement',
          status: 'NOT_MET',
          userValue: `${profile.age} years`,
          requiredValue: `${crit.minAge ?? 'Any'} to ${crit.maxAge ?? 'Any'} years`,
          explanation: `Age ${profile.age} is outside eligible bracket (${crit.minAge ?? ''}–${crit.maxAge ?? ''}).`,
        });
        hasDefiniteMismatch = true;
      }
    }
  }

  // 2. Unorganised worker status (EPFO / ESIC exclusion)
  if (crit.requiresUnorganizedStatus) {
    if (profile.isCoveredUnderEPFO_ESIC === undefined) {
      evaluations.push({
        criterionName: 'Unorganised Worker Status',
        status: 'UNCONFIRMED',
        userValue: 'Not confirmed',
        requiredValue: 'Not covered under EPFO / ESIC / NPS government contributions',
        explanation: 'EPFO/ESIC enrollment status is unconfirmed.',
      });
      missingInfoList.push('EPFO / ESIC membership status');
    } else if (profile.isCoveredUnderEPFO_ESIC === true) {
      evaluations.push({
        criterionName: 'Unorganised Worker Status',
        status: 'NOT_MET',
        userValue: 'Covered under EPFO/ESIC',
        requiredValue: 'Unorganised worker not covered by formal EPFO/ESIC',
        explanation: 'Formal sector retirement coverage excludes eligibility for unorganised worker programs.',
      });
      hasDefiniteMismatch = true;
    } else {
      evaluations.push({
        criterionName: 'Unorganised Worker Status',
        status: 'MET',
        userValue: 'Unorganised worker (Not in EPFO/ESIC)',
        requiredValue: 'Unorganised worker status',
        explanation: 'Meets unorganised informal worker definition.',
      });
      matchedSummary.push('Qualifies as unorganised worker without formal EPFO/ESIC');
    }
  }

  // 3. Worker Category
  if (crit.allowedWorkerCategories && crit.allowedWorkerCategories.length > 0) {
    if (!profile.workerCategory) {
      evaluations.push({
        criterionName: 'Occupation Type',
        status: 'UNCONFIRMED',
        userValue: 'Not provided',
        requiredValue: crit.allowedWorkerCategories.join(', '),
        explanation: 'Work category was not specified.',
      });
      missingInfoList.push('Your occupation category');
    } else if (crit.allowedWorkerCategories.includes(profile.workerCategory)) {
      evaluations.push({
        criterionName: 'Occupation Type',
        status: 'MET',
        userValue: profile.workerCategory,
        requiredValue: crit.allowedWorkerCategories.join(', '),
        explanation: `Targeted towards ${profile.workerCategory} workers.`,
      });
      matchedSummary.push(`Worker category (${profile.workerCategory}) is explicitly covered`);
    } else {
      evaluations.push({
        criterionName: 'Occupation Type',
        status: 'NOT_MET',
        userValue: profile.workerCategory,
        requiredValue: crit.allowedWorkerCategories.join(', '),
        explanation: `Scheme is restricted to specific occupations (${crit.allowedWorkerCategories.join(', ')}).`,
      });
      hasDefiniteMismatch = true;
    }
  }

  // 4. State Jurisdiction Check
  if (crit.allowedStates && crit.allowedStates.length > 0 && !crit.allowedStates.includes('ALL_INDIA')) {
    if (!profile.state) {
      evaluations.push({
        criterionName: 'State Jurisdiction',
        status: 'UNCONFIRMED',
        userValue: 'Not specified',
        requiredValue: crit.allowedStates.join(', '),
        explanation: 'State verification required for state-administered welfare program.',
      });
      missingInfoList.push('State residency');
    } else if (crit.allowedStates.map((s) => s.toLowerCase()).includes(profile.state.toLowerCase())) {
      evaluations.push({
        criterionName: 'State Jurisdiction',
        status: 'MET',
        userValue: profile.state,
        requiredValue: crit.allowedStates.join(', '),
        explanation: `Program operates in ${profile.state}.`,
      });
      matchedSummary.push(`Eligible for state-specific program in ${profile.state}`);
    } else {
      evaluations.push({
        criterionName: 'State Jurisdiction',
        status: 'NOT_MET',
        userValue: profile.state,
        requiredValue: crit.allowedStates.join(', '),
        explanation: `Program is limited to ${crit.allowedStates.join(', ')}.`,
      });
      hasDefiniteMismatch = true;
    }
  } else if (profile.state) {
    matchedSummary.push(`Nationwide scheme operational in ${profile.state}`);
  }

  // 5. Bank account check
  if (crit.requiresBankAccount) {
    if (profile.hasBankAccount === undefined) {
      evaluations.push({
        criterionName: 'Bank Account Requirement',
        status: 'UNCONFIRMED',
        userValue: 'Not confirmed',
        requiredValue: 'Active savings account for Direct Benefit Transfer (DBT)',
        explanation: 'Active bank account confirmation is required.',
      });
      missingInfoList.push('Bank account status');
    } else if (profile.hasBankAccount === false) {
      evaluations.push({
        criterionName: 'Bank Account Requirement',
        status: 'NOT_MET',
        userValue: 'No bank account',
        requiredValue: 'Active savings account',
        explanation: 'Requires a valid bank account for direct benefit transfers.',
      });
      hasDefiniteMismatch = true;
    } else {
      evaluations.push({
        criterionName: 'Bank Account Requirement',
        status: 'MET',
        userValue: 'Has active bank account',
        requiredValue: 'Active savings account',
        explanation: 'Meets DBT payment requirement.',
      });
      matchedSummary.push('Has required active bank account for DBT');
    }
  }

  // 5. Monthly Income Ceiling Check
  if (crit.maxMonthlyIncomePaise !== undefined) {
    if (profile.declaredMonthlyIncomePaise === undefined) {
      evaluations.push({
        criterionName: 'Income Ceiling',
        status: 'UNCONFIRMED',
        userValue: 'Not provided',
        requiredValue: `Monthly income ≤ ₹${Number(crit.maxMonthlyIncomePaise) / 100}`,
        explanation: 'Monthly earnings verification required.',
      });
      missingInfoList.push('Monthly income verification');
    } else if (profile.declaredMonthlyIncomePaise > BigInt(crit.maxMonthlyIncomePaise)) {
      evaluations.push({
        criterionName: 'Income Ceiling',
        status: 'NOT_MET',
        userValue: `₹${Number(profile.declaredMonthlyIncomePaise) / 100}`,
        requiredValue: `≤ ₹${Number(crit.maxMonthlyIncomePaise) / 100}`,
        explanation: 'Income exceeds program ceiling.',
      });
      hasDefiniteMismatch = true;
    } else {
      evaluations.push({
        criterionName: 'Income Ceiling',
        status: 'MET',
        userValue: `₹${Number(profile.declaredMonthlyIncomePaise) / 100}`,
        requiredValue: `≤ ₹${Number(crit.maxMonthlyIncomePaise) / 100}`,
        explanation: 'Income is below program eligibility ceiling.',
      });
      matchedSummary.push('Earnings fall within eligible monthly income threshold');
    }
  }

  // Determine overall match status
  let status: MatchStatus;
  const unconfirmedCount = evaluations.filter((e) => e.status === 'UNCONFIRMED').length;
  const metCount = evaluations.filter((e) => e.status === 'MET').length;

  if (hasDefiniteMismatch) {
    status = 'NOT_MATCHED';
  } else if (unconfirmedCount === 0 && metCount > 0) {
    status = 'LIKELY_MATCH';
  } else if (metCount >= 2 && unconfirmedCount <= 2) {
    status = 'POSSIBLE_MATCH';
  } else {
    status = 'MORE_INFO_NEEDED';
  }

  // Generate explicit "Why this was matched" and "What you need to verify"
  const whyMatched = matchedSummary.length > 0
    ? `Matched based on: ${matchedSummary.join('; ')}.`
    : 'No confirmed criteria met yet. Review eligibility parameters.';

  const whatToVerify = missingInfoList.length > 0
    ? `Verify with official documentation: ${missingInfoList.join(', ')}. Carry: ${program.requiredDocuments.join(', ')}.`
    : `Verify required enrollment documents: ${program.requiredDocuments.join(', ')}.`;

  return {
    program,
    status,
    evaluations,
    matchedCriteriaSummary: matchedSummary,
    whyMatched,
    whatToVerify,
    missingInformationPrompt:
      missingInfoList.length > 0
        ? `To confirm potential eligibility, please provide: ${missingInfoList.join(', ')}.`
        : undefined,
    officialVerificationUrl: program.officialUrl,
  };
}

/**
 * Matches a user profile against the entire verified catalog.
 */
export function matchCatalogForUser(profile: UserEligibilityProfile): BenefitMatch[] {
  const catalog = getVerifiedCatalog();
  return catalog.map((program) => evaluateSchemeEligibility(program, profile));
}

/**
 * Safely serializes BenefitMatch array for API responses.
 */
export function serializeBenefitMatches(matches: BenefitMatch[]): SerializedBenefitMatch[] {
  return matches.map((m) => ({
    ...m,
  }));
}
