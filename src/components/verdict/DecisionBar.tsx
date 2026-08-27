import { useEffect, useState } from 'react';
import type { Decision, SystemBand } from '../../types/screening';

const DECISIONS: Decision[] = ['CLEAR', 'SECONDARY', 'HOLD', 'REFER'];

const DECISION_LABEL: Record<Decision, string> = {
  CLEAR: 'Clear',
  SECONDARY: 'Secondary',
  HOLD: 'Hold',
  REFER: 'Refer',
};

const KEY_TO_DECISION: Record<string, Decision> = {
  '1': 'CLEAR',
  '2': 'SECONDARY',
  '3': 'HOLD',
  '4': 'REFER',
};

export const NOTE_REQUIRED_MESSAGE =
  'A note is required when overriding the recommendation.';

interface DecisionBarProps {
  /** The system's own recommendation, if any. Only CLEAR/SECONDARY/HOLD
   *  ever line up with a button — the system never recommends REFER, and
   *  ABSTAIN/RECAPTURE aren't decisions an officer can match. */
  systemBand: SystemBand | null;
  onSubmit: (decision: Decision, note: string, override: boolean) => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
}

export function DecisionBar({ systemBand, onSubmit }: DecisionBarProps) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState('');

  const isHoldOrRefer = decision === 'HOLD' || decision === 'REFER';
  const override = decision !== null && (systemBand === null || decision !== systemBand);
  const noteRequired = decision !== null && (override || isHoldOrRefer);
  const noteMissing = noteRequired && note.trim().length === 0;
  const canSubmit = decision !== null && !noteMissing;

  function submit() {
    if (!canSubmit || decision === null) return;
    onSubmit(decision, note, override);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Enter') {
        submit();
        return;
      }
      if (isEditableTarget(event.target)) return;
      const mapped = KEY_TO_DECISION[event.key];
      if (mapped) setDecision(mapped);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-shell-600 bg-shell-800 px-4 py-3">
      <div className="flex gap-2" role="group" aria-label="decision">
        {DECISIONS.map((d) => {
          const recommended = systemBand === d;
          const selected = decision === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDecision(d)}
              aria-pressed={selected}
              className={`rounded px-3 py-1.5 text-scale-3 text-steel-200 ${
                selected ? 'bg-shell-600' : 'bg-shell-700'
              } ${recommended ? 'ring-2 ring-steel-200' : ''}`}
            >
              {DECISION_LABEL[d]}
            </button>
          );
        })}
      </div>

      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="note"
        aria-label="note"
        className="min-w-[12rem] flex-1 rounded border border-shell-600 bg-shell-900 px-2 py-1.5 text-scale-3 text-steel-200"
      />

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="rounded bg-steel-200 px-3 py-1.5 text-scale-3 text-shell-900 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Submit
      </button>

      {noteMissing && (
        <p role="alert" className="w-full text-scale-2 text-hold">
          {NOTE_REQUIRED_MESSAGE}
        </p>
      )}
    </div>
  );
}
