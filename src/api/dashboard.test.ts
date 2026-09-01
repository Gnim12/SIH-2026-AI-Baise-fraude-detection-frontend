import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchDashboardSummary } from './dashboard';

/** This module is a pure passthrough — it builds the query string and
 *  returns whatever the server sends back, with no client-side gating of
 *  its own. That's deliberate: DashboardScreen decides what scope a human
 *  can reach through the UI, but the real access-control boundary is the
 *  backend (backend/app/auth/dependencies.py's require_admin, exercised
 *  end-to-end by backend/tests/api/test_dashboard_api.py's
 *  test_scope_all_as_non_admin_returns_403). Asserting that THIS function
 *  sends scope=all through untouched, with no early return / thrown
 *  error / silent downgrade to 'me', is what makes that distinction
 *  concrete on the frontend side: if the backend ever stopped enforcing
 *  it, nothing here would catch the gap either. */
describe('fetchDashboardSummary', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends scope=all through untouched -- this layer performs no access control of its own', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ scope: 'all', fromDate: '2026-08-01', toDate: '2026-08-31', totalSessions: 0 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchDashboardSummary({
      scope: 'all',
      fromDate: '2026-08-01',
      toDate: '2026-08-31',
      officerId: 'OFF-3310',
      laneId: 'IGI-T3-LANE-02',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('scope=all');
    expect(url).toContain('officer_id=OFF-3310');
    expect(url).toContain('lane_id=IGI-T3-LANE-02');
    expect(init).toMatchObject({ credentials: 'include' });
  });

  it('surfaces a 403 as a distinct, recognisable error rather than swallowing it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) }));

    await expect(
      fetchDashboardSummary({ scope: 'all', fromDate: '2026-08-01', toDate: '2026-08-31' }),
    ).rejects.toThrow('FORBIDDEN');
  });
});
