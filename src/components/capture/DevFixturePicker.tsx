import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCases, startScreening, type CaseSummary } from '../../api/client';

/** Development/demo tool only — bypasses CaptureScreen entirely and drops
 *  straight into /lane/:sessionId replaying a chosen fixture's tape. Kept
 *  from M2/M3's case picker so all 15 fixtures stay demoable in seconds;
 *  not the officer-facing capture flow (that's DocumentCapturePanel /
 *  LiveFaceCapture / VideoSweepPanel below), so it's visually separated
 *  and labelled, but not hidden or styled as an afterthought. */
export function DevFixturePicker() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [caseId, setCaseId] = useState('');
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCases()
      .then((c) => {
        setCases(c);
        setCaseId((current) => current || c[0]?.id || '');
      })
      .catch(() => {});
  }, []);

  async function jump() {
    if (!caseId) return;
    setPending(true);
    try {
      const { sessionId } = await startScreening(caseId);
      navigate(`/lane/${sessionId}`);
    } catch {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded border border-shell-600 bg-shell-800 px-3 py-2">
      <span className="text-eyebrow text-steel-400">DEV: jump to fixture</span>
      <select
        value={caseId}
        onChange={(e) => setCaseId(e.target.value)}
        className="rounded border border-shell-600 bg-shell-900 px-2 py-1 text-scale-2 text-steel-200"
        aria-label="fixture case"
      >
        {cases.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => void jump()}
        disabled={!caseId || pending}
        className="rounded border border-shell-600 px-2 py-1 text-scale-2 text-steel-200 hover:bg-shell-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Go
      </button>
    </div>
  );
}
