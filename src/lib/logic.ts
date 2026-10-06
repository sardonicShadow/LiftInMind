import { addDays, daysBetween, monthDates, monthKey, previousMonth } from './dates';
import type {
  LoggedSet,
  Plan,
  ProgressionStyle,
  Session,
  SessionEntry,
  SetValue,
  TemplateExercise,
  Unit,
} from './types';
import { fromDisplay, toDisplay } from './units';

/* ---------- Sets and volume ---------- */

/** Completed working sets with both numbers filled in. Warm-ups never count. */
export function workingSets(sets: LoggedSet[]): SetValue[] {
  return sets
    .filter((s) => s.done && s.kind === 'working' && s.weight != null && s.reps != null)
    .map((s) => ({ weight: s.weight as number, reps: s.reps as number }));
}

export function setVolume(s: SetValue): number {
  return s.weight * s.reps;
}

export function entryVolume(entry: SessionEntry): number {
  return workingSets(entry.sets).reduce((sum, s) => sum + setVolume(s), 0);
}

export function sessionVolume(session: Session): number {
  return session.entries.reduce((sum, e) => sum + entryVolume(e), 0);
}

export function workingSetCount(session: Session): number {
  return session.entries.reduce((n, e) => n + workingSets(e.sets).length, 0);
}

/** Epley estimated one-rep max. */
export function e1rm(s: SetValue): number {
  if (s.reps <= 0) return 0;
  return s.weight * (1 + s.reps / 30);
}

/** Best set by estimated 1RM, ties broken by heavier weight. */
export function bestSet(sets: SetValue[]): SetValue | null {
  let best: SetValue | null = null;
  for (const s of sets) {
    if (!best || e1rm(s) > e1rm(best) || (e1rm(s) === e1rm(best) && s.weight > best.weight)) best = s;
  }
  return best;
}

export type Trend = 'up' | 'same' | 'down';

/** How a logged set compares with the matching set from last time. */
export function compareSet(now: SetValue, prev: SetValue): Trend {
  if (now.weight === prev.weight) {
    if (now.reps === prev.reps) return 'same';
    return now.reps > prev.reps ? 'up' : 'down';
  }
  if (now.weight > prev.weight && now.reps >= prev.reps) return 'up';
  if (now.weight < prev.weight && now.reps <= prev.reps) return 'down';
  const a = e1rm(now);
  const b = e1rm(prev);
  if (Math.abs(a - b) < 0.01) return 'same';
  return a > b ? 'up' : 'down';
}

/* ---------- History ---------- */

/** A point on the workout timeline: the calendar date, then start time within that date. */
export type TimelinePoint = Pick<Session, 'date' | 'startedAt'>;

export function compareTimeline(a: TimelinePoint, b: TimelinePoint): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return a.startedAt - b.startedAt;
}

export function finishedSessions(sessions: Session[]): Session[] {
  return sessions.filter((s) => s.finishedAt != null).sort(compareTimeline);
}

export interface Previous {
  session: Session;
  sets: SetValue[];
}

/** Sets and reps for an exercise added outside a workout template. */
export const DEFAULT_TARGET: Omit<TemplateExercise, 'exerciseId'> = { sets: 3, repMin: 8, repMax: 12, restSec: 120 };

export type RepRange = Pick<TemplateExercise, 'repMin' | 'repMax'>;

/**
 * The working sets from the most recent finished session (other than
 * `excludeId`) that included this exercise. Pass `before` to look back from a
 * point on the timeline, such as a workout being logged for an earlier date,
 * so later sessions are ignored. `skipDeload` passes over lighter deload
 * weeks, and `range` only accepts sessions that used that rep range.
 */
export function previousPerformance(
  sessions: Session[],
  exerciseId: string,
  excludeId?: string,
  opts: { skipDeload?: boolean; before?: TimelinePoint; range?: RepRange } = {},
): Previous | null {
  const done = finishedSessions(sessions);
  for (let i = done.length - 1; i >= 0; i--) {
    const s = done[i];
    if (s.id === excludeId || (opts.skipDeload && s.deload)) continue;
    if (opts.before && compareTimeline(s, opts.before) >= 0) continue;
    const entry = s.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry) continue;
    const used = entry.target ?? DEFAULT_TARGET;
    if (opts.range && (used.repMin !== opts.range.repMin || used.repMax !== opts.range.repMax)) continue;
    const sets = workingSets(entry.sets);
    if (sets.length) return { session: s, sets };
  }
  return null;
}

