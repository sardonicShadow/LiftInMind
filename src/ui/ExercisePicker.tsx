import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EQUIPMENT_BADGE, EQUIPMENT_FILTERS, EQUIPMENT_LABEL, matchesEquipment, MUSCLES, searchMatches, type EquipmentFilter } from '@/lib/catalog';
import { shortDate } from '@/lib/dates';
import { finishedSessions, previousPerformance } from '@/lib/logic';
import { useStore } from '@/lib/store';
import type { Equipment, Exercise, Muscle } from '@/lib/types';
import { formatWeight } from '@/lib/units';

import { Button, Chip, Field, Row, T } from './components';
import { Icon } from './icons';
import { colors, fonts, MAX_WIDTH, webInputFocus } from './theme';

export function ExerciseBadge({ exercise, highlight }: { exercise: Exercise; highlight?: boolean }) {
  return (
    <View style={[styles.badge, highlight && { backgroundColor: colors.accentSoft }]}>
      <T variant="small" color={highlight ? colors.accent : colors.muted} style={{ fontFamily: fonts.bold, fontSize: 12 }}>
        {EQUIPMENT_BADGE[exercise.equipment]}
      </T>
    </View>
  );
}

/** Searchable, filterable catalog list. Used by the picker sheet and the Exercises tab. */
export function useCatalogFilter() {
  const { exercises } = useStore();
  const [query, setQuery] = useState('');
  const [equipment, setEquipment] = useState<EquipmentFilter>('all');
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const results = useMemo(
    () =>
      exercises
        .filter((e) => matchesEquipment(e, equipment) && (!muscle || e.muscle === muscle) && searchMatches(e, query))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [exercises, equipment, muscle, query],
  );
  const filtered = query.trim() !== '' || equipment !== 'all' || muscle !== null;
  return { query, setQuery, equipment, setEquipment, muscle, setMuscle, results, filtered };
}

export function CatalogFilters({ f }: { f: ReturnType<typeof useCatalogFilter> }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.search}>
        <Icon name="search" size={20} color={colors.muted} />
        <TextInput
          accessibilityLabel="Search exercises"
          placeholder="Search exercises"
          placeholderTextColor={colors.dim}
          value={f.query}
          onChangeText={f.setQuery}
          style={[styles.searchInput, webInputFocus]}
          autoCorrect={false}
        />
        {f.query ? (
          <Pressable accessibilityLabel="Clear search" onPress={() => f.setQuery('')}>
            <Icon name="close" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      <Row style={{ flexWrap: 'wrap' }}>
        {EQUIPMENT_FILTERS.map((x) => (
          <Chip key={x.key} label={x.label} active={f.equipment === x.key} onPress={() => f.setEquipment(x.key)} />
        ))}
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {MUSCLES.map((m) => (
          <Chip key={m} label={m} active={f.muscle === m} onPress={() => f.setMuscle(f.muscle === m ? null : m)} />
        ))}
      </ScrollView>
    </View>
  );
}

