import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchHistoryEntry } from '../api/client';
import { ScreeningView } from './ScreeningView';
import { SealedRecord } from '../components/verdict/SealedRecord';
import type { ScreeningSession } from '../types/screening';

/** §5.5: "the LaneScreen in read-only replay mode, with the decision bar
 *  replaced by the sealed record... Reuse the same components — pass
 *  readOnly." Concretely: the same ScreeningView LaneScreen uses, backed by
 *  a fetched sealed ScreeningSession instead of a live WS stream, with
 *  SealedRecord instead of DecisionBar as the footer. Nothing here is
 *  editable — there is no onSubmit to wire up. */
export function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<ScreeningSession | null | undefined>(undefined);

  useEffect(() => {
    if (!sessionId) return;
    setSession(undefined);
    let cancelled = false;
    fetchHistoryEntry(sessionId)
      .then((entry) => {
        if (!cancelled) setSession(entry);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-shell-700 px-4 py-2">
        <h1 className="text-eyebrow">Session detail</h1>
        <span className="font-mono text-scale-2 text-steel-400">{sessionId}</span>
        <Link
          to="/history"
          className="ml-auto rounded border border-shell-600 px-2 py-1 text-scale-3 text-steel-200 hover:bg-shell-700"
        >
          Back to history
        </Link>
      </div>

      {session === undefined && <p className="p-4 text-scale-3 text-steel-400">Loading…</p>}
      {session === null && <p className="p-4 text-scale-3 text-hold">Session not found.</p>}
      {session && <ScreeningView session={session} footer={<SealedRecord session={session} />} />}
    </div>
  );
}
