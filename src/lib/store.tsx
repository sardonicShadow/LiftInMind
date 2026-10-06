import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { CATALOG } from './catalog';
import { today } from './dates';
import { buildSampleData } from './demo';
import { planLink } from './logic';
import type { AppData, Exercise, Plan, Session, SessionEntry, TemplateExercise, Unit, WorkoutTemplate } from './types';

const STORAGE_KEY = 'liftinmind:data:v1';

const EMPTY: AppData = {
  version: 1,
  unit: 'lb',
  customExercises: [],
  templates: [],
  plans: [],
  activePlanId: null,
  sessions: [],
};

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const DEFAULT_TARGET: Omit<TemplateExercise, 'exerciseId'> = { sets: 3, repMin: 8, repMax: 12, restSec: 120 };

function entryFromTarget(t: TemplateExercise): SessionEntry {
  return {
    exerciseId: t.exerciseId,
    target: t,
    sets: Array.from({ length: t.sets }, () => ({ weight: null, reps: null, kind: 'working' as const, done: false })),
  };
}

interface Store {
  ready: boolean;
  data: AppData;
  exercises: Exercise[];
  exerciseById: (id: string) => Exercise | undefined;
  activePlan: Plan | null;
  activeSession: Session | null;
  setUnit: (u: Unit) => void;
  addCustomExercise: (e: Omit<Exercise, 'id' | 'custom'>) => Exercise;
  saveTemplate: (t: WorkoutTemplate) => void;
  deleteTemplate: (id: string) => void;
  savePlan: (p: Plan) => void;
  deletePlan: (id: string) => void;
  setActivePlan: (id: string | null) => void;
  startSession: (templateId: string | null, date?: string) => Session;
  /** Moves a workout to another day, re-checking whether it is that day's planned workout. */
  setSessionDate: (id: string, date: string) => void;
  updateSession: (id: string, fn: (s: Session) => Session) => void;
  addExerciseToSession: (sessionId: string, exerciseId: string) => void;
  finishSession: (id: string) => void;
  discardSession: (id: string) => void;
  deleteSession: (id: string) => void;
  loadSample: () => void;
  resetAll: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setData({ ...EMPTY, ...(JSON.parse(raw) as AppData) });
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, [data]);

  const exercises = useMemo(() => [...CATALOG, ...data.customExercises], [data.customExercises]);
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const exerciseById = useCallback((id: string) => byId.get(id), [byId]);
  const activePlan = data.plans.find((p) => p.id === data.activePlanId) ?? null;
  const activeSession = data.sessions.find((s) => s.finishedAt == null) ?? null;

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), []);

  const store: Store = {
    ready,
    data,
    exercises,
    exerciseById,
    activePlan,
    activeSession,
    setUnit: (unit) => update((d) => ({ ...d, unit })),
    addCustomExercise: (e) => {
      const ex: Exercise = { ...e, id: `custom-${newId()}`, custom: true };
      update((d) => ({ ...d, customExercises: [...d.customExercises, ex] }));
      return ex;
    },
    saveTemplate: (t) =>
      update((d) => ({
        ...d,
        templates: d.templates.some((x) => x.id === t.id)
          ? d.templates.map((x) => (x.id === t.id ? t : x))
          : [...d.templates, t],
      })),
    deleteTemplate: (id) =>
      update((d) => ({
        ...d,
        templates: d.templates.filter((t) => t.id !== id),
        plans: d.plans.map((p) => ({ ...p, days: p.days.map((x) => (x === id ? null : x)) })),
      })),
    savePlan: (p) =>
      update((d) => ({
        ...d,
        plans: d.plans.some((x) => x.id === p.id) ? d.plans.map((x) => (x.id === p.id ? p : x)) : [...d.plans, p],
        activePlanId: d.activePlanId ?? p.id,
      })),
    deletePlan: (id) =>
      update((d) => ({
        ...d,
        plans: d.plans.filter((p) => p.id !== id),
        activePlanId: d.activePlanId === id ? null : d.activePlanId,
      })),
    setActivePlan: (id) => update((d) => ({ ...d, activePlanId: id })),
    startSession: (templateId, date = today()) => {
      if (activeSession) return activeSession;
      const template = data.templates.find((t) => t.id === templateId) ?? null;
      const session: Session = {
        id: newId(),
        date,
        startedAt: Date.now(),
        finishedAt: null,
        templateId: template?.id ?? null,
        name: template?.name ?? 'Quick workout',
        entries: template ? template.exercises.map(entryFromTarget) : [],
        ...planLink(activePlan, template?.id ?? null, date),
        progression: activePlan?.progression ?? 'double',
      };
      update((d) => ({ ...d, sessions: [...d.sessions, session] }));
      return session;
    },
    setSessionDate: (id, date) =>
      update((d) => {
        const plan = d.plans.find((p) => p.id === d.activePlanId) ?? null;
        return {
          ...d,
          sessions: d.sessions.map((s) => {
            if (s.id !== id || s.date === date) return s;
            // Keep a link to a plan that isn't active any more unless the new date moves it off that plan's schedule.
            const linked = d.plans.find((p) => p.id === s.planId) ?? plan;
            return { ...s, date, ...planLink(linked, s.templateId, date) };
          }),
        };
      }),
    updateSession: (id, fn) =>
      update((d) => ({ ...d, sessions: d.sessions.map((s) => (s.id === id ? fn(s) : s)) })),
    addExerciseToSession: (sessionId, exerciseId) =>
      update((d) => ({
        ...d,
        sessions: d.sessions.map((s) =>
          s.id === sessionId ? { ...s, entries: [...s.entries, entryFromTarget({ exerciseId, ...DEFAULT_TARGET })] } : s,
        ),
      })),
    finishSession: (id) =>
      update((d) => ({
        ...d,
        sessions: d.sessions.map((s) =>
          s.id === id
            ? {
                ...s,
                finishedAt: Date.now(),
                // Drop sets that were never logged so they don't show up as history.
                entries: s.entries
                  .map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) }))
                  .filter((e) => e.sets.length > 0),
              }
            : s,
        ),
      })),
    discardSession: (id) => update((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) })),
    deleteSession: (id) => update((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) })),
    loadSample: () =>
      update((d) => {
        const sample = buildSampleData(today());
        return {
          ...d,
          templates: [...d.templates.filter((t) => !sample.templates.some((s) => s.id === t.id)), ...sample.templates],
          plans: [...d.plans.filter((p) => !sample.plans.some((s) => s.id === p.id)), ...sample.plans],
          activePlanId: sample.activePlanId,
          sessions: [...d.sessions.filter((s) => !s.id.startsWith('sample-')), ...sample.sessions],
        };
      }),
    resetAll: () => update((d) => ({ ...EMPTY, unit: d.unit })),
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