/**
 * The workout an exercise is measured against: the last normal (non-deload)
 * finished workout with it, with the same rep range, before `before` when
 * given. A deload is lighter on purpose, and a heavy day and a light day of
 * the same lift each build on their own history.
 */
export function comparisonPerformance(
  sessions: Session[],
  exerciseId: string,
  range: RepRange,
  opts: { excludeId?: string; before?: TimelinePoint } = {},
): Previous | null {
  return previousPerformance(sessions, exerciseId, opts.excludeId, { skipDeload: true, before: opts.before, range });
}

export interface ExerciseHistoryPoint {
  session: Session;
  sets: SetValue[];
  volume: number;
  best: SetValue;
}

export function exerciseHistory(sessions: Session[], exerciseId: string): ExerciseHistoryPoint[] {
  const out: ExerciseHistoryPoint[] = [];
  for (const s of finishedSessions(sessions)) {
    const entry = s.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry) continue;
    const sets = workingSets(entry.sets);
    const best = bestSet(sets);
    if (!best) continue;
    out.push({ session: s, sets, volume: sets.reduce((v, x) => v + setVolume(x), 0), best });
  }
  return out;
}

/* ---------- Progressive overload, workout to workout ---------- */

const EPS = 0.01;

/**
 * A weight as the user sees it (to 0.1 lb or 0.5 kg), back in lb. Two sets
 * that look the same then compare equal, even when one was typed in kg and
 * the other came from a lb goal.
 */
function snap(lb: number, unit: Unit): number {
  return fromDisplay(toDisplay(lb, unit), unit);
}

function snapSets(sets: SetValue[], unit: Unit): SetValue[] {
  return sets.map((s) => ({ ...s, weight: snap(s.weight, unit) }));
}

function topWeight(sets: SetValue[]): number {
  return Math.max(...sets.map((s) => s.weight));
}

function repsAtOrAbove(sets: SetValue[], weight: number): number {
  return sets.reduce((n, s) => (s.weight >= weight - EPS ? n + s.reps : n), 0);
}

function setsAtOrAbove(sets: SetValue[], weight: number): number {
  return sets.filter((s) => s.weight >= weight - EPS).length;
}

function setsVolume(sets: SetValue[]): number {
  return sets.reduce((v, s) => v + setVolume(s), 0);
}

/** Why a workout did or didn't overload an exercise. Weights and volume are in lb. */
export type OverloadReason =
  | { kind: 'heavier'; weight: number }
  | { kind: 'more-reps'; weight: number; reps: number }
  | { kind: 'more-volume'; volume: number }
  | { kind: 'too-heavy'; weight: number; reps: number; repMin: number }
  | { kind: 'fewer-sets'; weight: number; sets: number; previous: number }
  | { kind: 'lighter'; weight: number; previous: number }
  | { kind: 'fewer-reps'; weight: number; reps: number }
  | { kind: 'less-volume'; volume: number }
  | { kind: 'matched' };

export interface OverloadVerdict {
  overloaded: boolean;
  reason: OverloadReason;
}

/**
 * Whether `now` progressively overloaded `prev`, the same exercise's working
 * sets from the workout it's measured against. Weights are compared as they
 * show in `unit`.
 *
 * A heavier top weight counts when the reps at last time's top weight or
 * above held, or when the heaviest set still reached the bottom of the rep
 * range without dropping sets at that weight (one heavier set after three
 * normal ones is not an overload). At the same top weight, more reps there
 * count, and with the same reps, more volume from lighter sets counts.
 * Anything lighter, fewer, or an exact repeat is a miss.
 */
