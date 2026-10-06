import { describe, expect, it } from 'vitest';

import { addDays, mondayOf, weekdayIndex } from './dates';
import {
  compareSet,
  entryVolume,
  judge,
  monthlyReport,
  planDay,
  planLink,
  previousPerformance,
  nextTarget,
  overloadVerdict,
  sessionTarget,
  sessionVolume,
  workoutReport,
} from './logic';
import type { LoggedSet, Plan, Session } from './types';

const w = (weight: number, reps: number, kind: LoggedSet['kind'] = 'working', done = true): LoggedSet => ({
  weight,
  reps,
  kind,
  done,
});

let n = 0;
function session(date: string, entries: Record<string, LoggedSet[]>, extra: Partial<Session> = {}): Session {
  n++;
  return {
    id: `s${n}`,
    date,
    startedAt: n,
    finishedAt: n + 1,
    templateId: null,
    planId: null,
    name: 'Test',
    entries: Object.entries(entries).map(([exerciseId, sets]) => ({ exerciseId, sets })),
    deload: false,
    progression: 'double',
    ...extra,
  };
}

describe('volume', () => {
  it('counts completed working sets only', () => {
    const entry = { exerciseId: 'bench', sets: [w(95, 8, 'warmup'), w(135, 9), w(135, 8), w(135, 7, 'working', false)] };
    expect(entryVolume(entry)).toBe(135 * 17);
  });

  it('sums entries for the session', () => {
    const s = session('2026-10-01', { bench: [w(135, 8), w(135, 8)], fly: [w(20, 12)] });
    expect(sessionVolume(s)).toBe(135 * 16 + 240);
  });
});

describe('previousPerformance', () => {
  it('returns the latest finished session with that exercise, skipping the current one', () => {
    const a = session('2026-09-01', { bench: [w(125, 8)] });
    const b = session('2026-09-05', { bench: [w(130, 8)] });
    const c = session('2026-09-08', { squat: [w(200, 5)] });
    const current = session('2026-09-10', { bench: [] }, { finishedAt: null });
    const prev = previousPerformance([a, c, b, current], 'bench', current.id);
    expect(prev?.session.id).toBe(b.id);
    expect(prev?.sets).toEqual([{ weight: 130, reps: 8 }]);
  });

  it('looks back from the date of a back-dated workout, ignoring later sessions', () => {
    const a = session('2026-09-01', { bench: [w(125, 8)] });
    const b = session('2026-09-05', { bench: [w(130, 8)] });
    const c = session('2026-09-12', { bench: [w(140, 8)] });
    // Logged today (late startedAt) for Sept 8: "last time" is Sept 5, not Sept 12.
    const backdated = session('2026-09-08', { bench: [] }, { finishedAt: null, startedAt: 10_000 });
    expect(previousPerformance([a, b, c, backdated], 'bench', backdated.id, { before: backdated })?.session.id).toBe(b.id);
    // Nothing earlier than Sept 1.
    expect(previousPerformance([a, b, c], 'bench', undefined, { before: { date: '2026-09-01', startedAt: 0 } })).toBeNull();
  });

  it('counts an earlier workout on the same day but not a later one', () => {
    const morning = session('2026-09-05', { bench: [w(130, 8)] }, { startedAt: 100 });
    const evening = session('2026-09-05', { bench: [w(135, 8)] }, { startedAt: 300 });
    const middle = { date: '2026-09-05', startedAt: 200 };
    expect(previousPerformance([morning, evening], 'bench', undefined, { before: middle })?.session.id).toBe(morning.id);
    expect(previousPerformance([morning, evening], 'bench', undefined, { before: { date: '2026-09-05', startedAt: Infinity } })?.session.id).toBe(
      evening.id,
    );
  });

  it('combines the date lookback with skipping deloads', () => {
    const a = session('2026-09-01', { bench: [w(130, 8)] });
    const deload = session('2026-09-08', { bench: [w(115, 8)] }, { deload: true });
    const later = session('2026-09-20', { bench: [w(140, 8)] });
    const before = { date: '2026-09-10', startedAt: 0 };
    expect(previousPerformance([a, deload, later], 'bench', undefined, { before })?.session.id).toBe(deload.id);
    expect(previousPerformance([a, deload, later], 'bench', undefined, { before, skipDeload: true })?.session.id).toBe(a.id);
  });

  it('ignores warm-up only entries', () => {
    const a = session('2026-09-01', { bench: [w(125, 8)] });
    const b = session('2026-09-05', { bench: [w(95, 10, 'warmup')] });
    expect(previousPerformance([a, b], 'bench')?.session.id).toBe(a.id);
  });
});

