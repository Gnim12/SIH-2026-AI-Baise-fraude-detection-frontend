import { describe, expect, it } from 'vitest';
import { formatHoursAgo, hoursSince, stalenessBand } from './time';

describe('stalenessBand', () => {
  it('is fresh under 12h', () => {
    expect(stalenessBand(2)).toBe('fresh');
  });

  it('lands fresh exactly at the 12h boundary (only values above 12h escalate)', () => {
    expect(stalenessBand(12)).toBe('fresh');
  });

  it('is stale between 12h and 24h', () => {
    expect(stalenessBand(18)).toBe('stale');
  });

  it('lands stale exactly at the 24h boundary (only values above 24h escalate)', () => {
    expect(stalenessBand(24)).toBe('stale');
  });

  it('is expired above 24h', () => {
    expect(stalenessBand(30)).toBe('expired');
  });
});

describe('hoursSince', () => {
  it('computes elapsed hours between two timestamps', () => {
    const now = new Date('2026-08-27T12:00:00Z');
    expect(hoursSince('2026-08-27T08:00:00Z', now)).toBeCloseTo(4);
  });
});

describe('formatHoursAgo', () => {
  it('rounds and appends the unit', () => {
    expect(formatHoursAgo(4.4)).toBe('4h ago');
    expect(formatHoursAgo(4.6)).toBe('5h ago');
  });
});
