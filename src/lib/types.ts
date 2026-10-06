export type Equipment = 'barbell' | 'dumbbell' | 'kettlebell' | 'machine' | 'cable' | 'bodyweight';

export type Muscle =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Quads'
  | 'Hamstrings'
  | 'Glutes'
  | 'Calves'
  | 'Core'
  | 'Forearms';

export interface Exercise {
  id: string;
  name: string;
  equipment: Equipment;
  muscle: Muscle;
  custom?: boolean;
}

export type ProgressionStyle = 'double' | 'linear';

export interface TemplateExercise {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSec: number;
  /** Overrides the plan's progression style for this exercise. */
  progression?: ProgressionStyle;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: TemplateExercise[];
}

export interface Plan {
  id: string;
  name: string;
  weeks: number;
  /** ISO date (yyyy-mm-dd) of the Monday the plan starts on. */
  startDate: string;
  /** Seven entries, Monday to Sunday: a template id, or null for rest. */
  days: (string | null)[];
  /** Every Nth week is a deload week; null for none. */
  deloadEvery: number | null;
  progression: ProgressionStyle;
}

export type SetKind = 'warmup' | 'working';

export interface LoggedSet {
  /** Weight in lb; null until the set is logged. */
  weight: number | null;
  reps: number | null;
  kind: SetKind;
  done: boolean;
}

export interface SessionEntry {
  exerciseId: string;
  sets: LoggedSet[];
  /** Targets copied from the template when the session started. */
  target?: TemplateExercise;
}

export interface Session {
  id: string;
  /** ISO date (yyyy-mm-dd) the session counts towards. */
  date: string;
  startedAt: number;
  finishedAt: number | null;
  templateId: string | null;
  planId: string | null;
  name: string;
  entries: SessionEntry[];
  deload: boolean;
  progression: ProgressionStyle;
  note?: string;
}

export type Unit = 'lb' | 'kg';

export interface AppData {
  version: 1;
  unit: Unit;
  customExercises: Exercise[];
  templates: WorkoutTemplate[];
  plans: Plan[];
  activePlanId: string | null;
  sessions: Session[];
}

export interface SetValue {
  weight: number;
  reps: number;
}
