import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { addDays, mondayOf, shortDate, today, WEEKDAY_SHORT } from '@/lib/dates';
import { planEndDate } from '@/lib/logic';
import { newId, useStore } from '@/lib/store';
import type { Plan } from '@/lib/types';
import { Button, Card, Chip, Field, Header, IconButton, Row, Screen, Stepper, T } from '@/ui/components';
import { colors } from '@/ui/theme';

export default function PlanBuilder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, activePlan, savePlan, deletePlan, setActivePlan } = useStore();
  const existing = data.plans.find((p) => p.id === id);
  const [draft, setDraft] = useState<Plan>(
    existing ?? {
      id: newId(),
      name: '',
      weeks: 8,
      startDate: mondayOf(today()),
      days: [null, null, null, null, null, null, null],
      deloadEvery: null,
      progression: 'double',
    },
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (p: Partial<Plan>) => setDraft((d) => ({ ...d, ...p }));

  const save = () => {
    savePlan({ ...draft, name: draft.name.trim() || 'My plan' });
    router.back();
  };

  return (
    <Screen
      header={<Header title={existing ? 'Edit plan' : 'New plan'} />}
      footer={
        <View style={{ padding: 20, paddingTop: 12 }}>
          <Button title="Save plan" onPress={save} disabled={!draft.days.some(Boolean)} />
        </View>
      }>
      <Field label="Name" value={draft.name} placeholder="e.g. Push Pull Legs" onChangeText={(name) => set({ name })} />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Stepper label="Weeks" value={draft.weeks} min={1} max={52} onChange={(weeks) => set({ weeks })} />
          <View style={{ alignItems: 'center', gap: 4 }}>
            <T variant="label">Starts</T>
            <Row gap={4}>
              <IconButton icon="back" label="Start a week earlier" size={32} bg={colors.surface2} onPress={() => set({ startDate: addDays(draft.startDate, -7) })} />
              <T variant="num" style={{ fontSize: 18, minWidth: 64, textAlign: 'center' }}>
                {shortDate(draft.startDate).slice(4)}
              </T>
              <View style={{ transform: [{ scaleX: -1 }] }}>
                <IconButton icon="back" label="Start a week later" size={32} bg={colors.surface2} onPress={() => set({ startDate: addDays(draft.startDate, 7) })} />
              </View>
            </Row>
          </View>
        </Row>
        <T variant="small">{`Runs ${shortDate(draft.startDate)} to ${shortDate(planEndDate(draft))}`}</T>
      </Card>

      <View style={{ gap: 8 }}>
        <T variant="label">Weekly schedule</T>
        {data.templates.length === 0 ? (
          <Card>
            <T variant="small">Build at least one workout first, then come back to schedule it.</T>
            <Button title="Build a workout" size="medium" onPress={() => router.push('/workout/new')} />
          </Card>
        ) : (
          WEEKDAY_SHORT.map((label, k) => (
            <Row key={label} style={{ alignItems: 'flex-start' }}>
              <T style={{ width: 40, paddingTop: 8 }} color={colors.muted}>
                {label}
              </T>
              <Row style={{ flex: 1, flexWrap: 'wrap' }} gap={6}>
                <Chip label="Rest" active={draft.days[k] == null} onPress={() => set({ days: draft.days.map((d, j) => (j === k ? null : d)) })} />
                {data.templates.map((t) => (
                  <Chip key={t.id} label={t.name} active={draft.days[k] === t.id} onPress={() => set({ days: draft.days.map((d, j) => (j === k ? t.id : d)) })} />
                ))}
              </Row>
            </Row>
          ))
        )}
      </View>

      <View style={{ gap: 8 }}>
        <T variant="label">Deload week</T>
        <Row style={{ flexWrap: 'wrap' }}>
          {[null, 4, 5, 6].map((n) => (
            <Chip key={String(n)} label={n ? `Every ${n}th week` : 'None'} active={draft.deloadEvery === n} onPress={() => set({ deloadEvery: n })} />
          ))}
        </Row>
        <T variant="small">Deload weeks suggest 90% of your last weights and are left out of the monthly report.</T>
      </View>

      <View style={{ gap: 8 }}>
        <T variant="label">Progression</T>
        <Row>
          <Chip label="Double progression" active={draft.progression === 'double'} onPress={() => set({ progression: 'double' })} />
          <Chip label="Linear" active={draft.progression === 'linear'} onPress={() => set({ progression: 'linear' })} />
        </Row>
        <T variant="small">
          {draft.progression === 'double'
            ? 'Add reps until every set reaches the top of the rep range, then add 5 lb and start again at the bottom.'
            : 'Add 5 lb every session at the same reps.'}{' '}
          You can override this for single exercises in each workout.
        </T>
      </View>

      {existing ? (
        <>
          {activePlan?.id !== existing.id ? (
            <Button title="Make this the active plan" variant="secondary" size="medium" onPress={() => setActivePlan(existing.id)} />
          ) : (
            <Button title="Stop following this plan" variant="outline" size="medium" onPress={() => setActivePlan(null)} />
          )}
          <Pressable
            accessibilityRole="button"
            style={{ alignSelf: 'center', padding: 12 }}
            onPress={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              deletePlan(existing.id);
              router.back();
            }}>
            <T color={colors.warn}>{confirmDelete ? 'Tap again to delete this plan' : 'Delete plan'}</T>
          </Pressable>
        </>
      ) : null}
    </Screen>
  );
}
