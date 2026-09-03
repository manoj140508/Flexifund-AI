import { describe, it, expect } from 'vitest';
import { prioritizeActions, CandidateAction } from '../domain/prioritization';
import { moneyFromRupees } from '../domain/money';

describe('Action Item Prioritization Domain Module', () => {
  it('prioritizes critical urgency and quick-win high impact actions first', () => {
    const candidates: CandidateAction[] = [
      {
        id: 'low_impact_fee',
        category: 'ELIMINATE_AVOIDABLE_FEES',
        title: 'Review SMS Charges',
        description: 'Small periodic bank charge',
        potentialMonthlySaving: moneyFromRupees('50'),
        urgency: 'LOW',
        effort: 'LOW',
        evidenceStrength: 'HIGH',
        evidence: {
          metricName: 'Fee Total',
          observedValue: '₹50',
          benchmarkThreshold: '₹0',
          explanation: 'Minor SMS alert charges',
        },
        actionUrlOrPrompt: 'Contact bank',
      },
      {
        id: 'critical_buffer',
        category: 'BUILD_EMERGENCY_BUFFER',
        title: 'Establish Initial 7-Day Cash Runway',
        description: 'Current buffer coverage is critical',
        urgency: 'CRITICAL',
        effort: 'MEDIUM',
        evidenceStrength: 'HIGH',
        evidence: {
          metricName: 'Coverage Days',
          observedValue: '3 days',
          benchmarkThreshold: '14 days',
          explanation: 'Coverage is under 7 days',
        },
        actionUrlOrPrompt: 'Allocate upcoming gig surplus to reserve',
      },
      {
        id: 'high_saving_sub',
        category: 'REVIEW_RECURRING_PAYMENTS',
        title: 'Review Unused Streaming Services',
        description: 'High recurring monthly subscriptions',
        potentialMonthlySaving: moneyFromRupees('1499'),
        urgency: 'MODERATE',
        effort: 'LOW',
        evidenceStrength: 'HIGH',
        evidence: {
          metricName: 'Recurring subscriptions',
          observedValue: '₹1,499/mo',
          benchmarkThreshold: '₹0',
          explanation: 'Repeated media charges',
        },
        actionUrlOrPrompt: 'Cancel unused subscriptions',
      },
    ];

    const ranked = prioritizeActions(candidates, 3);
    expect(ranked.length).toBe(3);

    // Critical buffer building should rank top
    expect(ranked[0].id).toBe('critical_buffer');
    expect(ranked[0].rank).toBe(1);

    // High recurring savings with low effort should rank second
    expect(ranked[1].id).toBe('high_saving_sub');
    expect(ranked[1].rank).toBe(2);

    // Low urgency & small impact should rank third
    expect(ranked[2].id).toBe('low_impact_fee');
    expect(ranked[2].rank).toBe(3);
  });
});
