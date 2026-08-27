// ---------- primitives ----------
export type Decision   = 'CLEAR' | 'SECONDARY' | 'HOLD' | 'REFER';
export type SystemBand = 'CLEAR' | 'SECONDARY' | 'HOLD' | 'ABSTAIN' | 'RECAPTURE';
export type Severity   = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type DocType    = 'PASSPORT' | 'VISA' | 'NATIONAL_ID' | 'LICENCE' | 'PERMIT' | 'UNKNOWN';

/** Normalised 0..1 coordinates, relative to the rectified document image.
 *  Normalised so the overlay survives any canvas size. Never store pixels. */
export interface Region {
  x: number; y: number; w: number; h: number;
  documentId: string;
}

// ---------- findings ----------
export interface Signal {
  id: string;
  code: string;            // e.g. 'MRZ_CHECKDIGIT_DOB' — see appendix A of the spec
  module: 'ocr' | 'validation' | 'tamper' | 'face' | 'ovd' | 'template'
        | 'database' | 'graph' | 'crossdoc' | 'system';
  severity: Severity;
  weight: number;          // contribution to risk; 0 for info-only
  detail: string;          // human sentence, already written by the backend
  region?: Region;         // ABSENT for non-spatial signals (face, watchlist)
  heatmapUrl?: string;
  /** Set when >=3 modules agree on the same region. Render as a group. */
  convergenceGroup?: string;
}

// ---------- documents ----------
export interface ExtractedField {
  key: string;             // 'birth_date'
  label: string;           // 'Date of birth'
  value: string;
  confidence: number;      // 0..1
  source: 'MRZ' | 'VIZ' | 'MERGED';
  mismatch?: boolean;      // MRZ and VIZ disagree on this field
}

export interface MrzLine {
  text: string;            // exactly 30 / 36 / 44 chars
  /** Character-index ranges that form check-digit-protected groups. */
  groups: Array<{
    name: string;          // 'doc_number' | 'birth_date' | 'expiry_date' | 'composite'
    start: number;         // inclusive
    end: number;           // exclusive, EXCLUDES the check digit itself
    checkDigitIndex: number;
    valid: boolean;
    expected?: string;     // populated only when invalid — matches BACKEND_BRIEF.md §4 MrzGroup
    read?: string;         // populated only when invalid
    signalId?: string;     // direct link to the Signal this group failed
  }>;
}

export interface ScreenedDocument {
  id: string;
  type: DocType;
  country?: string;        // ISO-3166 alpha-3
  version?: string;
  imageUrl: string;        // rectified document image
  views: Partial<Record<'rgb' | 'ela' | 'noise' | 'heatmap' | 'fft', string>>;
  mrz?: { format: 'TD1'|'TD2'|'TD3'|'MRV-A'|'MRV-B'; lines: MrzLine[]; status: 'VERIFIED'|'UNRECOVERABLE' };
  fields: ExtractedField[];
  risk: number | null;
}

// ---------- face ----------
export interface FaceResult {
  status: 'MATCH' | 'MISMATCH' | 'SPOOF' | 'UNAVAILABLE';
  similarity: number | null;   // null when SPOOF or UNAVAILABLE
  threshold: number;
  documentPortraitUrl?: string;
  livePortraitUrl?: string;
  padVerdict: 'live' | 'spoof' | 'not_run';
  ghostPortraitConsistent?: boolean;
}

// ---------- identity graph ----------
export interface Encounter {
  sessionId: string;
  timestamp: string;       // ISO
  checkpoint: string;
  nameOnDocument: string;
  documentNumber: string;
  faceSimilarity: number;
  conflict: boolean;       // same face, different identity
}

export interface GraphResult {
  priorEncounters: Encounter[];
  conflicts: number;
  impossibleTravel: boolean;
}

// ---------- the session ----------
export interface ScreeningSession {
  sessionId: string;
  laneId: string;
  officerId: string;
  startedAt: string;
  band: SystemBand | null;      // null while still processing
  risk: number | null;          // null when ABSTAIN or RECAPTURE
  confidence: number | null;
  abstained: boolean;
  recaptureReason?: string;
  recaptureHint?: string;
  documents: ScreenedDocument[];
  signals: Signal[];
  face: FaceResult | null;
  graph: GraphResult | null;
  crossDocumentSignals: Signal[];
  coverageFlags: string[];      // 'no_biometric' | 'stale_watchlist' | 'no_ovd' ...
  timingMs: Record<string, number>;
  officerDecision?: {
    decision: Decision;
    note: string;
    decidedAt: string;
    override: boolean;          // differed from the system band
  };
  sealed: boolean;
}

// ---------- WebSocket events ----------

export type ScreeningEvent =
  | { stage: 'received';   sessionId: string; laneId: string; officerId: string }
  | { stage: 'quality';    documentId: string; ok: boolean; dpi?: number;
      reason?: string; hint?: string }
  | { stage: 'classified'; documentId: string; type: DocType; country: string;
      version: string; confidence: number; imageUrl: string }
  | { stage: 'ocr';        documentId: string; fields: ExtractedField[];
      mrz?: ScreenedDocument['mrz']; signals: Signal[] }
  | { stage: 'face';       face: FaceResult; signals: Signal[] }
  | { stage: 'database';   graph: GraphResult; signals: Signal[] }
  | { stage: 'forensics';  documentId: string;
      views: ScreenedDocument['views']; signals: Signal[] }
  | { stage: 'crossdoc';   signals: Signal[] }
  | { stage: 'decision';   band: SystemBand; risk: number | null;
      confidence: number; abstained: boolean; coverageFlags: string[];
      timingMs: Record<string, number> }
  | { stage: 'error';      message: string };