export function overloadVerdict(nowSets: SetValue[], prevSets: SetValue[], repMin: number, unit: Unit = 'lb'): OverloadVerdict {
  const now = snapSets(nowSets, unit);
  const prev = snapSets(prevSets, unit);
  const w = topWeight(now);
  const p = topWeight(prev);
  const repsNow = repsAtOrAbove(now, p);
  const repsPrev = repsAtOrAbove(prev, p);
  if (w > p + EPS) {
    const heavier: OverloadVerdict = { overloaded: true, reason: { kind: 'heavier', weight: w } };
    if (repsNow >= repsPrev) return heavier;
    const best = Math.max(...now.filter((s) => s.weight >= w - EPS).map((s) => s.reps));
    if (best < repMin) return { overloaded: false, reason: { kind: 'too-heavy', weight: w, reps: best, repMin } };
    const setsNow = setsAtOrAbove(now, p);
    const setsPrev = setsAtOrAbove(prev, p);
    if (setsNow < setsPrev) return { overloaded: false, reason: { kind: 'fewer-sets', weight: p, sets: setsNow, previous: setsPrev } };
    return heavier;
  }
  if (w < p - EPS) return { overloaded: false, reason: { kind: 'lighter', weight: w, previous: p } };
  if (repsNow > repsPrev) return { overloaded: true, reason: { kind: 'more-reps', weight: w, reps: repsNow - repsPrev } };
  if (repsNow < repsPrev) return { overloaded: false, reason: { kind: 'fewer-reps', weight: w, reps: repsPrev - repsNow } };
  const extra = setsVolume(now) - setsVolume(prev);
  if (extra > EPS) return { overloaded: true, reason: { kind: 'more-volume', volume: extra } };
  if (extra < -EPS) return { overloaded: false, reason: { kind: 'less-volume', volume: -extra } };
  return { overloaded: false, reason: { kind: 'matched' } };
}

/* ---------- Targets ---------- */

export const DEFAULT_INCREMENT_LB = 5;

/**
 * How a goal was set, so screens can explain it:
 * - add-reps: one more rep per set (double progression after an overload)
 * - top-of-range: every set hit the top of the rep range, so add weight and go back to the bottom
 * - one-more-rep: last time wasn't an overload, so aim for the smallest step that is one
 * - finish-sets: last time had fewer sets than planned, so do them all at the same numbers
 * - add-weight: linear progression with every rep done
 * - repeat-weight: linear progression with reps missed, so finish them before adding weight
 * - deload: a planned lighter week
 */
export type GoalKind = 'add-reps' | 'top-of-range' | 'one-more-rep' | 'finish-sets' | 'add-weight' | 'repeat-weight' | 'deload';

export interface Target {
  sets: SetValue[];
  kind: GoalKind;
  /** Weight added, in lb, for top-of-range and add-weight goals. */
  increment: number;
}

/** Rounds to the nearest 2.5 lb, the smallest common plate jump. */
function roundPlate(lb: number): number {
  return Math.round(lb / 2.5) * 2.5;
}

/**
 * The goal for the next workout, built from `last` (the latest normal,
 * non-deload workout's working sets) and `before` (the one it was measured
 * against), which says whether `last` was an overload. Every goal except a
 * deload is an overload of `last` when followed exactly.
 *
 * Double progression: once every planned set reaches the top of the rep
 * range, add weight and drop to the bottom of the range. With planned sets
 * skipped, do them all at the same numbers, which is already more work. After
 * an overload, or the first time, add one rep per set; after a miss, take the
 * smallest step that counts: one more rep on the weakest set. Linear: add
 * weight when every rep was done, otherwise repeat the top weight and finish
 * the reps first.
 */
export function nextTarget(
  lastSets: SetValue[] | null,
  beforeSets: SetValue[] | null,
  te: Pick<TemplateExercise, 'sets' | 'repMin' | 'repMax'>,
  style: ProgressionStyle,
  opts: { deload?: boolean; increment?: number; unit?: Unit } = {},
): Target | null {
  if (!lastSets || lastSets.length === 0) return null;
  const unit = opts.unit ?? 'lb';
  const last = snapSets(lastSets, unit);
  const inc = opts.increment ?? DEFAULT_INCREMENT_LB;
  const top = topWeight(last);
  const atTop = (s: SetValue) => s.weight >= top - EPS;
  // Fill in planned sets that were skipped, and keep any extra ones, so following the goal never means doing less.
  const count = Math.max(te.sets, last.length);
  const goal = (fn: (s: SetValue) => SetValue) => Array.from({ length: count }, (_, i) => fn(last[Math.min(i, last.length - 1)]));

  if (opts.deload) {
    const w = snap(roundPlate(top * 0.9), unit);
    return { kind: 'deload', increment: 0, sets: goal((s) => ({ weight: w, reps: Math.min(s.reps, te.repMax) })) };
  }

  if (style === 'linear') {
    const topSets = last.filter(atTop);
    if (topSets.length >= te.sets && topSets.every((s) => s.reps >= te.repMin)) {
      return {
        kind: 'add-weight',
        increment: inc,
        sets: goal((s) => ({ weight: snap(s.weight + inc, unit), reps: Math.min(Math.max(s.reps, te.repMin), te.repMax) })),
      };
    }
    // Every planned set at the top weight, with no set below the bottom of the range.
    const sets = Array.from({ length: Math.max(te.sets, topSets.length) }, (_, i) => ({
      weight: top,
      reps: Math.max(topSets[i]?.reps ?? 0, te.repMin),
    }));
    return { kind: 'repeat-weight', increment: 0, sets };
  }

  if (last.length >= te.sets && last.every((s) => s.reps >= te.repMax)) {
    return { kind: 'top-of-range', increment: inc, sets: goal((s) => ({ weight: snap(s.weight + inc, unit), reps: te.repMin })) };
  }

  if (last.length < te.sets) return { kind: 'finish-sets', increment: 0, sets: goal((s) => ({ ...s })) };

  const verdict = beforeSets && beforeSets.length > 0 ? overloadVerdict(last, beforeSets, te.repMin, unit) : null;
  if (!verdict || verdict.overloaded) {
    // A set already at or past the top of the range keeps its reps.
    return { kind: 'add-reps', increment: 0, sets: goal((s) => ({ weight: s.weight, reps: s.reps < te.repMax ? s.reps + 1 : s.reps })) };
  }

  // A miss: one more rep on the weakest set below the top of the range, preferring the top weight.
  // One always exists here: if every set had reached it, the goal would be top-of-range.
  const sets = goal((s) => ({ ...s }));
  const weakest = (pick: (s: SetValue) => boolean) =>
    sets.reduce((best, s, i) => (pick(s) && s.reps < te.repMax && (best < 0 || s.reps < sets[best].reps) ? i : best), -1);
  const i = weakest(atTop) >= 0 ? weakest(atTop) : weakest(() => true);
  if (i >= 0) sets[i] = { ...sets[i], reps: sets[i].reps + 1 };
  return { kind: 'one-more-rep', increment: 0, sets };
}

