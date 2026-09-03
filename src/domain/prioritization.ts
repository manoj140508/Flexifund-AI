/**
 * Action Item Prioritization Domain Module
 * 
 * Deterministic multi-factor ranking engine for financial resilience recommendations.
 * Ranks actions using explicit weights: Urgency (35%), Financial Impact (30%),
 * Effort/Feasibility (20%), Evidence Strength (15%).
 */

import { Money, formatRupees, SerializedMoney, serializeMoney } from './money';
import { StressEvidence } from './stress';

export type ActionCategory =
  | 'BUILD_EMERGENCY_BUFFER'
  | 'REVIEW_RECURRING_PAYMENTS'
  | 'ELIMINATE_AVOIDABLE_FEES'
  | 'EXPLORE_WELFARE_SCHEME'
  | 'MANAGE_DEBT_COMMITMENT'
  | 'REDUCE_DISCRETIONARY_BURN';

export type ActionEffort = 'LOW' | 'MEDIUM' | 'HIGH';
export type ActionUrgency = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export interface ActionItem {
  id: string;
  rank: number;
  category: ActionCategory;
  title: string;
  description: string;
  potentialMonthlySaving?: Money;
  urgency: ActionUrgency;
  effort: ActionEffort;
  priorityScore: number; // 0–100 computed composite score
  rankingJustification: string;
  evidence: StressEvidence;
  actionUrlOrPrompt: string;
}

export interface SerializedActionItem {
  id: string;
  rank: number;
  category: ActionCategory;
  title: string;
  description: string;
  potentialMonthlySaving?: SerializedMoney;
  urgency: ActionUrgency;
  effort: ActionEffort;
  priorityScore: number;
  rankingJustification: string;
  evidence: StressEvidence;
  actionUrlOrPrompt: string;
}

export interface CandidateAction {
  id: string;
  category: ActionCategory;
  title: string;
  description: string;
  potentialMonthlySaving?: Money;
  urgency: ActionUrgency;
  effort: ActionEffort;
  evidenceStrength: 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: StressEvidence;
  actionUrlOrPrompt: string;
}

/**
 * Deterministically computes composite priority score for an action item.
 * 
 * Weights:
 * - Urgency: 35% (CRITICAL: 35, HIGH: 25, MODERATE: 15, LOW: 5)
 * - Impact: 30% (Based on monetary saving or buffer preservation)
 * - Effort/Feasibility: 20% (LOW: 20, MEDIUM: 12, HIGH: 5)
 * - Evidence Strength: 15% (HIGH: 15, MEDIUM: 10, LOW: 5)
 */
export function calculateActionScore(action: CandidateAction): { score: number; reason: string } {
  let urgencyPts = 5;
  switch (action.urgency) {
    case 'CRITICAL':
      urgencyPts = 35;
      break;
    case 'HIGH':
      urgencyPts = 26;
      break;
    case 'MODERATE':
      urgencyPts = 16;
      break;
    case 'LOW':
      urgencyPts = 8;
      break;
  }

  let effortPts = 10;
  switch (action.effort) {
    case 'LOW':
      effortPts = 20; // Quick wins scored higher
      break;
    case 'MEDIUM':
      effortPts = 13;
      break;
    case 'HIGH':
      effortPts = 6;
      break;
  }

  let evidencePts = 10;
  switch (action.evidenceStrength) {
    case 'HIGH':
      evidencePts = 15;
      break;
    case 'MEDIUM':
      evidencePts = 10;
      break;
    case 'LOW':
      evidencePts = 5;
      break;
  }

  let impactPts = 15;
  if (action.potentialMonthlySaving && action.potentialMonthlySaving.paise > 0n) {
    // Up to 30 pts for monthly savings
    const rupees = Number(action.potentialMonthlySaving.paise / 100n);
    if (rupees >= 3000) impactPts = 30;
    else if (rupees >= 1000) impactPts = 22;
    else if (rupees >= 500) impactPts = 16;
    else impactPts = 10;
  } else if (action.category === 'BUILD_EMERGENCY_BUFFER') {
    // Buffer building has foundational systemic impact
    impactPts = 28;
  }

  const composite = urgencyPts + impactPts + effortPts + evidencePts;

  let reason = '';
  if (action.urgency === 'CRITICAL') {
    reason = 'Prioritized due to immediate risk to essential expense coverage.';
  } else if (action.effort === 'LOW' && impactPts >= 20) {
    reason = 'Prioritized as a quick-win action with high potential financial impact.';
  } else if (action.potentialMonthlySaving && action.potentialMonthlySaving.paise > 0n) {
    reason = `Prioritized for potential recurring saving of approximately ${formatRupees(action.potentialMonthlySaving)}/month.`;
  } else {
    reason = 'Ranked based on balance of implementation effort and resilience improvement.';
  }

  return { score: composite, reason };
}

/**
 * Prioritizes a list of candidate actions and returns the ranked top actions.
 */
export function prioritizeActions(candidates: CandidateAction[], limit = 5): ActionItem[] {
  const scored = candidates.map((cand) => {
    const { score, reason } = calculateActionScore(cand);
    return {
      cand,
      score,
      reason,
    };
  });

  // Sort descending by score; if tied, sort by urgency, then lowest effort
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((item, idx) => ({
    id: item.cand.id,
    rank: idx + 1,
    category: item.cand.category,
    title: item.cand.title,
    description: item.cand.description,
    potentialMonthlySaving: item.cand.potentialMonthlySaving,
    urgency: item.cand.urgency,
    effort: item.cand.effort,
    priorityScore: item.score,
    rankingJustification: item.reason,
    evidence: item.cand.evidence,
    actionUrlOrPrompt: item.cand.actionUrlOrPrompt,
  }));
}

/**
 * Serializes ActionItem for JSON boundaries.
 */
export function serializeActionItems(items: ActionItem[]): SerializedActionItem[] {
  return items.map((item) => ({
    ...item,
    potentialMonthlySaving: item.potentialMonthlySaving ? serializeMoney(item.potentialMonthlySaving) : undefined,
  }));
}
