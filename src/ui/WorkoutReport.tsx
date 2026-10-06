import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { shortDate } from '@/lib/dates';
import { compareTimeline, type ExerciseReport } from '@/lib/logic';
import { useStore } from '@/lib/store';
import type { Session } from '@/lib/types';
import { formatSets, formatVolume } from '@/lib/units';

import { Button, IconButton, Row, T } from './components';
import { goalText, OverloadMark, overloadReasonText, STATUS_LABEL, statusColor } from './overload';
import { colors, fonts, MAX_WIDTH } from './theme';

export interface WorkoutStats {
  total: number;
  workingSets: number;
  minutes: number | null;
  /** Total volume change vs the last time this workout was done, in percent. */
  change: number | null;
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <T variant="num" color={color} style={{ fontSize: 22, lineHeight: 26 }} numberOfLines={1}>
        {value}
      </T>
      <T variant="small" style={{ fontSize: 12 }}>
        {label}
      </T>
    </View>
  );
}

function SetLine({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Row gap={10} style={{ alignItems: 'baseline' }}>
      <T variant="label" style={{ width: 92 }}>
        {label}
      </T>
      <T variant="num" color={color} style={{ flex: 1, fontSize: 18, lineHeight: 22 }}>
        {value}
      </T>
    </Row>
  );
}

