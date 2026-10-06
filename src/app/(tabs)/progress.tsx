import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { monthKey, monthLabel, today } from '@/lib/dates';
import { monthlyReport, monthsWithSessions } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { formatVolume } from '@/lib/units';
import { Button, Card, Chip, Divider, EmptyState, Row, Screen, T } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { colors } from '@/ui/theme';

export default function ProgressScreen() {
  const store = useStore();
  const { data, activePlan } = store;
  const [confirmReset, setConfirmReset] = useState(false);
  const current = monthKey(today());
  const months = monthsWithSessions(data.sessions);
  const past = months.filter((m) => m !== current);
  const thisMonth = monthlyReport(data.sessions, current, activePlan);
  const judged = thisMonth.exercises.length - thisMonth.counts.insufficient;

  return (
    <Screen>
      <T variant="display">Progress</T>

      {months.length === 0 ? (
        <EmptyState
          title="No workouts logged yet"
          body="Each month you get a report on every exercise you did and whether you achieved progressive overload. Log a few workouts, or load the sample history to see one."
        />
      ) : null}

      {thisMonth.sessions > 0 ? (
        <Pressable accessibilityRole="button" onPress={() => router.push(`/report/${current}`)}>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="label" color={colors.muted}>{`${monthLabel(current)} so far`}</T>
              <Icon name="chevron" size={18} color={colors.dim} />
            </Row>
            <T variant="h2">
              {judged > 0 ? (
                <>
                  <T variant="h2" color={colors.accent}>{`${thisMonth.counts.progressed} of ${judged}`}</T>
                  {' exercises progressing'}
                </>
              ) : (
                'Too early to judge'
              )}
            </T>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <T variant="small" style={{ fontSize: 12 }}>
                  Sessions
                </T>
                <T variant="num">
                  {thisMonth.plannedSessions ? `${thisMonth.sessions} of ${thisMonth.plannedSessions}` : String(thisMonth.sessions)}
                </T>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <T variant="small" style={{ fontSize: 12 }}>
                  Volume
                </T>
                <T variant="num">{formatVolume(thisMonth.totalVolume, data.unit)}</T>
              </View>
            </Row>
          </Card>
        </Pressable>
      ) : null}

      {past.length > 0 ? (
        <View>
          <T variant="label" style={{ paddingBottom: 6 }}>
            Monthly reports
          </T>
          {past.map((m) => {
            const r = monthlyReport(data.sessions, m, activePlan);
            const n = r.exercises.length - r.counts.insufficient;
            return (
              <Pressable key={m} accessibilityRole="button" onPress={() => router.push(`/report/${m}`)}>
                <Divider />
                <Row style={{ paddingVertical: 14 }}>
                  <View style={{ flex: 1 }}>
                    <T variant="h3">{monthLabel(m)}</T>
                    <T variant="small">{`${r.counts.progressed} of ${n} progressed · ${r.sessions} sessions · ${formatVolume(r.totalVolume, data.unit)}`}</T>
                  </View>
                  <Icon name="chevron" size={18} color={colors.dim} />
                </Row>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Card style={{ marginTop: 8 }}>
        <T variant="label" color={colors.muted}>
          Settings
        </T>
        <Row style={{ justifyContent: 'space-between' }}>
          <T>Units</T>
          <Row>
            <Chip label="lb" active={data.unit === 'lb'} onPress={() => store.setUnit('lb')} />
            <Chip label="kg" active={data.unit === 'kg'} onPress={() => store.setUnit('kg')} />
          </Row>
        </Row>
        <Divider />
        <T variant="small">
          Your data is saved in this browser on this device only. Clearing site data or switching browsers starts fresh.
        </T>
        <Button title="Load sample plan and history" variant="secondary" size="medium" onPress={store.loadSample} />
        <Button
          title={confirmReset ? 'Tap again to erase everything' : 'Erase all data'}
          variant={confirmReset ? 'danger' : 'outline'}
          size="medium"
          onPress={() => {
            if (!confirmReset) return setConfirmReset(true);
            store.resetAll();
            setConfirmReset(false);
          }}
        />
      </Card>
    </Screen>
  );
}
