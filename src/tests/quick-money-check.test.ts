import { describe, it, expect } from 'vitest';

describe('Quick Money Check and Can I Spend This Logic', () => {
  function evaluateStatus({
    earnedPaise,
    spentPaise,
    volatilityRating,
    bufferCoverageDays,
  }: {
    earnedPaise: bigint;
    spentPaise: bigint;
    volatilityRating: string;
    bufferCoverageDays: number | null;
  }) {
    const leftPaise = earnedPaise - spentPaise;
    if (leftPaise < 0n) {
      return { badge: '🔴', label: 'Needs action' };
    } else if (
      volatilityRating === 'HIGH' ||
      volatilityRating === 'EXTREME' ||
      (bufferCoverageDays !== null && bufferCoverageDays < 14) ||
      leftPaise < (earnedPaise * 12n) / 100n
    ) {
      return { badge: '🟡', label: 'Needs attention' };
    } else {
      return { badge: '🟢', label: 'Looking okay' };
    }
  }

  function evaluateCanISpendThis({
    leftPaise,
    savingTargetPaise,
    purchaseRupees,
    isVolatile,
  }: {
    leftPaise: bigint;
    savingTargetPaise: bigint;
    purchaseRupees: number;
    isVolatile: boolean;
  }) {
    const purchasePaise = BigInt(Math.round(purchaseRupees * 100));
    const newLeftPaise = leftPaise - purchasePaise;

    if (purchaseRupees <= 0) {
      return { badge: '💬', label: 'ENTER AN AMOUNT' };
    }
    if (newLeftPaise < 0n || leftPaise <= 0n) {
      return { badge: '🔴', label: 'MAY PUT PRESSURE ON YOUR BUDGET' };
    }
    if (newLeftPaise < savingTargetPaise || isVolatile) {
      return { badge: '🟡', label: 'THINK ABOUT IT' };
    }
    return { badge: '🟢', label: 'LOOKS AFFORDABLE' };
  }

  it('evaluates Quick Money Check status accurately across scenarios', () => {
    // Healthy surplus with low volatility -> 🟢 Looking okay
    expect(
      evaluateStatus({
        earnedPaise: 3000000n, // 30,000
        spentPaise: 2000000n,  // 20,000
        volatilityRating: 'LOW',
        bufferCoverageDays: 30,
      }).badge
    ).toBe('🟢');

    // High income volatility -> 🟡 Needs attention
    expect(
      evaluateStatus({
        earnedPaise: 3000000n,
        spentPaise: 2000000n,
        volatilityRating: 'HIGH',
        bufferCoverageDays: 20,
      }).badge
    ).toBe('🟡');

    // Overspending deficit -> 🔴 Needs action
    expect(
      evaluateStatus({
        earnedPaise: 2000000n,
        spentPaise: 2500000n,
        volatilityRating: 'LOW',
        bufferCoverageDays: null,
      }).badge
    ).toBe('🔴');
  });

  it('evaluates Can I Spend This accurately', () => {
    const leftPaise = 500000n; // ₹5,000 left
    const savingTargetPaise = 200000n; // ₹2,000 saving target

    // Small purchase ₹500 (leaves ₹4,500 >= ₹2,000 target) -> 🟢 LOOKS AFFORDABLE
    const resSmall = evaluateCanISpendThis({
      leftPaise,
      savingTargetPaise,
      purchaseRupees: 500,
      isVolatile: false,
    });
    expect(resSmall.badge).toBe('🟢');
    expect(resSmall.label).toBe('LOOKS AFFORDABLE');

    // Medium purchase ₹3,500 (leaves ₹1,500 < ₹2,000 target) -> 🟡 THINK ABOUT IT
    const resMed = evaluateCanISpendThis({
      leftPaise,
      savingTargetPaise,
      purchaseRupees: 3500,
      isVolatile: false,
    });
    expect(resMed.badge).toBe('🟡');
    expect(resMed.label).toBe('THINK ABOUT IT');

    // Large purchase ₹6,000 (leaves -₹1,000) -> 🔴 MAY PUT PRESSURE ON YOUR BUDGET
    const resLarge = evaluateCanISpendThis({
      leftPaise,
      savingTargetPaise,
      purchaseRupees: 6000,
      isVolatile: false,
    });
    expect(resLarge.badge).toBe('🔴');
    expect(resLarge.label).toBe('MAY PUT PRESSURE ON YOUR BUDGET');
  });
});
