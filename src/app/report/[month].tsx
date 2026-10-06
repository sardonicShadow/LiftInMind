import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { monthLabel } from '@/lib/dates';
import { monthlyReport, type Verdict } from '@/lib/logic';
import { useStore } from '@/lib/store';
import type { SetValue } from '@/lib/types';
import { formatVolume, formatWeight, toDisplay } from '@/lib/units';
import { Badge, Card, Header, Row, Screen, T } from '@/ui/components';
import { colors, fonts } from '@/ui/theme';

const VERDICT: Record<Verdict, { label: string; tone: 'good' | 'neutral' | 'warn'; color: string }> = {
  progressed: { label: 'Progressed', tone: 'good', color: colors.accent },
  maintained: { label: 'Maintained', tone: 'neutral', color: colors.dim },
  regressed: { label: 'Regressed', tone: 'warn', color: colors.warn },
  insufficient: { label: 'Once only', tone: 'neutral', color: colors.surface3 },
};

export default function ReportScreen() {
  const { month } = useLocalSearchParams<{ month: string }>();
  const { data, activePlan, exerciseById } = useStore();
  const [showAll, setShowAll] = useState(false);
  const unit = data.unit;
  const r = monthlyReport(data.sessions, month, activePlan);
  const judged = r.exercises.length - r.counts.insufficient;
  const shown = showAll ? r.exercises : r.exercises.slice(0, 8);
  const stalls = r.exercises.filter((e) => e.stall);
  const fmt = (s: SetValue | null) => (s ? `${toDisplay(s.weight, unit)}×${s.reps}` : '–');

  return (
    <Screen header={<Header title="Monthly report" />}>
      <T variant="display">{monthLabel(month)}</T>

      {r.sessions === 0 ? (
        <Card>
          <T>No workouts logged this month.</T>
        </Card>
      ) : (
        <>
          <Card>
            <T variant="h2" style={{ fontSize: 28, lineHeight: 32 }}>
              {judged > 0 ? (
                <>
                  <T variant="h2" color={colors.accent} style={{ fontSize: 28, lineHeight: 32 }}>{`${r.counts.progressed} of ${judged}`}</T>
                  {' exercises progressed'}
                </>
              ) : (
                'Not enough repeat sessions to judge yet'
              )}
            </T>
            {judged > 0 ? (
              <>
                <View style={styles.bar}>
                  {(['progressed', 'maintained', 'regressed'] as Verdict[]).map((v) =>
                    r.counts[v] ? <View key={v} style={{ flex: r.counts[v], backgroundColor: VERDICT[v].color }} /> : null,
                  )}
                </View>
                <Row gap={14} style={{ flexWrap: 'wrap' }}>
                  {(['progressed', 'maintained', 'regressed'] as Verdict[]).map((v) => (
                    <Row key={v} gap={6}>
                      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: VERDICT[v].color }} />
                      <T variant="small">{`${VERDICT[v].label} ${r.counts[v]}`}</T>
                    </Row>
                  ))}
                </Row>
              </>
            ) : null}
            <View style={{ height: 1, backgroundColor: colors.line }} />
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <T variant="small" style={{ fontSize: 12 }}>
                  Sessions
                </T>
                <T variant="num">{r.plannedSessions ? `${r.sessions} of ${r.plannedSessions} planned` : String(r.sessions)}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T variant="small" style={{ fontSize: 12 }}>
                  Total volume
                </T>
                <T variant="num">
                  {formatVolume(r.totalVolume, unit)}
                  {r.volumeChangePct != null ? (
                    <T variant="num" style={{ fontSize: 15 }} color={r.volumeChangePct >= 0 ? colors.accent : colors.warn}>
                      {`  ${r.volumeChangePct >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(r.volumeChangePct))}%`}
                    </T>
                  ) : null}
                </T>
              </View>
            </Row>
          </Card>

          <View>
            <View style={styles.headRow}>
              <T variant="label" style={{ flex: 1 }}>
                Exercise
              </T>
              <T variant="label" style={styles.colSets}>
                Best set
              </T>
              <T variant="label" style={[styles.colVerdict, { textAlign: 'right' }]}>
                Verdict
              </T>
            </View>
            {shown.map((e) => (
              <Pressable key={e.exerciseId} accessibilityRole="button" onPress={() => router.push(`/exercise/${e.exerciseId}`)} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <T style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
                    {exerciseById(e.exerciseId)?.name ?? e.exerciseId}
                  </T>
                  <T variant="small" style={{ fontSize: 12 }} numberOfLines={1}>
                    {e.reason}
                  </T>
                </View>
                <T variant="small" style={styles.colSets}>
                  {e.verdict === 'insufficient' ? fmt(e.endBest) : `${fmt(e.startBest)} → ${fmt(e.endBest)}`}
                </T>
                <View style={[styles.colVerdict, { alignItems: 'flex-end' }]}>
                  <Badge label={VERDICT[e.verdict].label} tone={VERDICT[e.verdict].tone} />
                </View>
              </Pressable>
            ))}
            {r.exercises.length > shown.length ? (
              <Pressable accessibilityRole="button" onPress={() => setShowAll(true)} style={[styles.row, { paddingVertical: 12 }]}>
                <T color={colors.accent} style={{ fontFamily: fonts.semibold }}>{`See all ${r.exercises.length} exercises`}</T>
              </Pressable>
            ) : null}
          </View>

          {stalls.map((s) => (
            <Card key={s.exerciseId} style={{ padding: 16, gap: 4 }}>
              <T variant="label" color={colors.warn}>
                Stall to address
              </T>
              <T style={{ fontSize: 14, lineHeight: 20 }}>
                {`${exerciseById(s.exerciseId)?.name} has not progressed for two months${s.endBest ? `, holding around ${formatWeight(s.endBest.weight, unit)} × ${s.endBest.reps}` : ''}. Try dropping to ${s.endBest ? formatWeight(Math.round((s.endBest.weight * 0.9) / 5) * 5, unit) : '90%'} and rebuilding, change the rep range, or swap in a variation.`}
              </T>
            </Card>
          ))}

          <T variant="small" style={{ fontSize: 12 }}>
            Compares your first two sessions of each exercise this month with your last two. Working sets only; deload weeks are left out.
          </T>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
  headRow: { flexDirection: 'row', gap: 8, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
  colSets: { width: 108 },
  colVerdict: { width: 92 },
});
