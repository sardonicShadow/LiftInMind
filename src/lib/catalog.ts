import type { Equipment, Exercise, Muscle } from './types';

type Row = [name: string, equipment: Equipment, muscle: Muscle];

const ROWS: Row[] = [
  // Chest
  ['Bench Press', 'barbell', 'Chest'],
  ['Incline Bench Press', 'barbell', 'Chest'],
  ['Decline Bench Press', 'barbell', 'Chest'],
  ['Close-Grip Bench Press', 'barbell', 'Triceps'],
  ['Dumbbell Bench Press', 'dumbbell', 'Chest'],
  ['Incline Dumbbell Press', 'dumbbell', 'Chest'],
  ['Dumbbell Fly', 'dumbbell', 'Chest'],
  ['Chest Press (machine)', 'machine', 'Chest'],
  ['Incline Chest Press (machine)', 'machine', 'Chest'],
  ['Pec Deck', 'machine', 'Chest'],
  ['Smith Machine Bench Press', 'machine', 'Chest'],
  ['Cable Fly', 'cable', 'Chest'],
  ['Low-to-High Cable Fly', 'cable', 'Chest'],
  ['Push-Up', 'bodyweight', 'Chest'],
  ['Weighted Dips', 'bodyweight', 'Chest'],
  // Back
  ['Deadlift', 'barbell', 'Back'],
  ['Barbell Row', 'barbell', 'Back'],
  ['Pendlay Row', 'barbell', 'Back'],
  ['T-Bar Row (plate loaded)', 'machine', 'Back'],
  ['One-Arm Dumbbell Row', 'dumbbell', 'Back'],
  ['Chest-Supported Dumbbell Row', 'dumbbell', 'Back'],
  ['Dumbbell Pullover', 'dumbbell', 'Back'],
  ['Lat Pulldown', 'cable', 'Back'],
  ['Close-Grip Lat Pulldown', 'cable', 'Back'],
  ['Seated Cable Row', 'cable', 'Back'],
  ['Straight-Arm Pulldown', 'cable', 'Back'],
  ['Chest-Supported Row (machine)', 'machine', 'Back'],
  ['Lat Pulldown (machine)', 'machine', 'Back'],
  ['Assisted Pull-Up (machine)', 'machine', 'Back'],
  ['Back Extension', 'machine', 'Back'],
  ['Pull-Up', 'bodyweight', 'Back'],
  ['Chin-Up', 'bodyweight', 'Back'],
  ['Inverted Row', 'bodyweight', 'Back'],
  ['Kettlebell Swing', 'kettlebell', 'Back'],
  // Shoulders
  ['Overhead Press', 'barbell', 'Shoulders'],
  ['Push Press', 'barbell', 'Shoulders'],
  ['Seated Dumbbell Press', 'dumbbell', 'Shoulders'],
  ['Arnold Press', 'dumbbell', 'Shoulders'],
  ['Lateral Raise', 'dumbbell', 'Shoulders'],
  ['Front Raise', 'dumbbell', 'Shoulders'],
  ['Rear Delt Fly', 'dumbbell', 'Shoulders'],
  ['Shoulder Press (machine)', 'machine', 'Shoulders'],
  ['Lateral Raise (machine)', 'machine', 'Shoulders'],
  ['Reverse Pec Deck', 'machine', 'Shoulders'],
  ['Cable Lateral Raise', 'cable', 'Shoulders'],
  ['Face Pull', 'cable', 'Shoulders'],
  ['Upright Row', 'barbell', 'Shoulders'],
  ['Barbell Shrug', 'barbell', 'Shoulders'],
  ['Dumbbell Shrug', 'dumbbell', 'Shoulders'],
  ['Kettlebell Press', 'kettlebell', 'Shoulders'],
  // Biceps
  ['Barbell Curl', 'barbell', 'Biceps'],
  ['EZ-Bar Curl', 'barbell', 'Biceps'],
  ['Preacher Curl', 'barbell', 'Biceps'],
  ['Dumbbell Curl', 'dumbbell', 'Biceps'],
  ['Hammer Curl', 'dumbbell', 'Biceps'],
  ['Incline Dumbbell Curl', 'dumbbell', 'Biceps'],
  ['Concentration Curl', 'dumbbell', 'Biceps'],
  ['Cable Curl', 'cable', 'Biceps'],
  ['Bicep Curl (machine)', 'machine', 'Biceps'],
  // Triceps
  ['Triceps Pushdown', 'cable', 'Triceps'],
  ['Overhead Cable Extension', 'cable', 'Triceps'],
  ['Skull Crusher', 'barbell', 'Triceps'],
  ['Overhead Dumbbell Extension', 'dumbbell', 'Triceps'],
  ['Dumbbell Kickback', 'dumbbell', 'Triceps'],
  ['Triceps Extension (machine)', 'machine', 'Triceps'],
  ['Dip (machine)', 'machine', 'Triceps'],
  ['Bench Dip', 'bodyweight', 'Triceps'],
  // Quads
  ['Back Squat', 'barbell', 'Quads'],
  ['Front Squat', 'barbell', 'Quads'],
  ['Barbell Lunge', 'barbell', 'Quads'],
  ['Goblet Squat', 'dumbbell', 'Quads'],
  ['Bulgarian Split Squat', 'dumbbell', 'Quads'],
  ['Dumbbell Walking Lunge', 'dumbbell', 'Quads'],
  ['Dumbbell Step-Up', 'dumbbell', 'Quads'],
  ['Leg Press', 'machine', 'Quads'],
  ['Hack Squat', 'machine', 'Quads'],
  ['Leg Extension', 'machine', 'Quads'],
  ['Smith Machine Squat', 'machine', 'Quads'],
  ['Pendulum Squat', 'machine', 'Quads'],
  ['Kettlebell Goblet Squat', 'kettlebell', 'Quads'],
  ['Bodyweight Squat', 'bodyweight', 'Quads'],
  // Hamstrings
  ['Romanian Deadlift', 'barbell', 'Hamstrings'],
  ['Stiff-Leg Deadlift', 'barbell', 'Hamstrings'],
  ['Good Morning', 'barbell', 'Hamstrings'],
  ['Dumbbell Romanian Deadlift', 'dumbbell', 'Hamstrings'],
  ['Seated Leg Curl', 'machine', 'Hamstrings'],
  ['Lying Leg Curl', 'machine', 'Hamstrings'],
  ['Nordic Curl', 'bodyweight', 'Hamstrings'],
  // Glutes
  ['Hip Thrust', 'barbell', 'Glutes'],
  ['Glute Bridge', 'barbell', 'Glutes'],
  ['Hip Thrust (machine)', 'machine', 'Glutes'],
  ['Hip Abduction', 'machine', 'Glutes'],
  ['Hip Adduction', 'machine', 'Glutes'],
  ['Cable Kickback', 'cable', 'Glutes'],
  ['Sumo Deadlift', 'barbell', 'Glutes'],
  // Calves
  ['Standing Calf Raise (machine)', 'machine', 'Calves'],
  ['Seated Calf Raise', 'machine', 'Calves'],
  ['Calf Press (leg press)', 'machine', 'Calves'],
  ['Dumbbell Calf Raise', 'dumbbell', 'Calves'],
  // Core
  ['Cable Crunch', 'cable', 'Core'],
  ['Pallof Press', 'cable', 'Core'],
  ['Ab Crunch (machine)', 'machine', 'Core'],
  ['Hanging Leg Raise', 'bodyweight', 'Core'],
  ['Plank', 'bodyweight', 'Core'],
  ['Ab Wheel Rollout', 'bodyweight', 'Core'],
  ['Russian Twist', 'dumbbell', 'Core'],
  ['Kettlebell Turkish Get-Up', 'kettlebell', 'Core'],
  // Forearms
  ['Wrist Curl', 'dumbbell', 'Forearms'],
  ["Farmer's Carry", 'dumbbell', 'Forearms'],
];

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const CATALOG: Exercise[] = ROWS.map(([name, equipment, muscle]) => ({
  id: slugify(name),
  name,
  equipment,
  muscle,
}));

