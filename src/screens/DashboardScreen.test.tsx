import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../store/authStore';
import type { DashboardSummary } from '../types/dashboard';

const fetchDashboardSummary = vi.fn();
vi.mock('../api/dashboard', () => ({
  fetchDashboardSummary: (...args: unknown[]) => fetchDashboardSummary(...args),
}));

function summary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    scope: 'me',
    fromDate: '2026-08-01',
    toDate: '2026-08-31',
    totalSessions: 5,
    decisionPatterns: {
      systemBandByDay: [{ date: '2026-08-15', counts: { CLEAR: 5 } }],
      officerDecisionByDay: [{ date: '2026-08-15', counts: { CLEAR: 5 } }],
      overrideRatePct: 0,
      overridesByDay: [{ date: '2026-08-15', total: 5, overrides: 0, overrideRatePct: 0 }],
    },
    operational: {
      sessionsByDay: [{ date: '2026-08-15', count: 5 }],
      latency: { p50Ms: 1000, p95Ms: 2000, sampleSize: 5 },
      coverageFlagFrequency: [],
    },
    fraudSignals: { topSignalCodes: [], sessionsWithConvergenceGroup: 0, sessionsWithConvergenceGroupPct: 0 },
    ...overrides,
  };
}

function loginAs(role: string) {
  useAuthStore.getState().setOfficer({ id: 1, officerId: 'OFF-2291', name: 'Test Officer', role });
}

beforeEach(() => {
  fetchDashboardSummary.mockReset();
  useAuthStore.setState({ officer: null, status: 'checking' });
});

describe('DashboardScreen access control', () => {
  it('a non-admin never sees any scope=all UI -- the controls are absent, not disabled', async () => {
    loginAs('officer');
    fetchDashboardSummary.mockResolvedValue(summary({ scope: 'me' }));

    const { DashboardScreen } = await import('./DashboardScreen');
    render(
      <MemoryRouter>
        <DashboardScreen />
      </MemoryRouter>,
    );

    await waitFor(() => expect(fetchDashboardSummary).toHaveBeenCalled());
    expect(fetchDashboardSummary.mock.calls[0][0]).toMatchObject({ scope: 'me' });

    // Not queryByRole(...).toBeDisabled() -- the group must not exist in
    // the DOM at all (§1: a disabled control still leaks that scope=all
    // exists to someone who can't use it).
    expect(screen.queryByRole('group', { name: 'Scope' })).not.toBeInTheDocument();
    expect(screen.queryByText('Officer')).not.toBeInTheDocument();
    expect(screen.queryByText('Lane')).not.toBeInTheDocument();
    // Explicit timeout, matching src/integration/fixtures.test.ts's own
    // convention: this suite mounts a real recharts render tree (no
    // network involved, but real SVG layout work), which under the full
    // test run's parallel CPU load can exceed vitest's 5000ms default.
  }, 10000);

  it('an admin sees the scope toggle, can switch to scope=all, and filter dropdowns populate from filterOptions', async () => {
    loginAs('admin');
    fetchDashboardSummary
      .mockResolvedValueOnce(summary({ scope: 'me' }))
      .mockResolvedValue(
        summary({
          scope: 'all',
          filterOptions: { officerIds: ['OFF-2291', 'OFF-3310'], laneIds: ['IGI-T3-LANE-01'] },
        }),
      );

    const { DashboardScreen } = await import('./DashboardScreen');
    render(
      <MemoryRouter>
        <DashboardScreen />
      </MemoryRouter>,
    );

    await waitFor(() => expect(fetchDashboardSummary).toHaveBeenCalledTimes(1));
    expect(fetchDashboardSummary.mock.calls[0][0]).toMatchObject({ scope: 'me' });

    const scopeGroup = await screen.findByRole('group', { name: 'Scope' });
    fireEvent.click(within(scopeGroup).getByText('all'));

    await waitFor(() => expect(fetchDashboardSummary).toHaveBeenCalledTimes(2));
    expect(fetchDashboardSummary.mock.calls[1][0]).toMatchObject({ scope: 'all' });

    // filterOptions from the scope=all response populate the dropdowns.
    const officerSelect = await screen.findByRole('combobox', { name: 'Officer' });
    expect(within(officerSelect).getByText('OFF-3310')).toBeInTheDocument();
    const laneSelect = screen.getByRole('combobox', { name: 'Lane' });
    expect(within(laneSelect).getByText('IGI-T3-LANE-01')).toBeInTheDocument();

    fireEvent.change(officerSelect, { target: { value: 'OFF-3310' } });
    await waitFor(() => expect(fetchDashboardSummary).toHaveBeenCalledTimes(3));
    expect(fetchDashboardSummary.mock.calls[2][0]).toMatchObject({ scope: 'all', officerId: 'OFF-3310' });
  }, 10000);
});

describe('DashboardScreen empty state', () => {
  it('renders an honest "no data" message instead of empty/broken charts', async () => {
    loginAs('officer');
    fetchDashboardSummary.mockResolvedValue(summary({ totalSessions: 0 }));

    const { DashboardScreen } = await import('./DashboardScreen');
    render(
      <MemoryRouter>
        <DashboardScreen />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No data in this range.')).toBeInTheDocument();
    expect(screen.queryByText('Decision patterns')).not.toBeInTheDocument();
  }, 10000);
});

describe('DashboardScreen date range', () => {
  it('changing the date range re-fetches with the new params', async () => {
    loginAs('officer');
    fetchDashboardSummary.mockResolvedValue(summary());

    const { DashboardScreen } = await import('./DashboardScreen');
    render(
      <MemoryRouter>
        <DashboardScreen />
      </MemoryRouter>,
    );

    await waitFor(() => expect(fetchDashboardSummary).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-07-01' } });
    await waitFor(() => expect(fetchDashboardSummary).toHaveBeenCalledTimes(2));
    expect(fetchDashboardSummary.mock.calls[1][0]).toMatchObject({ fromDate: '2026-07-01' });

    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-07-31' } });
    await waitFor(() => expect(fetchDashboardSummary).toHaveBeenCalledTimes(3));
    expect(fetchDashboardSummary.mock.calls[2][0]).toMatchObject({ fromDate: '2026-07-01', toDate: '2026-07-31' });
  }, 10000);
});