const sv = (weight: number, ...reps: number[]) => reps.map((r) => ({ weight, reps: r }));

describe('overloadVerdict', () => {
  it('counts more reps at the same top weight', () => {
    expect(overloadVerdict(sv(135, 10, 10, 9), sv(135, 9, 9, 9), 8)).toEqual({
      overloaded: true,
      reason: { kind: 'more-reps', weight: 135, reps: 2 },
    });
  });

  it('counts a heavier weight, including a jump with the reps reset to the bottom of the range', () => {
    expect(overloadVerdict(sv(140, 8, 8, 8), sv(135, 8, 8, 8), 8).overloaded).toBe(true);
    expect(overloadVerdict(sv(140, 8, 8, 7), sv(135, 12, 12, 12), 8)).toEqual({ overloaded: true, reason: { kind: 'heavier', weight: 140 } });
  });

  it('misses when a heavier weight falls below the rep range', () => {
    expect(overloadVerdict(sv(140, 6, 5, 5), sv(135, 12, 12, 12), 8)).toEqual({
      overloaded: false,
      reason: { kind: 'too-heavy', weight: 140, reps: 6, repMin: 8 },
    });
  });

  it('counts an extra set at the same top weight and an extra back-off set', () => {
    expect(overloadVerdict(sv(135, 8, 8, 8, 8), sv(135, 8, 8, 8), 8).reason).toEqual({ kind: 'more-reps', weight: 135, reps: 8 });
    const backOff = [...sv(135, 8, 8), ...sv(115, 12)];
    expect(overloadVerdict(backOff, sv(135, 8, 8), 8)).toEqual({ overloaded: true, reason: { kind: 'more-volume', volume: 115 * 12 } });
  });

  it('misses on fewer reps, a lighter top weight, or an exact repeat', () => {
    expect(overloadVerdict(sv(135, 9, 8, 8), sv(135, 9, 9, 9), 8)).toEqual({ overloaded: false, reason: { kind: 'fewer-reps', weight: 135, reps: 2 } });
    expect(overloadVerdict(sv(125, 12, 12, 12), sv(135, 8, 8, 8), 8)).toEqual({
      overloaded: false,
      reason: { kind: 'lighter', weight: 125, previous: 135 },
    });
    expect(overloadVerdict(sv(80, 12, 12, 11), sv(80, 12, 12, 11), 8)).toEqual({ overloaded: false, reason: { kind: 'matched' } });
  });
});

