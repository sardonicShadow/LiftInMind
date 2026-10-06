import { describe, expect, it } from 'vitest';

import { buildSampleData } from './demo';
import { monthlyReport } from './logic';

describe('sample data', () => {
  const data = buildSampleData('2026-10-06');

  it('logs history up to yesterday on the plan days', () => {
    expect(data.sessions.length).toBeGreaterThan(25);
    expect(data.sessions.every((s) => s.date < '2026-10-06')).toBe(true);
  });

  it('shows mostly progress in the last full month, with the stuck lift flagged', () => {
    const r = monthlyReport(data.sessions, '2026-09', data.plans[0]);
    const judged = r.exercises.length - r.counts.insufficient;
    expect(r.counts.progressed / judged).toBeGreaterThan(0.6);
    expect(r.exercises.find((e) => e.exerciseId === 'shoulder-press-machine')?.stall).toBe(true);
  });
});
