import { useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { submitDecision } from '../api/client';
import {
  connectScreeningSocket,
  type ConnectionState,
  type ScreeningSocket,
} from '../api/socket';
import { useSessionStore } from '../store/sessionStore';
import { DecisionBar } from '../components/verdict/DecisionBar';
import { ScreeningView } from './ScreeningView';

interface LaneScreenProps {
  onConnectionStateChange?: (state: ConnectionState) => void;
}

/** The main screening view (§5.1), mounted at /lane/:sessionId. The
 *  session already exists by the time this mounts — created either by
 *  CaptureScreen's real multipart POST or DevFixturePicker's fixture POST
 *  — so this connects the WS directly to the route's sessionId rather than
 *  creating a new session itself. Live WS wiring + the editable
 *  DecisionBar live here; the evidence-panel tree itself is shared with
 *  SessionDetail via ScreeningView (§5.5). */
export function LaneScreen({ onConnectionStateChange }: LaneScreenProps) {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const session = useSessionStore((s) => s.session);
  const stagesSeen = useSessionStore((s) => s.stagesSeen);
  const applyEvent = useSessionStore((s) => s.applyEvent);
  const sealSession = useSessionStore((s) => s.sealSession);
  const reset = useSessionStore((s) => s.reset);
  const socketRef = useRef<ScreeningSocket | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    socketRef.current?.close();
    reset();

    socketRef.current = connectScreeningSocket({
      sessionId,
      onEvent: applyEvent,
      onStatusChange: (status) => onConnectionStateChange?.(status),
    });

    return () => {
      socketRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-shell-700 px-4 py-2">
        <span className="font-mono text-scale-2 text-steel-400">{sessionId}</span>
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
              // §5.4: "navigate to a clean lane ready for the next
              // traveller" — now literally the capture step, since each
              // session gets its own /lane/:sessionId route.
              navigate('/');
            }}
          />
        }
      />
    </div>
  );
}
