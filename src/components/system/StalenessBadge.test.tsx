import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StalenessBadge } from './StalenessBadge';

const NOW = new Date('2026-08-27T12:00:00Z');

function syncedHoursAgo(hours: number): string {
  return new Date(NOW.getTime() - hours * 60 * 60 * 1000).toISOString();
}

describe('StalenessBadge', () => {
  it('renders neutral (no warning glyph) at 2h, well under 12h', () => {
    const { container } = render(<StalenessBadge lastSyncedAt={syncedHoursAgo(2)} now={NOW} />);
    expect(screen.getByText('watchlist synced 2h ago')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/⚠/);
    expect(container.querySelector('span')?.className).toContain('text-steel-400');
  });

  it('lands neutral exactly at the 12h boundary', () => {
    const { container } = render(<StalenessBadge lastSyncedAt={syncedHoursAgo(12)} now={NOW} />);
    expect(container.textContent).not.toMatch(/⚠/);
    expect(container.querySelector('span')?.className).toContain('text-steel-400');
  });

  it('renders --secondary with a warning glyph at 18h (12-24h band)', () => {
    const { container } = render(<StalenessBadge lastSyncedAt={syncedHoursAgo(18)} now={NOW} />);
    expect(screen.getByText('⚠')).toBeInTheDocument();
    expect(container.querySelector('span')?.className).toContain('text-secondary');
  });

  it('lands --secondary exactly at the 24h boundary', () => {
    const { container } = render(<StalenessBadge lastSyncedAt={syncedHoursAgo(24)} now={NOW} />);
    expect(container.querySelector('span')?.className).toContain('text-secondary');
    expect(container.querySelector('span')?.className).not.toContain('text-hold');
  });

  it('renders --hold above 24h', () => {
    const { container } = render(<StalenessBadge lastSyncedAt={syncedHoursAgo(30)} now={NOW} />);
    expect(container.querySelector('span')?.className).toContain('text-hold');
  });
});