export function ExerciseRow({
  exercise,
  subtitle,
  selected,
  onPress,
  trailing,
}: {
  exercise: Exercise;
  subtitle: string;
  selected?: boolean;
  onPress: () => void;
  trailing?: 'check' | 'chevron';
}) {
  return (
    <Pressable
      accessibilityRole={trailing === 'check' ? 'checkbox' : 'button'}
      accessibilityState={trailing === 'check' ? { checked: !!selected } : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <ExerciseBadge exercise={exercise} highlight={selected} />
      <View style={{ flex: 1, gap: 2 }}>
        <T style={{ fontFamily: fonts.semibold, fontSize: 16 }}>{exercise.name}</T>
        <T variant="small" numberOfLines={1}>
          {subtitle}
        </T>
      </View>
      {trailing === 'check' ? (
        selected ? (
          <View style={styles.checkOn}>
            <Icon name="check" size={16} color={colors.accentInk} strokeWidth={3} />
          </View>
        ) : (
          <View style={styles.checkOff} />
        )
      ) : (
        <Icon name="chevron" size={18} color={colors.dim} />
      )}
    </Pressable>
  );
}

export function useExerciseSubtitle() {
  const { data } = useStore();
  return (e: Exercise) => {
    const prev = previousPerformance(data.sessions, e.id);
    const base = `${EQUIPMENT_LABEL[e.equipment]} · ${e.muscle}`;
    if (!prev) return `${base} · Never done`;
    return `Last: ${formatWeight(prev.sets[0].weight, data.unit)} × ${prev.sets.map((s) => s.reps).join(' · ')} · ${shortDate(prev.session.date).slice(4)}`;
  };
}

function CustomExerciseForm({ onCreate, onCancel, initialName }: { onCreate: (e: Exercise) => void; onCancel: () => void; initialName: string }) {
  const { addCustomExercise } = useStore();
  const [name, setName] = useState(initialName);
  const [equipment, setEquipment] = useState<Equipment>('machine');
  const [muscle, setMuscle] = useState<Muscle>('Chest');
  return (
    <View style={{ gap: 12 }}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Hammer Strength Row" autoFocus />
      <T variant="label">Equipment</T>
      <Row style={{ flexWrap: 'wrap' }}>
        {(Object.keys(EQUIPMENT_LABEL) as Equipment[]).map((k) => (
          <Chip key={k} label={EQUIPMENT_LABEL[k]} active={equipment === k} onPress={() => setEquipment(k)} />
        ))}
      </Row>
      <T variant="label">Main muscle</T>
      <Row style={{ flexWrap: 'wrap' }}>
        {MUSCLES.map((m) => (
          <Chip key={m} label={m} active={muscle === m} onPress={() => setMuscle(m)} />
        ))}
      </Row>
      <Row>
        <Button title="Cancel" variant="secondary" size="medium" style={{ flex: 1 }} onPress={onCancel} />
        <Button
          title="Create"
          size="medium"
          style={{ flex: 1 }}
          disabled={!name.trim()}
          onPress={() => onCreate(addCustomExercise({ name: name.trim(), equipment, muscle }))}
        />
      </Row>
    </View>
  );
}

/** Bottom-sheet style picker that returns one or more exercise ids. */
export function ExercisePicker({
  visible,
  onClose,
  onPick,
  exclude = [],
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (ids: string[]) => void;
  exclude?: string[];
}) {
  const { data, exerciseById } = useStore();
  const f = useCatalogFilter();
  const subtitle = useExerciseSubtitle();
  const [picked, setPicked] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const recent = useMemo(() => {
    const ids: string[] = [];
    for (const s of finishedSessions(data.sessions).reverse()) {
      for (const e of s.entries) if (!ids.includes(e.exerciseId)) ids.push(e.exerciseId);
      if (ids.length >= 6) break;
    }
    return ids.map(exerciseById).filter((e): e is Exercise => !!e && !exclude.includes(e.id)).slice(0, 5);
  }, [data.sessions, exerciseById, exclude]);

  const list = f.results.filter((e) => !exclude.includes(e.id));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const close = () => {
    setPicked([]);
    setCreating(false);
    f.setQuery('');
    onClose();
  };

  const header = (
    <View style={{ gap: 14, paddingBottom: 8 }}>
      <CatalogFilters f={f} />
      {!f.filtered && recent.length > 0 ? (
        <View>
          <T variant="label" style={{ paddingVertical: 6 }}>
            Recently used
          </T>
          {recent.map((e) => (
            <ExerciseRow key={e.id} exercise={e} subtitle={subtitle(e)} trailing="check" selected={picked.includes(e.id)} onPress={() => toggle(e.id)} />
          ))}
        </View>
      ) : null}
      <T variant="label">{f.filtered ? `${list.length} results` : 'All exercises'}</T>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.grabber} />
          <Row style={{ justifyContent: 'space-between', paddingHorizontal: 20 }}>
            <T variant="display" style={{ fontSize: 30 }}>
              {creating ? 'New exercise' : 'Add exercise'}
            </T>
            <Pressable accessibilityRole="button" onPress={close} style={{ padding: 10 }}>
              <T color={colors.muted} style={{ fontFamily: fonts.semibold }}>
                Cancel
              </T>
            </Pressable>
          </Row>
          {creating ? (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <CustomExerciseForm
                initialName={f.query}
                onCancel={() => setCreating(false)}
                onCreate={(e) => {
                  setCreating(false);
                  setPicked((p) => [...p, e.id]);
                }}
              />
            </ScrollView>
          ) : (
            <>
              <FlatList
                data={list}
                keyExtractor={(e) => e.id}
                ListHeaderComponent={header}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8 }}
                renderItem={({ item }) => (
                  <ExerciseRow exercise={item} subtitle={subtitle(item)} trailing="check" selected={picked.includes(item.id)} onPress={() => toggle(item.id)} />
                )}
                ListFooterComponent={
                  <Pressable onPress={() => setCreating(true)} style={{ paddingVertical: 18 }}>
                    <T color={colors.accent} style={{ fontFamily: fonts.semibold }}>
                      + Create custom exercise
                    </T>
                  </Pressable>
                }
              />
              <View style={{ padding: 20, paddingTop: 12 }}>
                <Button
                  title={picked.length ? `Add ${picked.length} exercise${picked.length > 1 ? 's' : ''}` : 'Select exercises'}
                  disabled={!picked.length}
                  onPress={() => {
                    onPick(picked);
                    close();
                  }}
                />
              </View>
            </>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    height: '94%',
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.surface3, marginBottom: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.surface2 },
  searchInput: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 16, height: 48 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  badge: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  checkOn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  checkOff: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.surface3 },
});
