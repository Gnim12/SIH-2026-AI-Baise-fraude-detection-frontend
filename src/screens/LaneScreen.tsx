import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCases, startScreening, submitDecision, type CaseSummary } from '../api/client';
import {
  connectScreeningSocket,
  type ConnectionState,
  type ScreeningSocket,
} from '../api/socket';
import { useSessionStore } from '../store/sessionStore';
import { DecisionBar } from '../components/verdict/DecisionBar';
import { ScreeningView } from './ScreeningView';

const DEFAULT_CASE_ID = 'case-01-genuine';

interface LaneScreenProps {
  onConnectionStateChange?: (state: ConnectionState) => void;
}

/** The main screening view (§5.1). Case picker + live WS wiring + the
 *  editable DecisionBar live here; the evidence-panel tree itself is
 *  shared with SessionDetail via ScreeningView (§5.5). */
export function LaneScreen({ onConnectionStateChange }: LaneScreenProps) {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [caseId, setCaseId] = useState(DEFAULT_CASE_ID);
  /** Bumped after a decision is sealed to force a fresh session even when
   *  the officer re-selects the same case — "navigate to a clean lane
   *  ready for the next traveller" (§5.4) without changing what case is
   *  loaded, since there's no real traveller queue in this mock harness. */
  const [epoch, setEpoch] = useState(0);
  const session = useSessionStore((s) => s.session);
  const stagesSeen = useSessionStore((s) => s.stagesSeen);
  const applyEvent = useSessionStore((s) => s.applyEvent);
  const sealSession = useSessionStore((s) => s.sealSession);
  const reset = useSessionStore((s) => s.reset);
  const socketRef = useRef<ScreeningSocket | null>(null);

  useEffect(() => {
    fetchCases()
      .then(setCases)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    socketRef.current?.close();
    reset();

    startScreening(caseId)
      .then(({ sessionId }) => {
        if (cancelled) return;
        socketRef.current = connectScreeningSocket({
          sessionId,
          onEvent: applyEvent,
          onStatusChange: (status) => onConnectionStateChange?.(status),
        });
      })
      .catch(() => onConnectionStateChange?.('offline'));

    return () => {
      cancelled = true;
      socketRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, epoch]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-shell-700 px-4 py-2">
        <label className="text-scale-2 text-steel-400" htmlFor="case-picker">
          case
        </label>
        <select
          id="case-picker"
          value={caseId}
          onChange={(e) => setCaseId(e.target.value)}
          className="rounded border border-shell-600 bg-shell-800 px-2 py-1 text-scale-3 text-steel-200"
        >
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <Link
          to="/history"
          className="ml-auto rounded border border-shell-600 px-2 py-1 text-scale-3 text-steel-200 hover:bg-shell-700"
        >
          History
        </Link>
      </div>

      <ScreeningView
        session={session}
        stagesSeen={stagesSeen}
        footer={
          <DecisionBar
            systemBand={session?.band ?? null}
            onSubmit={(decision, note, override) => {
              if (!session) return;
              sealSession(decision, note, override);
              submitDecision(session, decision, note, override).catch(() => {});
              setEpoch((e) => e + 1);
            }}
          />
        }
      />
    </div>
  );
}