describe('nextTarget', () => {
  const te = { sets: 3, repMin: 8, repMax: 12 };

  it('adds a rep per set after an overload, or the first time', () => {
    const expected = [...sv(135, 9, 9), ...sv(135, 8)];
    expect(nextTarget(sv(135, 8, 8, 7), null, te, 'double')).toEqual({ kind: 'add-reps', increment: 0, sets: expected });
    expect(nextTarget(sv(135, 8, 8, 7), sv(135, 8, 7, 7), te, 'double')?.sets).toEqual(expected);
  });

  it('asks for one more rep on the weakest set after a miss', () => {
    // 135 x 10, 9, 8 after 135 x 10, 10, 9 is two reps fewer.
    expect(nextTarget(sv(135, 10, 9, 8), sv(135, 10, 10, 9), te, 'double')).toEqual({
      kind: 'one-more-rep',
      increment: 0,
      sets: sv(135, 10, 9, 9),
    });
    // An exact repeat: the stuck set gets the extra rep.
    expect(nextTarget(sv(80, 12, 12, 11), sv(80, 12, 12, 11), te, 'double')?.sets).toEqual(sv(80, 12, 12, 12));
    // Too heavy: build reps at the new weight rather than jumping to the bottom of the range.
    expect(nextTarget(sv(140, 6, 5, 5), sv(135, 12, 12, 12), te, 'double')?.sets).toEqual(sv(140, 6, 6, 5));
  });

  it('prefers the top weight for the extra rep after a miss', () => {
    const last = [...sv(135, 8, 7), ...sv(115, 6)];
    const prev = [...sv(135, 8, 8), ...sv(115, 10)];
    expect(nextTarget(last, prev, te, 'double')?.sets).toEqual([...sv(135, 8, 8), ...sv(115, 6)]);
  });

  it('adds weight once every set hits the top of the range, whatever the verdict', () => {
    const t = nextTarget(sv(135, 12, 12, 12), sv(135, 12, 12, 12), te, 'double');
    expect(t).toEqual({ kind: 'top-of-range', increment: 5, sets: sv(140, 8, 8, 8) });
  });

  it('keeps extra sets so following the goal never means doing less', () => {
    expect(nextTarget(sv(135, 8, 8, 8, 8), null, te, 'double')?.sets).toEqual(sv(135, 9, 9, 9, 9));
  });

  it('adds weight under linear progression only when every rep was done', () => {
    const fiveByFive = { sets: 3, repMin: 5, repMax: 5 };
    expect(nextTarget(sv(200, 5, 5, 5), null, fiveByFive, 'linear')).toEqual({ kind: 'add-weight', increment: 5, sets: sv(205, 5, 5, 5) });
    expect(nextTarget(sv(205, 5, 5, 3), sv(200, 5, 5, 5), fiveByFive, 'linear')).toEqual({
      kind: 'repeat-weight',
      increment: 0,
      sets: sv(205, 5, 5, 5),
    });
    // A skipped set counts as missed reps.
    expect(nextTarget(sv(200, 5, 5), null, fiveByFive, 'linear')?.kind).toBe('repeat-weight');
  });

  it('drops to 90% on a deload week', () => {
    const t = nextTarget(sv(200, 5), null, { sets: 1, repMin: 5, repMax: 8 }, 'double', { deload: true });
    expect(t).toEqual({ kind: 'deload', increment: 0, sets: sv(180, 5) });
  });

  it('returns null with no history', () => {
    expect(nextTarget(null, null, te, 'double')).toBeNull();
  });
});

