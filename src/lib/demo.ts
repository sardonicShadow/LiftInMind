import { addDays, mondayOf, parseISODate } from './dates';
import { planDay, previousPerformance, suggestTarget } from './logic';
import type { AppData, LoggedSet, Plan, Session, TemplateExercise, WorkoutTemplate } from './types';

/** Small deterministic PRNG so the sample history is the same every time. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const te = (exerciseId: string, sets: number, repMin: number, repMax: number, restSec = 120): TemplateExercise => ({
  exerciseId,
  sets,
  repMin,
  repMax,
  restSec,
});

export const SAMPLE_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'push-a',
    name: 'Push A',
    exercises: [
      te('bench-press', 3, 8, 12, 150),
      te('incline-dumbbell-press', 3, 8, 12),
      te('shoulder-press-machine', 3, 10, 12),
      te('lateral-raise', 3, 12, 16, 60),
      te('triceps-pushdown', 3, 10, 12, 90),
      te('cable-fly', 3, 12, 15, 60),
    ],
  },
  {
    id: 'pull-a',
    name: 'Pull A',
    exercises: [
      te('lat-pulldown', 3, 8, 12),
      te('seated-cable-row', 3, 8, 12),
      te('chest-supported-row-machine', 3, 10, 12),
      te('face-pull', 3, 12, 15, 60),
      te('dumbbell-curl', 3, 10, 12, 90),
      te('hammer-curl', 2, 10, 12, 90),
    ],
  },
  {
    id: 'legs-a',
    name: 'Legs A',
    exercises: [
      te('back-squat', 3, 5, 8, 180),
      te('romanian-deadlift', 3, 8, 10, 150),
      te('leg-press', 3, 10, 12),
      te('seated-leg-curl', 3, 10, 12, 90),
      te('standing-calf-raise-machine', 3, 12, 15, 60),
    ],
  },
  {
    id: 'upper-a',
    name: 'Upper A',
    exercises: [
      te('overhead-press', 3, 6, 10, 150),
      te('barbell-row', 3, 8, 10),
      te('dumbbell-bench-press', 3, 8, 12),
      te('cable-curl', 3, 10, 12, 90),
      te('overhead-cable-extension', 3, 10, 12, 90),
    ],
  },
];

const START_WEIGHT: Record<string, number> = {
  'bench-press': 115,
  'incline-dumbbell-press': 40,
  'shoulder-press-machine': 80,
  'lateral-raise': 15,
  'triceps-pushdown': 50,
  'cable-fly': 25,
  'lat-pulldown': 100,
  'seated-cable-row': 100,
  'chest-supported-row-machine': 90,
  'face-pull': 40,
  'dumbbell-curl': 25,
  'hammer-curl': 25,
  'back-squat': 185,
  'romanian-deadlift': 155,
  'leg-press': 270,
  'seated-leg-curl': 90,
  'standing-calf-raise-machine': 120,
  'overhead-press': 85,
  'barbell-row': 135,
  'dumbbell-bench-press': 50,
  'cable-curl': 40,
  'overhead-cable-extension': 40,
};

/** Exercises that open with a warm-up set in the sample data. */
const WARM_UP = new Set(['bench-press', 'back-squat', 'overhead-press', 'barbell-row']);

/** A deliberately stuck lift, so the report has a stall to show. */
const STALLED = 'shoulder-press-machine';

/**
 * Builds a sample plan that started eight weeks before `todayISO`, plus the
 * logged history up to yesterday, following double progression with some
 * missed reps and skipped days.
 */
export function buildSampleData(todayISO: string): Pick<AppData, 'templates' | 'plans' | 'activePlanId' | 'sessions'> {
  const random = rng(42);
  const plan: Plan = {
    id: 'sample-plan',
    name: 'Push Pull Legs + Upper',
    weeks: 12,
    startDate: addDays(mondayOf(todayISO), -56),
    days: ['push-a', 'pull-a', null, 'legs-a', null, 'upper-a', null],
    deloadEvery: 6,
    progression: 'double',
  };

  const sessions: Session[] = [];
  for (let date = plan.startDate; date < todayISO; date = addDays(date, 1)) {
    const day = planDay(plan, date);
    if (!day?.templateId) continue;
    if (random() < 0.08) continue;
    const template = SAMPLE_TEMPLATES.find((t) => t.id === day.templateId)!;
    const startedAt = parseISODate(date).getTime() + 18 * 3600_000 + Math.floor(random() * 3600_000);
    const entries = template.exercises.map((t) => {
      const sets: LoggedSet[] = [];
      const prev = previousPerformance(sessions, t.exerciseId, undefined, { skipDeload: true });
      let plan_: { weight: number; reps: number }[];
      if (t.exerciseId === STALLED && prev) {
        plan_ = [80, 80, 80].map((w, i) => ({ weight: w, reps: i === 2 ? 11 : 12 }));
      } else {
        const target = suggestTarget(prev?.sets ?? null, t, plan.progression, { deload: day.deload });
        plan_ =
          target?.sets ??
          Array.from({ length: t.sets }, () => ({ weight: START_WEIGHT[t.exerciseId] ?? 50, reps: t.repMin + 1 }));
      }
      if (WARM_UP.has(t.exerciseId)) {
        sets.push({ weight: Math.round((plan_[0].weight * 0.6) / 5) * 5, reps: 8, kind: 'warmup', done: true });
      }
      for (const s of plan_) {
        const r = random();
        const miss = day.deload ? 0 : r < 0.03 ? 2 : r < 0.12 ? 1 : 0;
        sets.push({ weight: s.weight, reps: Math.max(1, s.reps - miss), kind: 'working', done: true });
      }
      return { exerciseId: t.exerciseId, sets, target: t };
    });
    sessions.push({
      id: `sample-${date}`,
      date,
      startedAt,
      finishedAt: startedAt + (50 + Math.floor(random() * 20)) * 60_000,
      templateId: template.id,
      planId: plan.id,
      name: template.name,
      entries,
      deload: day.deload,
      progression: plan.progression,
    });
  }

  return { templates: SAMPLE_TEMPLATES, plans: [plan], activePlanId: plan.id, sessions };
}