type Scheme = Pick<TemplateExercise, 'sets' | 'repMin' | 'repMax'>;

/** The goal for the workout after `last`, judged against the workout `last` was measured against. */
function goalAfter(
  sessions: Session[],
  exerciseId: string,
  last: Previous | null,
  te: Scheme,
  style: ProgressionStyle,
  opts: { deload?: boolean; unit?: Unit },
): Target | null {
  const before = last ? comparisonPerformance(sessions, exerciseId, te, { excludeId: last.session.id, before: last.session }) : null;
  return nextTarget(last?.sets ?? null, before?.sets ?? null, te, style, opts);
}

/**
 * The goal while logging `exerciseId` in `session`: built from the workout
 * it's measured against, the same way the post-workout report sets the next
 * goal.
 */
export function sessionTarget(
  sessions: Session[],
  session: Session,
  exerciseId: string,
  te: Scheme,
  style: ProgressionStyle,
  unit: Unit = 'lb',
): Target | null {
  const last = comparisonPerformance(sessions, exerciseId, te, { excludeId: session.id, before: session });
  return goalAfter(sessions, exerciseId, last, te, style, { deload: session.deload, unit });
}

/* ---------- Post-workout report ---------- */

/**
 * - overloaded / missed: judged against the workout it's measured against
 * - first: no earlier normal workout with this exercise
 * - new-range: done before, but never with this rep range
 * - deload: lighter on purpose, so not judged
 */
export type OverloadStatus = 'overloaded' | 'missed' | 'first' | 'new-range' | 'deload';

export interface ExerciseReport {
  exerciseId: string;
  sets: SetValue[];
  volume: number;
  /** The sets and rep range this workout used for the exercise. */
  scheme: Scheme;
  /** The workout it's measured against: the last normal one with the same rep range. */
  previous: Previous | null;
  status: OverloadStatus;
  reason: OverloadReason | null;
  /** The goal for the next normal workout with this exercise and rep range. */
  goal: Target | null;
  /**
   * The workout the goal builds on when it isn't this one: the last normal
   * workout after a deload, or a later workout when this one was logged
   * after the fact.
   */
  goalFrom: Session | null;
}

/**
 * For each exercise in a finished workout: whether it progressively overloaded
 * the workout it's measured against, and the goal for next time. The goal
 * builds on the latest normal workout with that exercise, so it matches the
 * target the next workout shows.
 */