describe('workoutReport', () => {
  const target = { exerciseId: 'bench', sets: 3, repMin: 8, repMax: 12, restSec: 120 };
  const withTarget = (s: Session) => ({ ...s, entries: s.entries.map((e) => ({ ...e, target })) });

  it('marks each exercise against the last normal workout and sets the next goal', () => {
    const a = withTarget(session('2026-09-01', { bench: [w(135, 9), w(135, 9), w(135, 9)] }));
    const b = withTarget(session('2026-09-04', { bench: [w(95, 10, 'warmup'), w(135, 10), w(135, 10), w(135, 9)], fly: [w(20, 12)] }));
    const [bench, fly] = workoutReport([a, b], b);
    expect(bench.status).toBe('overloaded');
    expect(bench.reason).toEqual({ kind: 'more-reps', weight: 135, reps: 2 });
    expect(bench.previous?.session.id).toBe(a.id);
    expect(bench.goal?.sets).toEqual(sv(135, 11, 11, 10));
    expect(fly.status).toBe('first');
    expect(fly.goal?.kind).toBe('add-reps');
  });

  it('skips exercises with no working sets', () => {
    const a = session('2026-09-01', { bench: [w(95, 10, 'warmup')] });
    expect(workoutReport([a], a)).toEqual([]);
  });

  it('compares with the last normal workout and does not judge a deload', () => {
    const a = withTarget(session('2026-09-01', { bench: sv(135, 10, 10, 10).map((x) => w(x.weight, x.reps)) }));
    const d = withTarget(session('2026-09-08', { bench: sv(120, 10, 10, 10).map((x) => w(x.weight, x.reps)) }, { deload: true }));
    const [deload] = workoutReport([a, d], d);
    expect(deload.status).toBe('deload');
    expect(deload.goal?.sets).toEqual(sv(135, 11, 11, 11));
    const c = withTarget(session('2026-09-15', { bench: sv(135, 10, 10, 9).map((x) => w(x.weight, x.reps)) }));
    const [after] = workoutReport([a, d, c], c);
    expect(after.previous?.session.id).toBe(a.id);
    expect(after.status).toBe('missed');
  });

  it('sets the same goal the next workout shows while logging', () => {
    const a = withTarget(session('2026-09-01', { bench: sv(135, 10, 10, 9).map((x) => w(x.weight, x.reps)) }));
    const b = withTarget(session('2026-09-04', { bench: sv(135, 10, 9, 8).map((x) => w(x.weight, x.reps)) }));
    const next = session('2026-09-08', { bench: [] }, { finishedAt: null });
    const [report] = workoutReport([a, b], b);
    expect(report.status).toBe('missed');
    expect(sessionTarget([a, b, next], next, 'bench', target, 'double')).toEqual(report.goal);
  });
});

describe('compareSet', () => {
  it('reads more reps or more weight as progress', () => {
    expect(compareSet({ weight: 135, reps: 9 }, { weight: 135, reps: 8 })).toBe('up');
    expect(compareSet({ weight: 140, reps: 8 }, { weight: 135, reps: 8 })).toBe('up');
    expect(compareSet({ weight: 135, reps: 8 }, { weight: 135, reps: 8 })).toBe('same');
    expect(compareSet({ weight: 135, reps: 6 }, { weight: 135, reps: 8 })).toBe('down');
  });
});

describe('judge', () => {
  const p = (weight: number, reps: number, volume = weight * reps * 3) => ({ best: { weight, reps }, volume });

  it('needs two sessions', () => {
    expect(judge([p(135, 8)]).verdict).toBe('insufficient');
  });

  it('progresses on a heavier best set', () => {
    expect(judge([p(125, 8), p(130, 8), p(130, 9), p(135, 8)]).verdict).toBe('progressed');
  });

  it('counts a weight jump with the reps reset as progress', () => {
    const r = judge([p(120, 15), p(125, 12)]);
    expect(r.verdict).toBe('progressed');
    expect(r.reason).toBe('Moved up in weight');
  });

  it('progresses on more reps at the same weight', () => {
    const r = judge([p(80, 10), p(80, 12)]);
    expect(r.verdict).toBe('progressed');
    expect(r.reason).toBe('More reps at the same weight');
  });

  it('maintains when nothing moved', () => {
    expect(judge([p(80, 12), p(80, 12), p(80, 12)]).verdict).toBe('maintained');
  });

  it('regresses when the best set drops', () => {
    expect(judge([p(65, 12), p(60, 12)]).verdict).toBe('regressed');
  });

  it('compares the first two and last two sessions when there are four or more', () => {
    // One bad day at the end does not decide it: the best of the last two wins.
    expect(judge([p(100, 8), p(100, 8), p(105, 8), p(95, 6)]).verdict).toBe('progressed');
  });
});

