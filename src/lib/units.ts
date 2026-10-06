import type { SetValue, Unit } from './types';

const LB_PER_KG = 2.20462;

/** Stored weights are always lb; this converts for display in the chosen unit. */
export function toDisplay(lb: number, unit: Unit): number {
  if (unit === 'lb') return Math.round(lb * 10) / 10;
  return Math.round((lb / LB_PER_KG) * 2) / 2;
}

export function fromDisplay(value: number, unit: Unit): number {
  return unit === 'lb' ? value : Math.round(value * LB_PER_KG * 100) / 100;
}

export function formatNumber(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return rounded.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

export function formatWeight(lb: number, unit: Unit): string {
  return `${formatNumber(toDisplay(lb, unit))} ${unit}`;
}

/** Volume is rounded to whole units. */
export function formatVolume(lb: number, unit: Unit): string {
  const v = unit === 'lb' ? lb : lb / LB_PER_KG;
  return `${Math.round(v).toLocaleString('en-US')} ${unit}`;
}

/** "135 lb × 10 · 10 · 9" when every set used the same weight, otherwise "135×10 · 125×12". */
export function formatSets(sets: SetValue[], unit: Unit): string {
  if (sets.length === 0) return '';
  return sets.every((s) => toDisplay(s.weight, unit) === toDisplay(sets[0].weight, unit))
    ? `${formatWeight(sets[0].weight, unit)} × ${sets.map((s) => s.reps).join(' · ')}`
    : sets.map((s) => `${formatNumber(toDisplay(s.weight, unit))}×${s.reps}`).join(' · ');
}
