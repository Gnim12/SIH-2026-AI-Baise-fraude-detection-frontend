import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchHistory } from '../api/client';
import { formatTimestamp } from '../lib/time';
import type { ScreeningSession } from '../types/screening';

const BAND_COLOR_CLASS: Record<string, string> = {
  CLEAR: 'text-clear',
  SECONDARY: 'text-secondary',
  HOLD: 'text-hold',
  ABSTAIN: 'text-abstain',
  RECAPTURE: 'text-recapture',
};

const DECISION_LABEL: Record<string, string> = {
  CLEAR: 'Clear',
  SECONDARY: 'Secondary',
  HOLD: 'Hold',
  REFER: 'Refer',
};

/** §5.5: "table of this shift's sealed sessions — time, document, system
 *  band, officer decision, override flag. Filter by override only. This is
 *  where a supervisor looks." Backed by GET /api/v1/history, which returns
 *  whatever this dev session has actually sealed via DecisionBar plus a
 *  handful of fixtures the mock server seeds pre-sealed on startup (§6) —
 *  real sealed-session data, not fixtures dressed up as history. */
export function HistoryScreen() {
  const [sessions, setSessions] = useState<ScreeningSession[] | null>(null);
  const [error, setError] = useState(false);
  const [overrideOnly, setOverrideOnly] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    fetchHistory()
      .then((data) => {
        if (!cancelled) setSessions(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = (sessions ?? []).filter((s) => !overrideOnly || s.officerDecision?.override);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-shell-700 px-4 py-2">
        <h1 className="text-eyebrow">History</h1>
        <Link to="/" className="ml-auto rounded border border-shell-600 px-2 py-1 text-scale-3 text-steel-200 hover:bg-shell-700">
          Back to lane
        </Link>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <label className="mb-3 flex w-fit items-center gap-2 text-scale-3 text-steel-200">
          <input
            type="checkbox"
            checked={overrideOnly}
            onChange={(e) => setOverrideOnly(e.target.checked)}
          />
          Override only
        </label>

        {error && <p className="text-scale-3 text-hold">Could not load history.</p>}
        {!error && sessions === null && <p className="text-scale-3 text-steel-400">Loading…</p>}
        {!error && sessions !== null && rows.length === 0 && (
          <p className="text-scale-3 text-steel-400">
            {overrideOnly ? 'No overridden sessions this shift.' : 'No sealed sessions yet.'}
          </p>
        )}

        {rows.length > 0 && (
          <table className="w-full min-w-[720px] border-collapse text-scale-3">
            <thead>
              <tr className="border-b border-shell-600 text-left text-steel-400">
                <th className="py-2 pr-4 font-normal">Time</th>
                <th className="py-2 pr-4 font-normal">Document</th>
                <th className="py-2 pr-4 font-normal">System band</th>
                <th className="py-2 pr-4 font-normal">Officer decision</th>
                <th className="py-2 pr-4 font-normal">Override</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((session) => {
                const decision = session.officerDecision;
                const docType = session.documents[0]?.type ?? 'UNKNOWN';
                const href = `/history/${encodeURIComponent(session.sessionId)}`;
                return (
                  <tr
                    key={session.sessionId}
                    onClick={() => navigate(href)}
                    className="cursor-pointer border-b border-shell-700 hover:bg-shell-800"
                  >
                    <td className="py-2 pr-4">
                      <Link to={href} className="font-mono text-steel-200 hover:underline">
                        {decision ? formatTimestamp(decision.decidedAt) : '—'}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-steel-200">{docType}</td>
                    <td className={`py-2 pr-4 ${session.band ? BAND_COLOR_CLASS[session.band] : 'text-steel-400'}`}>
                      {session.band ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-steel-200">
                      {decision ? DECISION_LABEL[decision.decision] ?? decision.decision : '—'}
                    </td>
                    <td className="py-2 pr-4">
                      {decision?.override ? (
                        <span className="rounded bg-hold/20 px-1.5 py-0.5 text-scale-1 text-hold">override</span>
                      ) : (
                        <span className="text-steel-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