describe('monthlyReport', () => {
  it('counts verdicts, volume change and flags two-month stalls', () => {
    const sessions = [
      session('2026-08-03', { press: [w(80, 12)] }),
      session('2026-08-20', { press: [w(80, 12)] }),
      session('2026-09-02', { press: [w(80, 12)], bench: [w(125, 8)] }),
      session('2026-09-16', { press: [w(80, 12)], bench: [w(135, 8)] }),
      session('2026-09-23', { curl: [w(30, 10)] }),
      session('2026-09-30', { bench: [w(120, 5)] }, { deload: true }),
    ];
    const r = monthlyReport(sessions, '2026-09', null);
    expect(r.sessions).toBe(4);
    expect(r.counts).toEqual({ progressed: 1, maintained: 1, regressed: 0, insufficient: 1 });
    expect(r.exercises.find((e) => e.exerciseId === 'press')?.stall).toBe(true);
    expect(r.exercises.find((e) => e.exerciseId === 'bench')?.endBest).toEqual({ weight: 135, reps: 8 });
    expect(r.totalVolume).toBe(80 * 12 * 2 + 125 * 8 + 135 * 8 + 300 + 600);
    expect(r.previousVolume).toBe(80 * 12 * 2);
  });

  it('counts planned sessions from the active plan', () => {
    const plan: Plan = {
      id: 'p',
      name: 'PPL',
      weeks: 12,
      startDate: '2026-08-31',
      days: ['a', 'b', null, 'c', null, null, null],
      deloadEvery: null,
      progression: 'double',
    };
    // Sept 2026: Mondays 7,14,21,28 + Tue 1,8,15,22,29 + Thu 3,10,17,24 = 13; Aug 31 is outside the month.
    expect(monthlyReport([], '2026-09', plan).plannedSessions).toBe(13);
  });
});

describe('planDay', () => {
  const plan: Plan = {
    id: 'p',
    name: 'PPL',
    weeks: 6,
    startDate: '2026-09-07',
    days: ['push', 'pull', null, 'legs', null, 'upper', null],
    deloadEvery: 3,
    progression: 'double',
  };

  it('maps dates onto weeks and weekdays', () => {
    expect(planDay(plan, '2026-09-07')).toEqual({ week: 1, templateId: 'push', deload: false });
    expect(planDay(plan, '2026-09-23')).toEqual({ week: 3, templateId: null, deload: true });
    expect(planDay(plan, '2026-09-06')).toBeNull();
    expect(planDay(plan, addDays(plan.startDate, 42))).toBeNull();
  });
});

describe('planLink', () => {
  const plan: Plan = {
    id: 'p',
    name: 'PPL',
    weeks: 6,
    startDate: '2026-09-07',
    days: ['push', 'pull', null, 'legs', null, 'upper', null],
    deloadEvery: 3,
    progression: 'double',
  };

  it('links a workout to the plan only on its scheduled day', () => {
    expect(planLink(plan, 'push', '2026-09-07')).toEqual({ planId: 'p', deload: false });
    expect(planLink(plan, 'push', '2026-09-08')).toEqual({ planId: null, deload: false });
    expect(planLink(plan, 'push', '2026-09-21')).toEqual({ planId: 'p', deload: true });
    expect(planLink(plan, 'push', '2026-10-26')).toEqual({ planId: null, deload: false });
    expect(planLink(plan, null, '2026-09-07')).toEqual({ planId: null, deload: false });
    expect(planLink(null, 'push', '2026-09-07')).toEqual({ planId: null, deload: false });
  });

  it('keeps the deload flag for a plan workout moved to another day of a deload week', () => {
    // Week 3 (Sept 21-27) is a deload week; Wednesday has no scheduled workout.
    expect(planLink(plan, 'push', '2026-09-23')).toEqual({ planId: null, deload: true });
    expect(planLink(plan, 'other', '2026-09-23')).toEqual({ planId: null, deload: false });
    expect(planLink(plan, 'push', '2026-09-16')).toEqual({ planId: null, deload: false });
  });
});

describe('dates', () => {
  it('finds Monday', () => {
    expect(mondayOf('2026-10-04')).toBe('2026-09-28');
    expect(weekdayIndex('2026-10-05')).toBe(0);
  });
});
