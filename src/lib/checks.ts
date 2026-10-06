import { e1rm } from './logic';
import type { Equipment, SetValue } from './types';

/** More reps than this in one set is almost always a typo. */
export const MAX_REPS = 30;

/** Heavier than this, in lb, is beyond what anyone lifts with that kind of equipment. */
export const WEIGHT_LIMIT_LB: Record<Equipment, number> = {
  barbell: 1000,
  dumbbell: 200,
  kettlebell: 200,
  machine: 1500,
  cable: 400,
  bodyweight: 300,
};

/** A number that looks wrong, on the field it's in. Weights are in lb. */
export type SetIssue =
  | { field: 'reps'; kind: 'over-max-reps'; reps: number }
  | { field: 'weight'; kind: 'superhuman'; limit: number }
  | { field: 'weight'; kind: 'much-heavier'; previous: number }
  | { field: 'reps'; kind: 'far-more-reps'; expected: number; weight: number };

/**
 * Reps last time's best set predicts at `weight` (Epley, run backwards). With
 * no weight on either side, such as bodyweight pull-ups, it's last time's best reps.
 */
function expectedReps(last: SetValue[], weight: number): number | null {
  const best = Math.max(...last.map(e1rm));
  if (weight > 0 && best > 0) return Math.max(0, 30 * (best / weight - 1));
  const reps = last.filter((s) => s.weight <= weight).map((s) => s.reps);
  return reps.length ? Math.max(...reps) : null;
}

/**
 * Checks one set against what's humanly possible and against `last`, the same
 * exercise's working sets last time, so typos get caught as they're typed:
 * - more than 30 reps
 * - heavier than anyone lifts with that equipment
 * - more than 25% (and at least 10 lb) above last time's heaviest set
 * - at least 5 more reps, and 50% more, than last time predicts at that weight
 */
export function setIssues(set: { weight: number | null; reps: number | null }, equipment: Equipment, last: SetValue[] | null): SetIssue[] {
  const out: SetIssue[] = [];
  const { weight, reps } = set;
  const previous = last?.length ? Math.max(...last.map((s) => s.weight)) : 0;
  const limit = WEIGHT_LIMIT_LB[equipment];
  // A big jump in weight is the weight's problem, not the reps'.
  const jump = weight != null && (weight > limit || (previous > 0 && weight > previous * 1.25));
  if (weight != null) {
    if (weight > limit) out.push({ field: 'weight', kind: 'superhuman', limit });
    else if (jump && weight - previous >= 10) out.push({ field: 'weight', kind: 'much-heavier', previous });
  }
  if (reps != null) {
    if (reps > MAX_REPS) out.push({ field: 'reps', kind: 'over-max-reps', reps });
    else if (weight != null && last?.length && !jump) {
      const expected = expectedReps(last, weight);
      if (expected != null && reps >= expected + 5 && reps >= expected * 1.5) {
        out.push({ field: 'reps', kind: 'far-more-reps', expected: Math.round(expected), weight });
      }
    }
  }
  return out;
}
