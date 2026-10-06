import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EQUIPMENT_LABEL } from '@/lib/catalog';
import { setIssues, type SetIssue } from '@/lib/checks';
import { shortDate, toISODate, today } from '@/lib/dates';
import {
  compareSet,
  comparisonPerformance,
  DEFAULT_TARGET,
  entryVolume,
  finishedSessions,
  lastTime,
  overloadVerdict,
  sessionTarget,
  sessionVolume,
  workingSets,
} from '@/lib/logic';
import { useStore } from '@/lib/store';
import type { LoggedSet, Session, SessionEntry, SetValue } from '@/lib/types';
import { formatSets, formatVolume, formatWeight, fromDisplay, toDisplay } from '@/lib/units';
import { Button, Card, IconButton, Row, Screen, T } from '@/ui/components';
import { DatePicker } from '@/ui/DatePicker';
import { ExercisePicker } from '@/ui/ExercisePicker';
import { Icon } from '@/ui/icons';
import { CheckSheet, issueText, type FlaggedSet } from '@/ui/checks';
import { NumInput } from '@/ui/NumInput';
import { goalText, overloadReasonText } from '@/ui/overload';
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
  // `exercise` opens a given exercise, such as one picked from the review.
  const { exercise } = useLocalSearchParams<{ exercise?: string }>();
  if (!session) {
    return (
      <Screen>
        <T variant="h2">No workout in progress</T>
        <Button title="Back to week" onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  const start = Number(exercise);
  return <ActiveSession session={session} startAt={Number.isInteger(start) ? start : undefined} />;
}

function ActiveSession({ session, startAt }: { session: Session; startAt?: number }) {
  const { data, exerciseById, updateSession, setSessionDate, addExerciseToSession, discardSession } = useStore();
  const unit = data.unit;
  const now = useNow();
  const firstOpen = session.entries.findIndex((e) => e.sets.some((s) => !s.done));
  const [index, setIndex] = useState(
    startAt != null && startAt >= 0 && startAt < session.entries.length ? startAt : firstOpen >= 0 ? firstOpen : 0,
  );
  const [picking, setPicking] = useState(false);
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [pickingDate, setPickingDate] = useState(false);
  // Flagged numbers the user said are right, so they aren't asked twice.
  const [okayed, setOkayed] = useState<Set<string>>(() => new Set());
  // Where to go once the user has checked the flagged numbers.
  const [pendingMove, setPendingMove] = useState<(() => void) | null>(null);
  // Only a workout dated the day it was started gets a live clock and rest timer,
  // so one logged after the fact doesn't, and a late session keeps them past midnight.
  const startDay = toISODate(new Date(session.startedAt));
  const live = session.date === startDay;
  const workoutDays = useMemo(() => new Set(finishedSessions(data.sessions).map((s) => s.date)), [data.sessions]);

  const entry: SessionEntry | undefined = session.entries[Math.min(index, session.entries.length - 1)];
  const i = Math.min(index, session.entries.length - 1);
  const exercise = entry ? exerciseById(entry.exerciseId) : undefined;
  const target = entry?.target ?? (entry ? { exerciseId: entry.exerciseId, ...DEFAULT_TARGET } : undefined);

  // "Last time" looks back from this workout's date, so a back-dated workout
  // builds on what came before it rather than on later sessions. It's the
  // workout this one is measured against (`basis`: the last normal one with
  // the same rep range), so it agrees with the goal and the report; failing
  // that, simply the latest one.
  const basis = useMemo(
    () => (entry && target ? comparisonPerformance(data.sessions, entry.exerciseId, target, { excludeId: session.id, before: session }) : null),
    [data.sessions, entry, session, target],
  );
  const prev = useMemo(() => (entry && target ? lastTime(data.sessions, session, entry.exerciseId, target) : null), [data.sessions, entry, session, target]);
  // The same goal the last workout's report set, so a deload week doesn't reset progress.
  const suggestion = useMemo(
    () => (entry && target ? sessionTarget(data.sessions, session, entry.exerciseId, target, target.progression ?? session.progression, unit) : null),
    [data.sessions, entry, session, target, unit],
  );

  // Whether what's logged so far already beats the workout it's measured against.
  const loggedSets = entry ? workingSets(entry.sets) : [];
  const verdict = !session.deload && basis && target && loggedSets.length ? overloadVerdict(loggedSets, basis.sets, target.repMin, unit) : null;

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

  // A suggested weight is saved as the weight it shows, so it compares the same as one typed in.
  // A bodyweight move with nothing to go on starts from no added weight.
  const suggestedWeight = (k: number) => {
    const ph = placeholderFor(k);
    if (ph) return fromDisplay(toDisplay(ph.weight, unit), unit);
    return exercise?.equipment === 'bodyweight' ? 0 : null;
  };

  const logged = (k: number, next: LoggedSet) => {
    patchSet(k, next);
    if (next.done && !entry!.sets[k].done && next.kind === 'working' && live) setRestUntil(Date.now() + (target?.restSec ?? 120) * 1000);
  };

  // What's entered counts without a confirmation: a set is logged once it has
  // reps, and a weight left blank takes the suggested weight shown in it.
  const editSet = (k: number, patch: Pick<LoggedSet, 'weight'> | Pick<LoggedSet, 'reps'>) => {
    const set = entry!.sets[k];
    const next = { ...set, ...patch };
    if ('reps' in patch && patch.reps != null && set.reps == null && next.weight == null) next.weight = suggestedWeight(k);
    logged(k, { ...next, done: next.weight != null && next.reps != null });
  };

  // The check logs the suggested numbers as they are.
  const logSuggested = (k: number) => {
    const set = entry!.sets[k];
    const weight = set.weight ?? suggestedWeight(k);
    const reps = set.reps ?? placeholderFor(k)?.reps ?? null;
    if (weight == null || reps == null) return;
    logged(k, { ...set, weight, reps, done: true });
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

  // Numbers that look wrong, per set of this exercise, checked as they're typed.
  const issues = entry && exercise ? entry.sets.map((s) => setIssues(s, exercise.equipment, prev?.sets ?? null)) : [];
  const issueKey = (k: number, x: SetIssue) => `${i}:${k}:${x.field}:${x.field === 'weight' ? entry!.sets[k].weight : entry!.sets[k].reps}`;
  const unchecked = issues.map((xs, k) => xs.filter((x) => !okayed.has(issueKey(k, x))));
  const setLabel = (k: number) => (entry!.sets[k].kind === 'warmup' ? 'Warm-up' : `Set ${workingIndex(k) + 1}`);
  const flagged: FlaggedSet[] = unchecked.flatMap((xs, k) => {
    if (xs.length === 0) return [];
    const s = entry!.sets[k];
    const value = `${s.weight == null ? '–' : formatWeight(s.weight, unit)} × ${s.reps ?? '–'}`;
    return [{ label: setLabel(k), value, issues: xs }];
  });

  // Moving to another exercise or finishing asks the user to check flagged numbers first.
  const leave = (go: () => void) => (flagged.length ? setPendingMove(() => go) : go());
  const confirmFlagged = () => {
    const go = pendingMove;
    setOkayed((ok) => new Set([...ok, ...unchecked.flatMap((xs, k) => xs.map((x) => issueKey(k, x)))]));
    setPendingMove(null);
    go?.();
  };

  // Finishing opens the review; the workout is saved from there.
  const finish = () =>
    leave(() => {
      const anyDone = session.entries.some((e) => e.sets.some((s) => s.done));
      if (!anyDone) {
        discardSession(session.id);
        router.replace('/');
        return;
      }
      router.replace({ pathname: '/summary/[id]', params: { id: session.id } });
    });

  const restLeft = restUntil ? restUntil - now : 0;
  const exVolume = entry ? entryVolume(entry) : 0;
  const total = sessionVolume(session);
  const nextEntry = session.entries[i + 1];
  const fmtSets = (sets: SetValue[]) => formatSets(sets, unit);

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
              {session.date === today() ? 'Today' : shortDate(session.date)}
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
                onPress={() => (k === i ? undefined : leave(() => setIndex(k)))}
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
        <Pressable accessibilityRole="button" onPress={() => leave(() => setIndex(i + 1))} style={styles.next}>
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

          <View style={[styles.goal, verdict && !verdict.overloaded && styles.goalMissed]}>
            <T variant="label" color={colors.accent}>
              {session.deload ? 'Deload target' : 'Progressive overload goal'}
            </T>
            {suggestion ? (
              <>
                <T variant="num" color={colors.accent} style={{ fontSize: 26, lineHeight: 30 }}>
                  {fmtSets(suggestion.sets)}
                </T>
                <T variant="small">{goalText(suggestion, unit, 'last time')}</T>
              </>
            ) : target ? (
              <T variant="small">{`No goal yet, so today sets your baseline: ${target.sets} sets of ${target.repMin} to ${target.repMax} reps.`}</T>
            ) : null}
            {verdict ? (
              <Row gap={8} style={{ alignItems: 'flex-start', marginTop: 4 }}>
                <Icon name={verdict.overloaded ? 'check' : 'close'} size={18} color={verdict.overloaded ? colors.good : colors.bad} strokeWidth={3} />
                <T
                  style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 }}
                  color={verdict.overloaded ? colors.good : colors.bad}>
                  {`${verdict.overloaded ? 'Progressive overload so far' : 'No progressive overload yet'}: ${overloadReasonText(verdict.reason, unit)}`}
                </T>
              </Row>
            ) : null}
          </View>

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
              const flags = issues[k] ?? [];
              const badWeight = flags.some((x) => x.field === 'weight');
              const badReps = flags.some((x) => x.field === 'reps');
              const trend = set.done && !warm && prevSet && set.weight != null && set.reps != null ? compareSet({ weight: set.weight, reps: set.reps }, prevSet) : null;
              return (
                <View key={k} style={{ gap: 4 }}>
                  <Pressable
                    onLongPress={() => setSets((sets) => sets.filter((_, j) => j !== k))}
                    delayLongPress={600}
                    style={[
                      styles.setRow,
                      warm && styles.warmRow,
                      set.done && !warm && styles.doneRow,
                      !set.done && k === entry.sets.findIndex((s) => !s.done) && styles.activeRow,
                      flags.length > 0 && styles.badRow,
                    ]}>
                    <T style={[styles.cSet, { textAlign: 'center', fontFamily: fonts.semibold }]} color={warm ? colors.muted : colors.text}>
                      {warm ? 'W' : String(n + 1)}
                    </T>
                    <T variant="small" style={styles.cPrev} numberOfLines={1}>
                      {warm ? 'Warm-up' : prevSet ? `${toDisplay(prevSet.weight, unit)} × ${prevSet.reps}` : '–'}
                    </T>
                    <View style={styles.cW}>
                      <NumInput
                        label={`Set ${warm ? 'warm-up' : n + 1} weight in ${unit}`}
                        value={set.weight == null ? null : toDisplay(set.weight, unit)}
                        placeholder={ph ? String(toDisplay(ph.weight, unit)) : unit}
                        onChange={(v) => editSet(k, { weight: v == null ? null : fromDisplay(v, unit) })}
                        style={badWeight ? styles.badInput : undefined}
                      />
                    </View>
                    <View style={styles.cR}>
                      <NumInput
                        label={`Set ${warm ? 'warm-up' : n + 1} reps`}
                        decimal={false}
                        value={set.reps}
                        placeholder={ph ? String(ph.reps) : 'reps'}
                        onChange={(v) => editSet(k, { reps: v })}
                        style={badReps ? styles.badInput : trend === 'up' ? { color: colors.accent } : undefined}
                      />
                    </View>
                    <View style={styles.cDone}>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: set.done, disabled: set.done }}
                        accessibilityLabel={set.done ? `Set ${warm ? 'warm-up' : n + 1} logged` : `Complete set ${warm ? 'warm-up' : n + 1}`}
                        disabled={set.done}
                        onPress={() => logSuggested(k)}
                        style={[styles.check, set.done ? { backgroundColor: warm ? colors.surface3 : colors.accent, borderWidth: 0 } : null]}>
                        <Icon name="check" size={18} color={set.done ? (warm ? colors.muted : colors.accentInk) : colors.dim} strokeWidth={2.6} />
                      </Pressable>
                    </View>
                  </Pressable>
                  {flags.map((x) => (
                    <T key={x.kind} variant="small" color={colors.bad} style={{ paddingHorizontal: 8, fontFamily: fonts.semibold }}>
                      {issueText(x, unit)}
                    </T>
                  ))}
                </View>
              );
            })}
            <Row>
              <Button title="+ Add warm-up" variant="outline" size="medium" style={{ flex: 1 }} onPress={() => addSet('warmup')} />
              <Button title="+ Add set" variant="outline" size="medium" style={{ flex: 1 }} onPress={() => addSet('working')} />
            </Row>
            <T variant="small" style={{ fontSize: 12 }}>
              A set is logged once it has reps, and a blank weight uses the suggested one. Tap the check to log the suggested numbers as they are. Warm-ups never count toward volume or your report. Long-press a set to delete it.
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
          if (d !== startDay) setRestUntil(null);
        }}
      />

      <CheckSheet
        visible={pendingMove != null}
        flagged={flagged}
        unit={unit}
        onFix={() => setPendingMove(null)}
        onConfirm={confirmFlagged}
      />

      <ExercisePicker
        visible={picking}
        before={session}
        onClose={() => setPicking(false)}
        exclude={session.entries.map((e) => e.exerciseId)}
        onPick={(ids) => {
          const start = session.entries.length;
          ids.forEach((id) => addExerciseToSession(session.id, id));
          leave(() => setIndex(start));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, gap: 12 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  finish: { height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.surface2, justifyContent: 'center' },
  goal: { gap: 2, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.accentLine, backgroundColor: colors.accentBg },
  goalMissed: { borderColor: colors.bad, borderWidth: 2 },
  gridHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 56, paddingHorizontal: 4, borderRadius: 14, backgroundColor: colors.surface },
  warmRow: { height: 48, backgroundColor: '#131518' },
  activeRow: { borderWidth: 2, borderColor: colors.accent },
  doneRow: { backgroundColor: colors.accentBg },
  badRow: { borderWidth: 2, borderColor: colors.bad },
  badInput: { color: colors.bad, backgroundColor: colors.badSoft, borderWidth: 1, borderColor: colors.bad },
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
