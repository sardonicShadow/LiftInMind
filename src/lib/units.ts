import type { Unit } from './types';

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
