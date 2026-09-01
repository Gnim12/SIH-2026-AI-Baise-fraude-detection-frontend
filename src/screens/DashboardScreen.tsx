import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboardSummary } from '../api/dashboard';
import { DashboardControls } from '../components/dashboard/DashboardControls';
import { DecisionPatternsSection } from '../components/dashboard/DecisionPatternsSection';
import { FraudSignalsSection } from '../components/dashboard/FraudSignalsSection';
import { OperationalSection } from '../components/dashboard/OperationalSection';
import { defaultDashboardRange } from '../lib/time';
import { useAuthStore } from '../store/authStore';
import type { DashboardScope, DashboardSummary } from '../types/dashboard';

/** New route (§1): a reporting screen reviewed after the fact, not the live
 *  screening instrument -- FRONTEND_BRIEF.md §10's "no chart library" rule
 *  was written for LaneScreen specifically and does not apply here (see
 *  DashboardScreen's charts, all built on recharts).
 *
 *  Role gating happens in two independent places on purpose:
 *  - Here: `isAdmin` decides whether DashboardControls even renders the
 *    scope/officer/lane markup, and `scope` is hard-pinned to 'me' for a
 *    non-admin regardless of any stale state -- a UX nicety.
 *  - The REAL boundary is the backend: GET /api/v1/dashboard/summary
 *    403s a non-admin's scope=all request no matter what the client sends
 *    (backend/app/api/dashboard.py's require_admin). See
 *    DashboardScreen.test.tsx's access-control test for why that
 *    distinction is asserted directly, not assumed. */
export function DashboardScreen() {
  const officer = useAuthStore((s) => s.officer);
  const isAdmin = officer?.role === 'admin';

  const initialRange = defaultDashboardRange();
  const [scope, setScope] = useState<DashboardScope>('me');
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);
  const [officerId, setOfficerId] = useState('');
  const [laneId, setLaneId] = useState('');

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<'forbidden' | 'other' | null>(null);
  const [loading, setLoading] = useState(true);

  // A non-admin's scope/filters can never take effect even if left over
  // from a prior admin session in the same tab (role can change between
  // logins) -- effectiveScope, not `scope` itself, is what's ever sent.
  const effectiveScope: DashboardScope = isAdmin ? scope : 'me';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDashboardSummary({
      scope: effectiveScope,
      fromDate,
      toDate,
      officerId: effectiveScope === 'all' ? officerId || undefined : undefined,
      laneId: effectiveScope === 'all' ? laneId || undefined : undefined,
    })
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error && err.message === 'FORBIDDEN' ? 'forbidden' : 'other');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveScope, fromDate, toDate, officerId, laneId]);

  function handleDateRangeChange(nextFrom: string, nextTo: string) {
    setFromDate(nextFrom);
    setToDate(nextTo);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-shell-700 px-4 py-2">
        <h1 className="text-eyebrow">Dashboard</h1>
        <Link to="/" className="ml-auto rounded border border-shell-600 px-2 py-1 text-scale-3 text-steel-200 hover:bg-shell-700">
          Back to lane
        </Link>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="flex flex-col gap-4">
          <DashboardControls
            isAdmin={isAdmin}
            scope={effectiveScope}
            onScopeChange={setScope}
            fromDate={fromDate}
            toDate={toDate}
            onDateRangeChange={handleDateRangeChange}
            filterOptions={summary?.filterOptions}
            officerId={officerId}
            laneId={laneId}
            onOfficerChange={setOfficerId}
            onLaneChange={setLaneId}
          />

          {loading && <p className="px-2 py-8 text-center text-scale-3 text-steel-400">Loading…</p>}

          {!loading && error === 'forbidden' && (
            <p className="px-2 py-8 text-center text-scale-3 text-hold">
              You don&apos;t have access to this view.
            </p>
          )}
          {!loading && error === 'other' && (
            <p className="px-2 py-8 text-center text-scale-3 text-hold">Could not load the dashboard.</p>
          )}

          {!loading && !error && summary && summary.totalSessions === 0 && (
            <p className="px-2 py-8 text-center text-scale-3 text-steel-400">No data in this range.</p>
          )}

          {!loading && !error && summary && summary.totalSessions > 0 && (
            <>
              <div className="flex items-center gap-2 text-scale-2 text-steel-400">
                <span className="text-eyebrow text-steel-300">Total sessions</span>
                <span className="font-mono text-steel-200">{summary.totalSessions}</span>
                <span>
                  {summary.fromDate} — {summary.toDate}
                </span>
              </div>
              <DecisionPatternsSection patterns={summary.decisionPatterns} />
              <OperationalSection operational={summary.operational} />
              <FraudSignalsSection fraud={summary.fraudSignals} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
