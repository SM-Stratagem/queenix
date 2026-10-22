import { describe, expect, it } from 'vitest';
import { deriveStatus } from '../../apps/mobile/components/trainer-today/format';

const T0 = Date.UTC(2026, 9, 22, 10, 0); // session start
const MIN = 60_000;

describe('trainer Today session status', () => {
  it('terminal DB status wins over the clock', () => {
    expect(deriveStatus(T0, 60, 'completed', false, T0 - MIN)).toBe('completed');
    expect(deriveStatus(T0, 60, 'cancelled', false, T0 + 120 * MIN)).toBe('cancelled');
    expect(deriveStatus(T0, 60, 'no_show', true, T0 + 10 * MIN)).toBe('no_show');
  });
  it('scheduled: upcoming → active (started or in window) → overdue, never auto-completed', () => {
    expect(deriveStatus(T0, 60, 'scheduled', false, T0 - MIN)).toBe('upcoming');
    expect(deriveStatus(T0, 60, 'scheduled', true, T0 - MIN)).toBe('active');
    expect(deriveStatus(T0, 60, 'scheduled', false, T0 + 30 * MIN)).toBe('active');
    expect(deriveStatus(T0, 60, 'scheduled', false, T0 + 60 * MIN)).toBe('overdue');
  });
});