export function workoutReport(sessions: Session[], session: Session, unit: Unit = 'lb'): ExerciseReport[] {
  const out: ExerciseReport[] = [];
  for (const entry of session.entries) {
    const sets = workingSets(entry.sets);
    if (sets.length === 0) continue;
    const te = entry.target ?? DEFAULT_TARGET;
    const scheme = { sets: te.sets, repMin: te.repMin, repMax: te.repMax };
    const style = entry.target?.progression ?? session.progression;
    const previous = comparisonPerformance(sessions, entry.exerciseId, te, { excludeId: session.id, before: session });

    let status: OverloadStatus;
    let reason: OverloadReason | null = null;
    if (session.deload) status = 'deload';
    else if (previous) {
      const verdict = overloadVerdict(sets, previous.sets, te.repMin, unit);
      status = verdict.overloaded ? 'overloaded' : 'missed';
      reason = verdict.reason;
    } else {
      const other = previousPerformance(sessions, entry.exerciseId, session.id, { skipDeload: true, before: session });
      status = other ? 'new-range' : 'first';
    }

    // The next workout builds on the latest normal one with this exercise: this
    // one, unless it's a deload or a later workout was logged before it.
    const latest = comparisonPerformance(sessions, entry.exerciseId, te, { excludeId: session.id });
    const fromHere = !session.deload && (!latest || compareTimeline(latest.session, session) < 0);
    const goal = fromHere
      ? nextTarget(sets, previous?.sets ?? null, te, style, { unit })
      : goalAfter(sessions, entry.exerciseId, latest, te, style, { unit });

    out.push({
      exerciseId: entry.exerciseId,
      sets,
      volume: setsVolume(sets),
      scheme,
      previous,
      status,
      reason,
      goal,
      goalFrom: fromHere ? null : (latest?.session ?? null),
    });
  }
  return out;
}

/* ---------- Plans and the calendar ---------- */

export interface PlanDay {
  week: number;
  templateId: string | null;
  deload: boolean;
}

export function planDay(plan: Plan, date: string): PlanDay | null {
  const offset = daysBetween(plan.startDate, date);
  if (offset < 0) return null;
  const weekIdx = Math.floor(offset / 7);
  if (weekIdx >= plan.weeks) return null;
  const week = weekIdx + 1;
  return {
    week,
    templateId: plan.days[offset % 7] ?? null,
    deload: plan.deloadEvery != null && plan.deloadEvery > 0 && week % plan.deloadEvery === 0,
  };
}

/**
 * Links a workout of `templateId` on `date` to `plan`. It is on the plan when
 * it is that day's scheduled workout. Any of the plan's workouts done during a
 * deload week counts as a deload, even on another weekday, so moving a light
 * session to a different day doesn't turn it into the base for new targets.
 */
export function planLink(plan: Plan | null, templateId: string | null, date: string): { planId: string | null; deload: boolean } {
  const day = plan ? planDay(plan, date) : null;
  if (!plan || !day || templateId == null) return { planId: null, deload: false };
  return {
    planId: day.templateId === templateId ? plan.id : null,
    deload: day.deload && plan.days.includes(templateId),
  };
}

export function plannedSessionsInRange(plan: Plan, dates: string[]): number {
  return dates.filter((d) => planDay(plan, d)?.templateId).length;
}

export function planEndDate(plan: Plan): string {
  return addDays(plan.startDate, plan.weeks * 7 - 1);
}

/* ---------- Monthly progressive overload report ---------- */

export type Verdict = 'progressed' | 'maintained' | 'regressed' | 'insufficient';

export interface ExerciseVerdict {
  exerciseId: string;
  verdict: Verdict;
  sessions: number;
  startBest: SetValue | null;
  endBest: SetValue | null;
  volumeChangePct: number | null;
  reason: string;
  stall: boolean;
}

export interface MonthlyReport {
  month: string;
  sessions: number;
  plannedSessions: number | null;
  totalVolume: number;
  previousVolume: number;
  volumeChangePct: number | null;
  exercises: ExerciseVerdict[];
  counts: Record<Verdict, number>;
}

const pct = (from: number, to: number) => (from > 0 ? ((to - from) / from) * 100 : null);

interface Point {
  best: SetValue;
  volume: number;
}

/**
 * Compares the start of the month with the end: the first two sessions vs
 * the last two (or first vs last when there are fewer than four), so one
 * bad day does not decide the verdict. Deload sessions are left out.
 */
