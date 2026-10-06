import { describe, expect, it } from 'vitest';

import { setIssues } from './checks';

const sv = (weight: number, ...reps: number[]) => reps.map((r) => ({ weight, reps: r }));

describe('setIssues', () => {
  // Best set 105 x 10, an estimated 1RM of 140.
  const last = sv(105, 9, 9, 10);

  it('accepts normal progress and lighter sets', () => {
    expect(setIssues({ weight: 105, reps: 12 }, 'cable', last)).toEqual([]);
    expect(setIssues({ weight: 110, reps: 9 }, 'cable', last)).toEqual([]);
    expect(setIssues({ weight: 95, reps: 14 }, 'cable', last)).toEqual([]);
    expect(setIssues({ weight: null, reps: null }, 'cable', last)).toEqual([]);
  });

  it('flags more than 30 reps', () => {
    expect(setIssues({ weight: 105, reps: 31 }, 'cable', last)).toEqual([{ field: 'reps', kind: 'over-max-reps', reps: 31 }]);
    expect(setIssues({ weight: 20, reps: 45 }, 'dumbbell', null)).toEqual([{ field: 'reps', kind: 'over-max-reps', reps: 45 }]);
  });

  it('flags a weight far above last time', () => {
    expect(setIssues({ weight: 140, reps: 8 }, 'cable', last)).toEqual([{ field: 'weight', kind: 'much-heavier', previous: 105 }]);
    expect(setIssues({ weight: 1050, reps: 9 }, 'barbell', last)).toEqual([{ field: 'weight', kind: 'superhuman', limit: 1000 }]);
    // Within 25%, or a small jump on a light weight.
    expect(setIssues({ weight: 130, reps: 6 }, 'cable', last)).toEqual([]);
    expect(setIssues({ weight: 10, reps: 12 }, 'dumbbell', sv(5, 12, 12))).toEqual([]);
  });

  it('flags weights beyond what anyone lifts, by equipment', () => {
    expect(setIssues({ weight: 250, reps: 8 }, 'dumbbell', null)).toEqual([{ field: 'weight', kind: 'superhuman', limit: 200 }]);
    expect(setIssues({ weight: 1200, reps: 10 }, 'machine', null)).toEqual([]);
  });

  it('flags far more reps than last time predicts at that weight', () => {
    expect(setIssues({ weight: 105, reps: 15 }, 'cable', last)).toEqual([{ field: 'reps', kind: 'far-more-reps', expected: 10, weight: 105 }]);
    expect(setIssues({ weight: 105, reps: 14 }, 'cable', last)).toEqual([]);
    // Heavier weight, so fewer reps are expected.
    expect(setIssues({ weight: 125, reps: 12 }, 'cable', last).map((x) => x.kind)).toEqual(['far-more-reps']);
    // Bodyweight with no added weight compares reps.
    expect(setIssues({ weight: 0, reps: 25 }, 'bodyweight', sv(0, 12, 10)).map((x) => x.kind)).toEqual(['far-more-reps']);
    expect(setIssues({ weight: 0, reps: 14 }, 'bodyweight', sv(0, 12, 10))).toEqual([]);
  });
});
