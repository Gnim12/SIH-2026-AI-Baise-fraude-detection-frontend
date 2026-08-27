import { create } from 'zustand';
import type {
  Decision,
  ScreeningEvent,
  ScreeningSession,
  ScreenedDocument,
  Signal,
} from '../types/screening';

export function createEmptySession(): ScreeningSession {
  return {
    sessionId: '',
    laneId: '',
    officerId: '',
    startedAt: new Date().toISOString(),
    band: null,
    risk: null,
    confidence: null,
    abstained: false,
    documents: [],
    signals: [],
    face: null,
    graph: null,
    crossDocumentSignals: [],
    coverageFlags: [],
    timingMs: {},
    sealed: false,
  };
}

/** Appends incoming signals, skipping any whose id already exists. */
function mergeSignals(existing: Signal[], incoming: Signal[] | undefined): Signal[] {
  if (!incoming || incoming.length === 0) return existing;
  const seen = new Set(existing.map((s) => s.id));
  const additions = incoming.filter((s) => !seen.has(s.id));
  if (additions.length === 0) return existing;
  return [...existing, ...additions];
}

function upsertDocument(
  documents: ScreenedDocument[],
  id: string,
  patch: Partial<ScreenedDocument>,
): ScreenedDocument[] {
  const index = documents.findIndex((d) => d.id === id);
  if (index === -1) {
    const doc: ScreenedDocument = {
      id,
      type: 'UNKNOWN',
      imageUrl: '',
      views: {},
      fields: [],
      risk: null,
      ...patch,
    };
    return [...documents, doc];
  }
  const next = [...documents];
  next[index] = { ...next[index], ...patch };
  return next;
}

/** Pure reducer. Events are additive and may arrive out of order. */
export function applyScreeningEvent(
  session: ScreeningSession,
  event: ScreeningEvent,
): ScreeningSession {
  switch (event.stage) {
    case 'received':
      return {
        ...session,
        sessionId: event.sessionId,
        laneId: event.laneId,
        officerId: event.officerId,
      };

    case 'quality': {
      const documents = upsertDocument(session.documents, event.documentId, {});
      if (event.ok) return { ...session, documents };
      return {
        ...session,
        documents,
        recaptureReason: event.reason,
        recaptureHint: event.hint,
      };
    }

    case 'classified':
      return {
        ...session,
        documents: upsertDocument(session.documents, event.documentId, {
          type: event.type,
          country: event.country,
          version: event.version,
          imageUrl: event.imageUrl,
        }),
      };

    case 'ocr':
      return {
        ...session,
        documents: upsertDocument(session.documents, event.documentId, {
          fields: event.fields,
          mrz: event.mrz,
        }),
        signals: mergeSignals(session.signals, event.signals),
      };

    case 'face':
      return {
        ...session,
        face: event.face,
        signals: mergeSignals(session.signals, event.signals),
      };

    case 'database':
      return {
        ...session,
        graph: event.graph,
        signals: mergeSignals(session.signals, event.signals),
      };

    case 'forensics':
      return {
        ...session,
        documents: upsertDocument(session.documents, event.documentId, {
          views: event.views,
        }),
        signals: mergeSignals(session.signals, event.signals),
      };

    case 'crossdoc':
      return {
        ...session,
        crossDocumentSignals: mergeSignals(session.crossDocumentSignals, event.signals),
      };

    case 'decision':
      return {
        ...session,
        band: event.band,
        risk: event.risk,
        confidence: event.confidence,
        abstained: event.abstained,
        coverageFlags: event.coverageFlags,
        timingMs: { ...session.timingMs, ...event.timingMs },
      };

    case 'error':
      return session;

    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

interface SessionStore {
  session: ScreeningSession | null;
  /** Raw stage arrivals, independent of what each event did to the
   *  session — StageProgress needs "did this stage land" even when its
   *  payload happens to produce no visible field change. */
  stagesSeen: ReadonlySet<ScreeningEvent['stage']>;
  applyEvent: (event: ScreeningEvent) => void;
  /** Officer decision is not a WS event — the console records it locally
   *  and (in a later milestone) posts it to the decision endpoint. */
  sealSession: (decision: Decision, note: string, override: boolean) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  session: null,
  stagesSeen: new Set(),
  applyEvent: (event) =>
    set((state) => ({
      session: applyScreeningEvent(state.session ?? createEmptySession(), event),
      stagesSeen: new Set(state.stagesSeen).add(event.stage),
    })),
  sealSession: (decision, note, override) =>
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          officerDecision: {
            decision,
            note,
            decidedAt: new Date().toISOString(),
            override,
          },
          sealed: true,
        },
      };
    }),
  reset: () => set({ session: null, stagesSeen: new Set() }),
}));
