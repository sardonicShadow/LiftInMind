import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { EQUIPMENT_LABEL } from '@/lib/catalog';
import { DEFAULT_TARGET } from '@/lib/logic';
import { newId, useStore } from '@/lib/store';
import type { ProgressionStyle, TemplateExercise, WorkoutTemplate } from '@/lib/types';
import { Button, Card, Chip, Field, Header, IconButton, Row, Screen, Stepper, T } from '@/ui/components';
import { ExercisePicker } from '@/ui/ExercisePicker';
import { colors } from '@/ui/theme';

const REST_OPTIONS = [60, 90, 120, 150, 180];

export default function WorkoutBuilder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, exerciseById, saveTemplate, deleteTemplate } = useStore();
  const existing = data.templates.find((t) => t.id === id);
  const [draft, setDraft] = useState<WorkoutTemplate>(existing ?? { id: newId(), name: '', exercises: [] });
  const [picking, setPicking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const patch = (k: number, p: Partial<TemplateExercise>) =>
    setDraft((d) => ({ ...d, exercises: d.exercises.map((e, j) => (j === k ? { ...e, ...p } : e)) }));
  const move = (k: number, dir: -1 | 1) =>
    setDraft((d) => {
      const list = [...d.exercises];
      const j = k + dir;
      if (j < 0 || j >= list.length) return d;
      [list[k], list[j]] = [list[j], list[k]];
      return { ...d, exercises: list };
    });

  const save = () => {
    saveTemplate({ ...draft, name: draft.name.trim() || 'Untitled workout' });
    router.back();
  };

  return (
    <Screen
      header={<Header title={existing ? 'Edit workout' : 'New workout'} />}
      footer={
        <View style={{ padding: 20, paddingTop: 12 }}>
          <Button title="Save workout" onPress={save} disabled={draft.exercises.length === 0} />
        </View>
      }>
      <Field label="Name" value={draft.name} placeholder="e.g. Push A" onChangeText={(name) => setDraft((d) => ({ ...d, name }))} />

      {draft.exercises.map((e, k) => {
        const ex = exerciseById(e.exerciseId);
        return (
          <Card key={`${e.exerciseId}-${k}`} style={{ gap: 14 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <T variant="h3">{`${k + 1}. ${ex?.name ?? e.exerciseId}`}</T>
                {ex ? <T variant="small">{`${EQUIPMENT_LABEL[ex.equipment]} · ${ex.muscle}`}</T> : null}
              </View>
              <Row gap={6}>
                <IconButton icon="up" label="Move up" size={34} bg={colors.surface2} onPress={() => move(k, -1)} />
                <IconButton icon="down" label="Move down" size={34} bg={colors.surface2} onPress={() => move(k, 1)} />
                <IconButton
                  icon="trash"
                  label="Remove exercise"
                  size={34}
                  bg={colors.surface2}
                  color={colors.warn}
                  onPress={() => setDraft((d) => ({ ...d, exercises: d.exercises.filter((_, j) => j !== k) }))}
                />
              </Row>
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <Stepper label="Sets" value={e.sets} min={1} max={10} onChange={(sets) => patch(k, { sets })} />
              <Stepper label="Min reps" value={e.repMin} min={1} max={e.repMax} onChange={(repMin) => patch(k, { repMin })} />
              <Stepper label="Max reps" value={e.repMax} min={e.repMin} max={50} onChange={(repMax) => patch(k, { repMax })} />
            </Row>
            <View style={{ gap: 6 }}>
              <T variant="label">Rest</T>
              <Row style={{ flexWrap: 'wrap' }}>
                {REST_OPTIONS.map((r) => (
                  <Chip key={r} label={r % 60 ? `${Math.floor(r / 60)}:${r % 60}` : `${r / 60} min`} active={e.restSec === r} onPress={() => patch(k, { restSec: r })} />
                ))}
              </Row>
            </View>
            <View style={{ gap: 6 }}>
              <T variant="label">Progression</T>
              <Row style={{ flexWrap: 'wrap' }}>
                {([undefined, 'double', 'linear'] as (ProgressionStyle | undefined)[]).map((p) => (
                  <Chip
                    key={p ?? 'plan'}
                    label={p === 'double' ? 'Double' : p === 'linear' ? 'Linear' : 'Plan default'}
                    active={e.progression === p}
                    onPress={() => patch(k, { progression: p })}
                  />
                ))}
              </Row>
            </View>
          </Card>
        );
      })}

      <Button title="Add exercises" icon="plus" variant="secondary" size="medium" onPress={() => setPicking(true)} />

      {existing ? (
        <Pressable
          accessibilityRole="button"
          style={{ alignSelf: 'center', padding: 12 }}
          onPress={() => {
            if (!confirmDelete) return setConfirmDelete(true);
            deleteTemplate(existing.id);
            router.back();
          }}>
          <T color={colors.warn}>{confirmDelete ? 'Tap again to delete this workout' : 'Delete workout'}</T>
        </Pressable>
      ) : null}

      <ExercisePicker
        visible={picking}
        onClose={() => setPicking(false)}
        exclude={draft.exercises.map((e) => e.exerciseId)}
        onPick={(ids) => setDraft((d) => ({ ...d, exercises: [...d.exercises, ...ids.map((exerciseId) => ({ exerciseId, ...DEFAULT_TARGET }))] }))}
      />
    </Screen>
  );
}
