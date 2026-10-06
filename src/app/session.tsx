import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EQUIPMENT_LABEL } from '@/lib/catalog';
import { shortDate, today } from '@/lib/dates';
import { compareSet, entryVolume, finishedSessions, previousPerformance, sessionVolume, suggestTarget } from '@/lib/logic';
import { DEFAULT_TARGET, useStore } from '@/lib/store';
import type { LoggedSet, Session, SessionEntry, SetValue } from '@/lib/types';
import { formatVolume, formatWeight, fromDisplay, toDisplay } from '@/lib/units';
import { Button, Card, IconButton, Row, Screen, T } from '@/ui/components';
import { DatePicker } from '@/ui/DatePicker';
import { ExercisePicker } from '@/ui/ExercisePicker';
import { Icon } from '@/ui/icons';
import { NumInput } from '@/ui/NumInput';
import { colors, fonts } from '@/ui/theme';

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const clock = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

export default function SessionScreen() {
  const session = useStore().activeSession;
  if (!session) {
    return (
      <Screen>
        <T variant="h2">No workout in progress</T>
        <Button title="Back to week" onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  return <ActiveSession session={session} />;
}

function ActiveSession({ session }: { session: Session }) {
  const { data, exerciseById, updateSession, setSessionDate, addExerciseToSession, finishSession, discardSession } = useStore();
  const unit = data.unit;
  const now = useNow();
  const firstOpen = session.entries.findIndex((e) => e.sets.some((s) => !s.done));
  const [index, setIndex] = useState(firstOpen >= 0 ? firstOpen : 0);
  const [picking, setPicking] = useState(false);
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [pickingDate, setPickingDate] = useState(false);
  // Logging a workout after the fact: no live clock or rest timer.
  const live = session.date === today();
  const workoutDays = useMemo(() => new Set(finishedSessions(data.sessions).map((s) => s.date)), [data.sessions]);

  const entry: SessionEntry | undefined = session.entries[Math.min(index, session.entries.length - 1)];
  const i = Math.min(index, session.entries.length - 1);
  const exercise = entry ? exerciseById(entry.exerciseId) : undefined;
  const target = entry?.target ?? (entry ? { exerciseId: entry.exerciseId, ...DEFAULT_TARGET } : undefined);

  // "Last time" means the last time before this workout's date, so a back-dated
  // workout builds on what came before it rather than on later sessions.
  const prev = useMemo(
    () => (entry ? previousPerformance(data.sessions, entry.exerciseId, session.id, { before: session }) : null),
    [data.sessions, entry, session],
  );
  // Targets build on the last normal session, so a deload week doesn't reset progress.
  const base = useMemo(
    () => (entry ? previousPerformance(data.sessions, entry.exerciseId, session.id, { skipDeload: true, before: session }) : null),
    [data.sessions, entry, session],
  );
  const suggestion = useMemo(
    () =>
      target ? suggestTarget(base?.sets ?? null, target, target.progression ?? session.progression, { deload: session.deload }) : null,
    [base, target, session.progression, session.deload],
  );

  const setSets = (fn: (sets: LoggedSet[]) => LoggedSet[]) =>
    updateSession(session.id, (s) => ({
      ...s,
      entries: s.entries.map((e, k) => (k === i ? { ...e, sets: fn(e.sets) } : e)),
    }));

  const patchSet = (k: number, patch: Partial<LoggedSet>) => setSets((sets) => sets.map((s, j) => (j === k ? { ...s, ...patch } : s)));

  // The n-th working set lines up with the n-th set from last time and the n-th target.
  const workingIndex = (k: number) => entry!.sets.slice(0, k).filter((s) => s.kind === 'working').length;
  const placeholderFor = (k: number): SetValue | null => {
    const set = entry!.sets[k];
    if (set.kind === 'warmup') {
      const first = suggestion?.sets[0] ?? prev?.sets[0];
      return first ? { weight: Math.round((first.weight * 0.6) / 5) * 5, reps: 8 } : null;
    }
    const n = workingIndex(k);
    return suggestion?.sets[n] ?? prev?.sets[Math.min(n, (prev?.sets.length ?? 1) - 1)] ?? null;
  };

  const toggleDone = (k: number) => {
    const set = entry!.sets[k];
    if (set.done) return patchSet(k, { done: false });
    const ph = placeholderFor(k);
    const weight = set.weight ?? ph?.weight ?? null;
    const reps = set.reps ?? ph?.reps ?? null;
    if (weight == null || reps == null) return;
    patchSet(k, { weight, reps, done: true });
    if (set.kind === 'working' && live) setRestUntil(Date.now() + (target?.restSec ?? 120) * 1000);
  };

  const addSet = (kind: LoggedSet['kind']) =>
    setSets((sets) => {
      const blank: LoggedSet = { weight: null, reps: null, kind, done: false };
      if (kind === 'warmup') {
        const firstWorking = sets.findIndex((s) => s.kind === 'working');
        const at = firstWorking < 0 ? sets.length : firstWorking;
        return [...sets.slice(0, at), blank, ...sets.slice(at)];
      }
      return [...sets, blank];
    });

  const removeExercise = () => {
    updateSession(session.id, (s) => ({ ...s, entries: s.entries.filter((_, k) => k !== i) }));
    setIndex(Math.max(0, i - 1));
  };

  const finish = () => {
    const anyDone = session.entries.some((e) => e.sets.some((s) => s.done));
    if (!anyDone) {
      discardSession(session.id);
      router.replace('/');
      return;
    }
    finishSession(session.id);
    router.replace(`/summary/${session.id}`);
  };

  const restLeft = restUntil ? restUntil - now : 0;
  const exVolume = entry ? entryVolume(entry) : 0;
  const total = sessionVolume(session);
  const nextEntry = session.entries[i + 1];
  const fmtSets = (sets: SetValue[]) =>
    sets.every((s) => s.weight === sets[0].weight)
      ? `${formatWeight(sets[0].weight, unit)} × ${sets.map((s) => s.reps).join(' · ')}`
      : sets.map((s) => `${toDisplay(s.weight, unit)}×${s.reps}`).join(' · ');

  const header = (
    <View>
      <Row style={styles.top}>
        <IconButton icon="back" label="Back to week" onPress={() => router.replace('/')} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <T variant="h2" style={{ fontSize: 20, lineHeight: 24 }} numberOfLines={1}>
            {session.name}
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Workout date ${shortDate(session.date)}. Change date`}
            onPress={() => setPickingDate(true)}
            style={({ pressed }) => [styles.dateBtn, pressed && { opacity: 0.7 }]}>
            <Icon name="calendar" size={14} color={colors.accent} strokeWidth={2} />
            <T variant="small" color={colors.accent} style={{ fontFamily: fonts.semibold }}>
              {live ? 'Today' : shortDate(session.date)}
            </T>
            <T variant="small">{`${live ? ` · ${clock(now - session.startedAt)}` : ''}${session.deload ? ' · Deload' : ''}`}</T>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={finish} style={styles.finish}>
          <T color={colors.accent} style={{ fontFamily: fonts.semibold }}>
            Finish
          </T>
        </Pressable>
      </Row>
      {session.entries.length > 0 ? (
        <Row gap={6} style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          {session.entries.map((e, k) => {
            const allDone = e.sets.length > 0 && e.sets.every((s) => s.done);
            const some = e.sets.some((s) => s.done);
            return (
              <Pressable
                key={`${e.exerciseId}-${k}`}
                accessibilityRole="button"
                accessibilityLabel={`Go to ${exerciseById(e.exerciseId)?.name ?? 'exercise'}`}
                onPress={() => setIndex(k)}
                style={{ flex: 1, paddingVertical: 6 }}>
                <View
                  style={{
                    height: k === i ? 6 : 4,
                    borderRadius: 3,
                    backgroundColor: allDone ? colors.accent : some ? colors.accentLine : k === i ? colors.muted : colors.surface3,
                  }}
                />
              </Pressable>
            );
          })}
        </Row>
      ) : null}
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      <Row gap={20}>
        <View>
          <T variant="small" style={{ fontSize: 12 }}>
            Exercise
          </T>
          <T variant="num">{formatVolume(exVolume, unit)}</T>
        </View>
        <View>
          <T variant="small" style={{ fontSize: 12 }}>
            Session
          </T>
          <T variant="num">{formatVolume(total, unit)}</T>
        </View>
      </Row>
      {nextEntry ? (
        <Pressable accessibilityRole="button" onPress={() => setIndex(i + 1)} style={styles.next}>
          <T style={{ fontFamily: fonts.semibold, fontSize: 14, maxWidth: 170 }} numberOfLines={1}>
            {`Next: ${exerciseById(nextEntry.exerciseId)?.name ?? ''}`}
          </T>
          <Icon name="chevron" size={16} />
        </Pressable>
      ) : (
        <Pressable accessibilityRole="button" onPress={finish} style={[styles.next, { backgroundColor: colors.accent }]}>
          <T color={colors.accentInk} style={{ fontFamily: fonts.bold, fontSize: 14 }}>
            Finish workout
          </T>
        </Pressable>
      )}
    </View>
  );

  return (
    <Screen header={header} footer={footer} contentStyle={{ paddingTop: 4, gap: 14 }}>
      {!entry || !exercise ? (
        <Card>
          <T variant="h2">Empty workout</T>
          <T variant="small">Add exercises from the catalog to start logging.</T>
          <Button title="Add exercise" icon="plus" onPress={() => setPicking(true)} />
        </Card>
      ) : (
        <>
          <View style={{ gap: 2 }}>
            <T variant="small">{`Exercise ${i + 1} of ${session.entries.length} · ${EQUIPMENT_LABEL[exercise.equipment]} · ${exercise.muscle}`}</T>
            <T variant="display" style={{ fontSize: 36, lineHeight: 40 }}>
              {exercise.name}
            </T>
          </View>

          <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16 }}>
            {prev ? (
              <>
                <View style={{ gap: 2, flex: 1 }}>
                  <T variant="label" color={colors.muted}>
                    {`Last time · ${shortDate(prev.session.date)}`}
                  </T>
                  <T variant="num" style={{ fontSize: 24, lineHeight: 28 }}>
                    {fmtSets(prev.sets)}
                  </T>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <T variant="small" style={{ fontSize: 12 }}>
                    Volume
                  </T>
                  <T variant="num" style={{ fontSize: 20 }}>
                    {formatVolume(prev.sets.reduce((v, s) => v + s.weight * s.reps, 0), unit)}
                  </T>
                </View>
              </>
            ) : (
              <T variant="small">First time logging this exercise. Pick a weight you can do for the target reps.</T>
            )}
          </Card>

          {suggestion ? (
            <View style={styles.target}>
              <Icon name="up" size={18} color={colors.accent} strokeWidth={2.2} />
              <T style={{ flex: 1 }}>
                <T color={colors.muted}>{`${suggestion.note}: `}</T>
                <T color={colors.accent} style={{ fontFamily: fonts.bold }}>
                  {fmtSets(suggestion.sets)}
                </T>
              </T>
            </View>
          ) : target ? (
            <T variant="small">{`Target: ${target.sets} sets of ${target.repMin} to ${target.repMax} reps`}</T>
          ) : null}

          <View style={{ gap: 8 }}>
            <View style={styles.gridHead}>
              <T variant="label" style={styles.cSet}>
                Set
              </T>
              <T variant="label" style={styles.cPrev}>
                Previous
              </T>
              <T variant="label" style={[styles.cW, { textAlign: 'center' }]}>
                {unit}
              </T>
              <T variant="label" style={[styles.cR, { textAlign: 'center' }]}>
                Reps
              </T>
              <View style={styles.cDone} />
            </View>
            {entry.sets.map((set, k) => {
              const warm = set.kind === 'warmup';
              const n = workingIndex(k);
              const prevSet = warm ? null : prev?.sets[n];
              const ph = placeholderFor(k);
              const trend = set.done && !warm && prevSet && set.weight != null && set.reps != null ? compareSet({ weight: set.weight, reps: set.reps }, prevSet) : null;
              return (
                <Pressable
                  key={k}
                  onLongPress={() => setSets((sets) => sets.filter((_, j) => j !== k))}
                  delayLongPress={600}
                  style={[styles.setRow, warm && styles.warmRow, !set.done && k === entry.sets.findIndex((s) => !s.done) && styles.activeRow]}>
                  <T style={[styles.cSet, { textAlign: 'center', fontFamily: fonts.semibold }]} color={warm ? colors.muted : colors.text}>
                    {warm ? 'W' : String(n + 1)}
                  </T>
                  <T variant="small" style={styles.cPrev} numberOfLines={1}>
                    {warm ? 'Warm-up' : prevSet ? `${toDisplay(prevSet.weight, unit)} × ${prevSet.reps}` : '–'}
                  </T>
                  {set.done ? (
                    <>
                      <T variant="num" style={[styles.cW, { textAlign: 'center' }]} color={warm ? colors.muted : colors.text}>
                        {String(toDisplay(set.weight!, unit))}
                      </T>
                      <T variant="num" style={[styles.cR, { textAlign: 'center' }]} color={trend === 'up' ? colors.accent : warm ? colors.muted : colors.text}>
                        {`${set.reps}${trend === 'up' ? ' ▲' : ''}`}
                      </T>
                    </>
                  ) : (
                    <>
                      <View style={styles.cW}>
                        <NumInput
                          label={`Set ${warm ? 'warm-up' : n + 1} weight in ${unit}`}
                          value={set.weight == null ? null : toDisplay(set.weight, unit)}
                          placeholder={ph ? String(toDisplay(ph.weight, unit)) : unit}
                          onChange={(v) => patchSet(k, { weight: v == null ? null : fromDisplay(v, unit) })}
                        />
                      </View>
                      <View style={styles.cR}>
                        <NumInput
                          label={`Set ${warm ? 'warm-up' : n + 1} reps`}
                          decimal={false}
                          value={set.reps}
                          placeholder={ph ? String(ph.reps) : 'reps'}
                          onChange={(v) => patchSet(k, { reps: v })}
                        />
                      </View>
                    </>
                  )}
                  <View style={styles.cDone}>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: set.done }}
                      accessibilityLabel={`Complete set ${warm ? 'warm-up' : n + 1}`}
                      onPress={() => toggleDone(k)}
                      style={[styles.check, set.done ? { backgroundColor: warm ? colors.surface3 : colors.accent, borderWidth: 0 } : null]}>
                      <Icon name="check" size={18} color={set.done ? (warm ? colors.muted : colors.accentInk) : colors.dim} strokeWidth={2.6} />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
            <Row>
              <Button title="+ Add warm-up" variant="outline" size="medium" style={{ flex: 1 }} onPress={() => addSet('warmup')} />
              <Button title="+ Add set" variant="outline" size="medium" style={{ flex: 1 }} onPress={() => addSet('working')} />
            </Row>
            <T variant="small" style={{ fontSize: 12 }}>
              Warm-ups are saved but never count toward volume or your report. Long-press a set to delete it.
            </T>
          </View>

          {restLeft > 0 ? (
            <View style={styles.rest}>
              <Row gap={10}>
                <Icon name="timer" size={22} color={colors.accent} strokeWidth={2} />
                <T>Rest</T>
                <T variant="num" style={{ fontSize: 26, lineHeight: 30 }}>
                  {clock(restLeft)}
                </T>
              </Row>
              <Row>
                <Button title="−15s" variant="secondary" size="small" onPress={() => setRestUntil((r) => (r ?? Date.now()) - 15000)} />
                <Button title="+15s" variant="secondary" size="small" onPress={() => setRestUntil((r) => (r ?? Date.now()) + 15000)} />
                <Button title="Skip" variant="secondary" size="small" onPress={() => setRestUntil(null)} />
              </Row>
            </View>
          ) : null}

          <Row>
            <Button title="Add exercise" icon="plus" variant="secondary" size="medium" style={{ flex: 1 }} onPress={() => setPicking(true)} />
            <Button title="Remove" variant="danger" size="medium" onPress={removeExercise} />
          </Row>
        </>
      )}

      <Button
        title={confirmDiscard ? 'Tap again to discard this workout' : 'Discard workout'}
        variant={confirmDiscard ? 'danger' : 'outline'}
        size="small"
        style={{ alignSelf: 'center', marginTop: 8 }}
        onPress={() => {
          if (!confirmDiscard) return setConfirmDiscard(true);
          discardSession(session.id);
          router.replace('/');
        }}
      />

      <DatePicker
        visible={pickingDate}
        value={session.date}
        marked={(d) => workoutDays.has(d)}
        onClose={() => setPickingDate(false)}
        onPick={(d) => {
          setSessionDate(session.id, d);
          if (d !== today()) setRestUntil(null);
        }}
      />

      <ExercisePicker
        visible={picking}
        before={session}
        onClose={() => setPicking(false)}
        exclude={session.entries.map((e) => e.exerciseId)}
        onPick={(ids) => {
          const start = session.entries.length;
          ids.forEach((id) => addExerciseToSession(session.id, id));
          setIndex(start);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, gap: 12 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  finish: { height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.surface2, justifyContent: 'center' },
  target: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accentLine,
    backgroundColor: colors.accentBg,
  },
  gridHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 56, paddingHorizontal: 4, borderRadius: 14, backgroundColor: colors.surface },
  warmRow: { height: 48, backgroundColor: '#131518' },
  activeRow: { borderWidth: 2, borderColor: colors.accent },
  cSet: { width: 32 },
  cPrev: { flex: 1 },
  cW: { width: 72 },
  cR: { width: 60 },
  cDone: { width: 44, alignItems: 'center' },
  check: { width: 40, height: 40, borderRadius: 12, borderWidth: 2, borderColor: colors.surface3, alignItems: 'center', justifyContent: 'center' },
  rest: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingLeft: 16, borderRadius: 16, backgroundColor: colors.surface2, flexWrap: 'wrap', gap: 8 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    backgroundColor: colors.tabBg,
    borderTopWidth: 1,
    borderTopColor: '#22252A',
  },
  next: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.surface },
});
