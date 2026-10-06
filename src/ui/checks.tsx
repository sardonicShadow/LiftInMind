import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MAX_REPS, type SetIssue } from '@/lib/checks';
import type { Unit } from '@/lib/types';
import { formatWeight } from '@/lib/units';

import { Button, T } from './components';
import { colors, fonts, MAX_WIDTH } from './theme';

/** What looks wrong about a number, in a few words. */
export function issueText(issue: SetIssue, unit: Unit): string {
  switch (issue.kind) {
    case 'over-max-reps':
      return `${issue.reps} reps is more than ${MAX_REPS} in one set`;
    case 'superhuman':
      return `Over ${formatWeight(issue.limit, unit)}, more than anyone lifts on this kind of equipment`;
    case 'much-heavier':
      return `Far heavier than last time's ${formatWeight(issue.previous, unit)}`;
    case 'far-more-reps':
      return `Far more reps than last time suggests: about ${Math.max(1, issue.expected)} at ${formatWeight(issue.weight, unit)}`;
  }
}

export interface FlaggedSet {
  /** "Set 2" or "Warm-up". */
  label: string;
  /** The set as entered, such as "105 lb × 45". */
  value: string;
  issues: SetIssue[];
}

/** Asks the user to double-check numbers that look wrong before moving on. */
export function CheckSheet({
  visible,
  flagged,
  unit,
  onFix,
  onConfirm,
}: {
  visible: boolean;
  flagged: FlaggedSet[];
  unit: Unit;
  onFix: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onFix}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onFix} accessibilityLabel="Go back and fix" />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.grabber} />
          <T variant="display" color={colors.bad} style={{ fontSize: 30, lineHeight: 34 }}>
            Check these numbers
          </T>
          <T variant="small">They look off. Fix any typos before you move on.</T>
          {flagged.map((f) => (
            <View key={f.label} style={styles.item}>
              <T style={{ fontFamily: fonts.semibold }}>{`${f.label} · ${f.value}`}</T>
              {f.issues.map((x) => (
                <T key={x.kind} variant="small" color={colors.bad}>
                  {issueText(x, unit)}
                </T>
              ))}
            </View>
          ))}
          <Button title="Fix them" onPress={onFix} />
          <Button title="They're correct" variant="secondary" onPress={onConfirm} />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.surface3 },
  item: { gap: 2, padding: 12, borderRadius: 14, backgroundColor: colors.badSoft, borderWidth: 1, borderColor: colors.bad },
});
