import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { setIssues } from '@/lib/checks';
import { shortDate } from '@/lib/dates';
import { DEFAULT_TARGET, lastTime, sessionTarget, workoutReport } from '@/lib/logic';
import { useStore } from '@/lib/store';
import type { Session } from '@/lib/types';
import { formatSets, formatWeight } from '@/lib/units';

import { issueText } from './checks';
import { Button, Row, Screen, T } from './components';
import { OverloadMark, overloadReasonText, STATUS_LABEL, statusColor } from './overload';
import { colors, fonts } from './theme';

/**
 * Shown when a workout is finished, before it's saved: every logged set with
 * numbers that look wrong in red, each exercise's goal, and whether it was a
 * progressive overload, so mistakes get fixed before anything counts.
 */
export function WorkoutReview({ session, onSave }: { session: Session; onSave: () => void }) {
  const { data, exerciseById } = useStore();
  const unit = data.unit;
  const rows = workoutReport(data.sessions, session, unit);

  const cards = session.entries.map((e, k) => {
    const ex = exerciseById(e.exerciseId);
    const te = e.target ?? { exerciseId: e.exerciseId, ...DEFAULT_TARGET };
    const last = lastTime(data.sessions, session, e.exerciseId, te);
    let n = 0;
    const sets = e.sets.flatMap((s, j) => {
      const label = s.kind === 'warmup' ? 'Warm-up' : `Set ${++n}`;
      return s.done ? [{ j, s, label, issues: setIssues(s, ex?.equipment ?? 'barbell', last?.sets ?? null) }] : [];
    });
    return {
      k,
      name: ex?.name ?? e.exerciseId,
      goal: sessionTarget(data.sessions, session, e.exerciseId, te, te.progression ?? session.progression, unit),
      sets,
      row: sets.some((x) => x.s.kind === 'working') ? rows.find((r) => r.exerciseId === e.exerciseId) : undefined,
    };
  });
  const flagged = cards.reduce((n, c) => n + c.sets.filter((x) => x.issues.length).length, 0);

  const footer = (
    <View style={styles.footer}>
      <Button title="Save workout" onPress={onSave} />
      <Button title="Back to logging" variant="secondary" size="medium" onPress={() => router.replace('/session')} />
    </View>
  );

  return (
    <Screen footer={footer} contentStyle={{ paddingTop: 24 }}>
      <View style={{ gap: 4 }}>
        <T variant="label" color={colors.accent}>
          Review workout
        </T>
        <T variant="display">{session.name}</T>
        <T variant="small">{`${shortDate(session.date)}${session.deload ? ' · Deload' : ''}`}</T>
      </View>
      {flagged ? (
        <View style={styles.alert}>
          <T color={colors.bad} style={{ fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 }}>
            {`${flagged === 1 ? '1 set looks' : `${flagged} sets look`} off. Check the numbers in red before you save.`}
          </T>
        </View>
      ) : (
        <T variant="small">Check your sets, then save. Nothing counts toward your history until you do.</T>
      )}

      {cards.map((c) => {
        const missed = c.row?.status === 'missed';
        return (
          <View key={`${c.k}`} style={[styles.card, missed && styles.missedCard]}>
            <Row gap={12} style={{ alignItems: 'flex-start' }}>
              {c.row ? <OverloadMark status={c.row.status} size={missed ? 36 : 28} /> : null}
              <View style={{ flex: 1, gap: 2 }}>
                <T style={{ fontFamily: fonts.semibold, fontSize: 17 }}>{c.name}</T>
                {c.row ? (
                  <T variant="small" color={statusColor(c.row.status)} style={{ fontFamily: fonts.semibold }}>
                    {STATUS_LABEL[c.row.status]}
                  </T>
                ) : (
                  <T variant="small">{c.sets.length ? 'Warm-ups only, so it isn’t judged' : 'Nothing logged, so it won’t be saved'}</T>
                )}
                {c.row?.reason ? (
                  <T variant="small" color={missed ? colors.bad : undefined}>
                    {overloadReasonText(c.row.reason, unit)}
                  </T>
                ) : null}
              </View>
              <Button title="Edit" variant="secondary" size="small" onPress={() => router.replace({ pathname: '/session', params: { exercise: String(c.k) } })} />
            </Row>
            {c.goal ? (
              <Row gap={10} style={{ alignItems: 'baseline' }}>
                <T variant="label" color={colors.accent} style={styles.setLabel}>
                  Goal
                </T>
                <T variant="num" color={colors.accent} style={styles.setValue}>
                  {formatSets(c.goal.sets, unit)}
                </T>
              </Row>
            ) : null}
            {c.sets.map(({ j, s, label, issues }) => {
              const badWeight = issues.some((x) => x.field === 'weight');
              const badReps = issues.some((x) => x.field === 'reps');
              return (
                <View key={j} style={{ gap: 2 }}>
                  <Row gap={10} style={{ alignItems: 'baseline' }}>
                    <T variant="label" style={styles.setLabel}>
                      {label}
                    </T>
                    <T variant="num" style={styles.setValue} color={s.kind === 'warmup' ? colors.muted : undefined}>
                      <T variant="num" style={[styles.setSpan, badWeight && styles.badValue]}>
                        {formatWeight(s.weight ?? 0, unit)}
                      </T>
                      {' × '}
                      <T variant="num" style={[styles.setSpan, badReps && styles.badValue]}>
                        {String(s.reps)}
                      </T>
                    </T>
                  </Row>
                  {issues.map((x) => (
                    <T key={x.kind} variant="small" color={colors.bad} style={{ fontFamily: fonts.semibold, paddingLeft: 74 }}>
                      {issueText(x, unit)}
                    </T>
                  ))}
                </View>
              );
            })}
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  alert: { padding: 14, borderRadius: 16, backgroundColor: colors.badSoft, borderWidth: 1, borderColor: colors.bad },
  card: { gap: 10, padding: 16, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  missedCard: { borderColor: colors.bad, borderWidth: 2, backgroundColor: colors.badBg },
  setLabel: { width: 64 },
  setValue: { flex: 1, fontSize: 18, lineHeight: 22 },
  setSpan: { fontSize: 18, lineHeight: 22 },
  badValue: { color: colors.bad, backgroundColor: colors.badSoft },
  footer: { gap: 10, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24, backgroundColor: colors.tabBg, borderTopWidth: 1, borderTopColor: colors.line },
});
