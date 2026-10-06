import { View } from 'react-native';

import type { OverloadReason, OverloadStatus, Target } from '@/lib/logic';
import type { Unit } from '@/lib/types';
import { formatVolume, formatWeight } from '@/lib/units';

import { Icon } from './icons';
import { colors } from './theme';

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const STATUS_LABEL: Record<OverloadStatus, string> = {
  overloaded: 'Progressive overload',
  missed: 'No progressive overload',
  first: 'First time',
  'new-range': 'New rep range',
  deload: 'Deload',
};

export function statusColor(status: OverloadStatus): string {
  return status === 'overloaded' ? colors.good : status === 'missed' ? colors.bad : colors.muted;
}

/** One line on why an exercise did or didn't overload the workout it's measured against. */
export function overloadReasonText(reason: OverloadReason, unit: Unit): string {
  const w = (lb: number) => formatWeight(lb, unit);
  switch (reason.kind) {
    case 'heavier':
      return `Moved up to ${w(reason.weight)}`;
    case 'more-reps':
      return `${count(reason.reps, 'more rep')} at ${w(reason.weight)}`;
    case 'more-volume':
      return `Same top sets plus ${formatVolume(reason.volume, unit)} more volume`;
    case 'too-heavy':
      return `Best set at ${w(reason.weight)} was ${count(reason.reps, 'rep')}, under your ${reason.repMin}-rep minimum`;
    case 'fewer-sets':
      return `Only ${count(reason.sets, 'set')} at ${w(reason.weight)} or heavier, vs ${reason.previous} last time`;
    case 'lighter':
      return `Lighter than last time: ${w(reason.weight)} vs ${w(reason.previous)}`;
    case 'fewer-reps':
      return `${count(reason.reps, 'fewer rep')} at ${w(reason.weight)} than last time`;
    case 'less-volume':
      return `Same top sets, but ${formatVolume(reason.volume, unit)} less on lighter sets`;
    case 'matched':
      return 'Same weight and reps as last time';
  }
}

/**
 * What a goal asks for. `since` names the workout it builds on: "today" in the
 * report right after a workout, "last time" while logging the next one, or
 * "your Sep 12 workout" when the report's goal builds on another workout.
 */
export function goalText(goal: Target, unit: Unit, since: string): string {
  switch (goal.kind) {
    case 'add-reps':
      return 'One more rep per set';
    case 'top-of-range':
      return `Topped the rep range, so add ${formatWeight(goal.increment, unit)}`;
    case 'one-more-rep':
      return `Beat ${since} by one rep`;
    case 'finish-sets':
      return `Do all ${goal.sets.length} sets`;
    case 'add-weight':
      return `Add ${formatWeight(goal.increment, unit)}`;
    case 'repeat-weight':
      return 'Same weight, finish every rep';
    case 'deload':
      return 'Deload week: 90% of last time';
  }
}

/** Green check for an overload, red X for a miss, grey dash when it isn't judged. */
export function OverloadMark({ status, size = 32 }: { status: OverloadStatus; size?: number }) {
  const bg = status === 'overloaded' ? colors.good : status === 'missed' ? colors.bad : colors.surface3;
  return (
    <View
      accessible
      accessibilityLabel={STATUS_LABEL[status]}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      {status === 'overloaded' ? (
        <Icon name="check" size={size * 0.62} color={colors.accentInk} strokeWidth={3} />
      ) : status === 'missed' ? (
        <Icon name="close" size={size * 0.56} color={colors.accentInk} strokeWidth={3} />
      ) : (
        <View style={{ width: size * 0.4, height: 3, borderRadius: 2, backgroundColor: colors.muted }} />
      )}
    </View>
  );
}