function ExerciseResult({ r, session }: { r: ExerciseReport; session: Session }) {
  const { data, exerciseById } = useStore();
  const unit = data.unit;
  const why =
    r.reason != null
      ? overloadReasonText(r.reason, unit)
      : r.status === 'deload'
        ? 'Lighter on purpose, so it isn’t judged'
        : r.status === 'new-range'
          ? `First time at ${r.scheme.repMin} to ${r.scheme.repMax} reps, so today sets your baseline`
          : 'Nothing to compare yet. Today sets your baseline';
  // The goal builds on another workout after a deload, or when a later workout was logged first.
  const from = r.goalFrom ? shortDate(r.goalFrom.date).slice(4) : null;
  const border = r.status === 'overloaded' ? styles.goodBorder : r.status === 'missed' ? styles.badBorder : null;
  return (
    <View style={[styles.card, border]}>
      <Row gap={12} style={{ alignItems: 'flex-start' }}>
        <OverloadMark status={r.status} />
        <View style={{ flex: 1, gap: 2 }}>
          <T style={{ fontFamily: fonts.semibold, fontSize: 17 }}>{exerciseById(r.exerciseId)?.name ?? r.exerciseId}</T>
          <T variant="small" color={statusColor(r.status)} style={{ fontFamily: fonts.semibold }}>
            {STATUS_LABEL[r.status]}
          </T>
          <T variant="small">{why}</T>
        </View>
      </Row>
      <View style={{ gap: 6 }}>
        <SetLine label="Today" value={formatSets(r.sets, unit)} />
        {r.previous ? (
          <SetLine label={`Last · ${shortDate(r.previous.session.date).slice(4)}`} value={formatSets(r.previous.sets, unit)} color={colors.muted} />
        ) : null}
      </View>
      <View style={styles.goal}>
        <T variant="label" color={colors.accent}>
          Next time
        </T>
        <T variant="num" color={colors.accent} style={{ fontSize: 22, lineHeight: 26 }}>
          {r.goal ? formatSets(r.goal.sets, unit) : `${r.scheme.sets} sets of ${r.scheme.repMin} to ${r.scheme.repMax} reps`}
        </T>
        <T variant="small">
          {r.goal ? goalText(r.goal, unit, from ? `your ${from} workout` : 'today') : 'Your first normal workout with it sets the baseline'}
        </T>
        {from ? (
          <T variant="small" style={{ fontSize: 12 }}>
            {r.goalFrom && compareTimeline(r.goalFrom, session) > 0
              ? `Builds on your ${from} workout, your most recent with this exercise.`
              : `Builds on your ${from} workout, since deloads don’t change your goals.`}
          </T>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Pop-up shown when a workout is finished (and from its summary): totals, then
 * a pass or fail mark per exercise against the previous workout, with a goal
 * for next time.
 */
export function WorkoutReport({
  visible,
  onClose,
  session,
  rows,
  stats,
}: {
  visible: boolean;
  onClose: () => void;
  session: Session;
  rows: ExerciseReport[];
  stats: WorkoutStats;
}) {
  const { data } = useStore();
  const unit = data.unit;
  const judged = rows.filter((r) => r.status === 'overloaded' || r.status === 'missed');
  const wins = judged.filter((r) => r.status === 'overloaded').length;
  const allWon = judged.length > 0 && wins === judged.length;
  const headline = session.deload
    ? 'Deload workout. It’s lighter on purpose, so nothing is judged.'
    : judged.length === 0
      ? rows.every((r) => r.status === 'first')
        ? 'First time logging these exercises. Today sets your baseline.'
        : 'Nothing to compare yet. Today sets your baseline.'
      : allWon
        ? `You progressively overloaded every exercise you can compare.`
        : `You progressively overloaded ${wins} of ${judged.length} exercises.`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close workout report" />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.grabber} />
          <Row style={{ justifyContent: 'space-between', paddingHorizontal: 20 }}>
            <T variant="label" color={colors.accent}>
              Workout report
            </T>
            <IconButton icon="close" label="Close workout report" size={36} bg={colors.surface2} onPress={onClose} />
          </Row>
          <ScrollView contentContainerStyle={styles.body}>
            <View style={{ gap: 2 }}>
              <T variant="display" style={{ fontSize: 34, lineHeight: 38 }}>
                {session.name}
              </T>
              <T variant="small">{`${shortDate(session.date)}${stats.minutes != null ? ` · ${stats.minutes} min` : ''}${session.deload ? ' · Deload' : ''}`}</T>
            </View>

            <View style={styles.stats}>
              <Stat label="Total lifted" value={formatVolume(stats.total, unit)} />
              <Stat label="Working sets" value={String(stats.workingSets)} />
              <Stat
                label="Overloaded"
                value={judged.length ? `${wins} of ${judged.length}` : '–'}
                color={judged.length ? (wins > 0 ? colors.good : colors.bad) : undefined}
              />
            </View>
            {stats.change != null ? (
              <T variant="small" color={stats.change >= 0 ? colors.accent : colors.warn} style={{ fontFamily: fonts.semibold, marginTop: -6 }}>
                {`${stats.change >= 0 ? '▲' : '▼'} ${Math.abs(stats.change).toFixed(1)}% total volume vs last ${session.name}`}
              </T>
            ) : null}

            <View style={[styles.headline, allWon && styles.goodBorder]}>
              <T style={{ fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 }}>{headline}</T>
              {judged.length > 0 ? (
                <T variant="small">Each exercise is compared with the last time you did it with the same rep range, not counting deload weeks.</T>
              ) : null}
            </View>

            {rows.map((r) => (
              <ExerciseResult key={r.exerciseId} r={r} session={session} />
            ))}
          </ScrollView>
          <View style={styles.footer}>
            <Button title="Done" onPress={onClose} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '94%',
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.surface3, marginBottom: 8 },
  body: { padding: 20, paddingTop: 8, gap: 14 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, gap: 2, padding: 12, borderRadius: 14, backgroundColor: colors.surface2 },
  headline: { gap: 4, padding: 14, borderRadius: 16, backgroundColor: colors.surface2, borderWidth: 1, borderColor: 'transparent' },
  card: { gap: 12, padding: 16, borderRadius: 18, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line },
  goodBorder: { borderColor: colors.good },
  badBorder: { borderColor: colors.badSoft },
  goal: { gap: 2, padding: 12, borderRadius: 14, backgroundColor: colors.accentBg, borderWidth: 1, borderColor: colors.accentLine },
  footer: { padding: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
});