export function judge(points: Point[]): Pick<ExerciseVerdict, 'verdict' | 'startBest' | 'endBest' | 'volumeChangePct' | 'reason'> {
  if (points.length < 2) {
    return {
      verdict: 'insufficient',
      startBest: points[0]?.best ?? null,
      endBest: points[0]?.best ?? null,
      volumeChangePct: null,
      reason: 'Done once this month',
    };
  }
  const k = points.length >= 4 ? 2 : 1;
  const start = points.slice(0, k);
  const end = points.slice(-k);
  const startBest = bestSet(start.map((p) => p.best)) as SetValue;
  const endBest = bestSet(end.map((p) => p.best)) as SetValue;
  const avg = (ps: Point[]) => ps.reduce((v, p) => v + p.volume, 0) / ps.length;
  const volChange = pct(avg(start), avg(end));
  const e1Change = pct(e1rm(startBest), e1rm(endBest)) ?? 0;
  const base = { startBest, endBest, volumeChangePct: volChange };

  if (endBest.weight > startBest.weight && endBest.reps >= startBest.reps)
    return { ...base, verdict: 'progressed', reason: 'Heavier best set' };
  // A weight jump with the reps reset to the bottom of the range is the payoff of
  // double progression, so it counts unless the estimated 1RM fell sharply.
  if (endBest.weight > startBest.weight && e1Change > -5)
    return { ...base, verdict: 'progressed', reason: 'Moved up in weight' };
  if (endBest.weight === startBest.weight && endBest.reps > startBest.reps)
    return { ...base, verdict: 'progressed', reason: 'More reps at the same weight' };
  if (e1Change >= 2) return { ...base, verdict: 'progressed', reason: 'Estimated 1RM up' };
  if (volChange != null && volChange >= 5 && endBest.weight >= startBest.weight)
    return { ...base, verdict: 'progressed', reason: 'More volume per session' };
  if (e1Change <= -2) return { ...base, verdict: 'regressed', reason: 'Estimated 1RM down' };
  if (volChange != null && volChange <= -5) return { ...base, verdict: 'regressed', reason: 'Less volume per session' };
  return { ...base, verdict: 'maintained', reason: 'Within 2% of the start of the month' };
}

function monthVerdicts(sessions: Session[], month: string): Map<string, ReturnType<typeof judge> & { sessions: number }> {
  const inMonth = finishedSessions(sessions).filter((s) => monthKey(s.date) === month && !s.deload);
  const byExercise = new Map<string, Point[]>();
  for (const s of inMonth) {
    for (const e of s.entries) {
      const sets = workingSets(e.sets);
      const best = bestSet(sets);
      if (!best) continue;
      const list = byExercise.get(e.exerciseId) ?? [];
      list.push({ best, volume: sets.reduce((v, x) => v + setVolume(x), 0) });
      byExercise.set(e.exerciseId, list);
    }
  }
  const out = new Map<string, ReturnType<typeof judge> & { sessions: number }>();
  for (const [id, points] of byExercise) out.set(id, { ...judge(points), sessions: points.length });
  return out;
}

export function monthlyReport(sessions: Session[], month: string, plan: Plan | null): MonthlyReport {
  const done = finishedSessions(sessions);
  const inMonth = done.filter((s) => monthKey(s.date) === month);
  const prevKey = previousMonth(month);
  const prevMonthSessions = done.filter((s) => monthKey(s.date) === prevKey);
  const totalVolume = inMonth.reduce((v, s) => v + sessionVolume(s), 0);
  const previousVolume = prevMonthSessions.reduce((v, s) => v + sessionVolume(s), 0);

  const current = monthVerdicts(sessions, month);
  const previous = monthVerdicts(sessions, prevKey);
  const stalled = (v?: Verdict) => v === 'maintained' || v === 'regressed';

  const order: Record<Verdict, number> = { progressed: 0, maintained: 1, regressed: 2, insufficient: 3 };
  const exercises: ExerciseVerdict[] = [...current.entries()]
    .map(([exerciseId, v]) => ({
      exerciseId,
      ...v,
      stall: stalled(v.verdict) && stalled(previous.get(exerciseId)?.verdict),
    }))
    .sort((a, b) => order[a.verdict] - order[b.verdict] || b.sessions - a.sessions);

  const counts: Record<Verdict, number> = { progressed: 0, maintained: 0, regressed: 0, insufficient: 0 };
  for (const e of exercises) counts[e.verdict]++;

  return {
    month,
    sessions: inMonth.length,
    plannedSessions: plan ? plannedSessionsInRange(plan, monthDates(month)) : null,
    totalVolume,
    previousVolume,
    volumeChangePct: pct(previousVolume, totalVolume),
    exercises,
    counts,
  };
}

/** Months (yyyy-mm) that have at least one finished session, newest first. */
export function monthsWithSessions(sessions: Session[]): string[] {
  return [...new Set(finishedSessions(sessions).map((s) => monthKey(s.date)))].sort().reverse();
}