export const MUSCLES: Muscle[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
  'Forearms',
];

export type EquipmentFilter = 'all' | 'machines' | 'free' | 'cable' | 'bodyweight';

export const EQUIPMENT_FILTERS: { key: EquipmentFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'machines', label: 'Machines' },
  { key: 'free', label: 'Free weights' },
  { key: 'cable', label: 'Cable' },
  { key: 'bodyweight', label: 'Bodyweight' },
];

export function matchesEquipment(e: Exercise, f: EquipmentFilter): boolean {
  switch (f) {
    case 'all':
      return true;
    case 'machines':
      return e.equipment === 'machine';
    case 'free':
      return e.equipment === 'barbell' || e.equipment === 'dumbbell' || e.equipment === 'kettlebell';
    case 'cable':
      return e.equipment === 'cable';
    case 'bodyweight':
      return e.equipment === 'bodyweight';
  }
}

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  kettlebell: 'Kettlebell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
};

export const EQUIPMENT_BADGE: Record<Equipment, string> = {
  barbell: 'BB',
  dumbbell: 'DB',
  kettlebell: 'KB',
  machine: 'MCH',
  cable: 'CBL',
  bodyweight: 'BW',
};

/**
 * Loose search: every word in the query must prefix-match some word of the
 * name, so "lat pull" finds "Lat Pulldown" and "db row" finds "Dumbbell Row".
 */
export function searchMatches(e: Exercise, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const aliases: Record<string, string> = { db: 'dumbbell', bb: 'barbell', kb: 'kettlebell', ohp: 'overhead' };
  const words = `${e.name} ${EQUIPMENT_LABEL[e.equipment]} ${e.muscle}`.toLowerCase().split(/[^a-z0-9]+/);
  return q
    .split(/\s+/)
    .map((t) => aliases[t] ?? t)
    .every((t) => words.some((w) => w.startsWith(t)));
}
