import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';

import { EQUIPMENT_LABEL } from '@/lib/catalog';
import { shortDate, today } from '@/lib/dates';
import { e1rm, exerciseHistory } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { formatVolume, formatWeight, toDisplay } from '@/lib/units';
import { Card, Divider, Header, Row, Screen, T } from '@/ui/components';
import { colors } from '@/ui/theme';

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, exerciseById } = useStore();
  const exercise = exerciseById(id);
  const unit = data.unit;
  if (!exercise) {
    return (
      <Screen header={<Header title="Exercise" />}>
        <T>Exercise not found.</T>
      </Screen>
    );
  }
  const history = exerciseHistory(data.sessions, exercise.id);
  // Like the Exercises list, "Last time" ignores workouts dated after today.
  const todayISO = today();
  const last = history.filter((h) => h.session.date <= todayISO).at(-1) ?? history.at(-1);
  const best = history.reduce<(typeof history)[number] | null>((b, h) => (!b || e1rm(h.best) > e1rm(b.best) ? h : b), null);
  const recent = history.slice(-12);
  const maxVol = Math.max(1, ...recent.map((h) => h.volume));

  return (
    <Screen header={<Header title={exercise.name} subtitle={`${EQUIPMENT_LABEL[exercise.equipment]} · ${exercise.muscle}`} />}>
      {history.length === 0 ? (
        <Card>
          <T variant="h3">No history yet</T>
          <T variant="small">Once you log this exercise, your last session, best set and volume trend show up here.</T>
        </Card>
      ) : (
        <>
          <Row gap={12}>
            <Card style={{ flex: 1, padding: 16, gap: 4 }}>
              <T variant="small">Best set</T>
              <T variant="num" style={{ fontSize: 24 }}>{`${toDisplay(best!.best.weight, unit)} × ${best!.best.reps}`}</T>
              <T variant="small" style={{ fontSize: 12 }}>
                {shortDate(best!.session.date)}
              </T>
            </Card>
            <Card style={{ flex: 1, padding: 16, gap: 4 }}>
              <T variant="small">Estimated 1RM</T>
              <T variant="num" style={{ fontSize: 24 }}>
                {formatWeight(e1rm(best!.best), unit)}
              </T>
              <T variant="small" style={{ fontSize: 12 }}>
                Epley formula
              </T>
            </Card>
          </Row>

          <Card>
            <T variant="label" color={colors.muted}>{`Last time · ${shortDate(last!.session.date)}`}</T>
            <T variant="num" style={{ fontSize: 24 }}>
              {last!.sets.map((s) => `${toDisplay(s.weight, unit)}×${s.reps}`).join(' · ')}
            </T>
            <T variant="small">{`${formatVolume(last!.volume, unit)} volume`}</T>
          </Card>

          <Card>
            <T variant="label" color={colors.muted}>{`Volume per session · last ${recent.length}`}</T>
            <Row gap={4} style={{ height: 120, alignItems: 'flex-end' }}>
              {recent.map((h, k) => (
                <View
                  key={h.session.id}
                  accessibilityLabel={`${shortDate(h.session.date)}: ${formatVolume(h.volume, unit)}`}
                  style={{
                    flex: 1,
                    height: `${Math.max(4, (h.volume / maxVol) * 100)}%`,
                    borderRadius: 4,
                    backgroundColor: k === recent.length - 1 ? colors.accent : colors.surface3,
                  }}
                />
              ))}
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="small" style={{ fontSize: 12 }}>
                {shortDate(recent[0].session.date).slice(4)}
              </T>
              <T variant="small" style={{ fontSize: 12 }}>
                {`${shortDate(recent.at(-1)!.session.date).slice(4)} · ${formatVolume(recent.at(-1)!.volume, unit)}`}
              </T>
            </Row>
          </Card>

          <View>
            <T variant="label" style={{ paddingBottom: 6 }}>
              History
            </T>
            {[...history].reverse().map((h) => (
              <Pressable key={h.session.id} accessibilityRole="button" onPress={() => router.push(`/summary/${h.session.id}`)}>
                <Divider />
                <Row style={{ justifyContent: 'space-between', paddingVertical: 12 }}>
                  <View>
                    <T>{shortDate(h.session.date)}</T>
                    <T variant="small">{h.session.name}</T>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <T>{h.sets.map((s) => `${toDisplay(s.weight, unit)}×${s.reps}`).join(' · ')}</T>
                    <T variant="small">{formatVolume(h.volume, unit)}</T>
                  </View>
                </Row>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
