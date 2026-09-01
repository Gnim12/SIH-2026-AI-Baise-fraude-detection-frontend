// Mirrors backend/app/contracts/dashboard.py's DashboardSummary field for
// field, camelCase (app/contracts/wire.py converts the response body, but
// NOT query params — see api/dashboard.ts's fetchDashboardSummary, which
// sends scope/from_date/to_date/officer_id/lane_id as literal FastAPI
// query-param names).
export type DashboardScope = 'me' | 'all';

export interface DailyCount {
  date: string; // 'YYYY-MM-DD'
  count: number;
}

/** Keyed by whatever band/decision values were actually seen that day —
 *  see DecisionPatterns's comment for why systemBandByDay and
 *  officerDecisionByDay are two separate arrays of this shape, not one. */
export interface BandDayBucket {
  date: string;
  counts: Record<string, number>;
}

export interface OverrideDayBucket {
  date: string;
  total: number;
  overrides: number;
  overrideRatePct: number;
}

export interface DecisionPatterns {
  // SystemBand (CLEAR/SECONDARY/HOLD/ABSTAIN/RECAPTURE) and Decision
  // (CLEAR/SECONDARY/HOLD/REFER) are disjoint enums on the backend — see
  // backend/app/contracts/dashboard.py's DecisionPatterns docstring.
  // Render these as two separate charts, never merged back into one axis.
  systemBandByDay: BandDayBucket[];
  officerDecisionByDay: BandDayBucket[];
  overrideRatePct: number; // overall, whole date range
  overridesByDay: OverrideDayBucket[];
}

export interface LatencyPercentiles {
  p50Ms: number | null;
  p95Ms: number | null;
  sampleSize: number;
}

export interface CoverageFlagFrequency {
  flag: string;
  sessionCount: number;
}

export interface OperationalMetrics {
  sessionsByDay: DailyCount[];
  latency: LatencyPercentiles;
  coverageFlagFrequency: CoverageFlagFrequency[];
}

export interface SignalCodeFrequency {
  code: string;
  count: number;
}

export interface FraudSignals {
  topSignalCodes: SignalCodeFrequency[];
  sessionsWithConvergenceGroup: number;
  sessionsWithConvergenceGroupPct: number;
}

/** scope='all' only — see backend's DashboardFilterOptions docstring: the
 *  full set of ids for the date range, independent of any officerId/laneId
 *  filter already applied, so a dropdown doesn't shrink to just the
 *  current selection. */
export interface DashboardFilterOptions {
  officerIds: string[];
  laneIds: string[];
}

export interface DashboardSummary {
  scope: DashboardScope;
  fromDate: string;
  toDate: string;
  totalSessions: number;
  decisionPatterns: DecisionPatterns;
  operational: OperationalMetrics;
  fraudSignals: FraudSignals;
  filterOptions?: DashboardFilterOptions; // absent (not null) on scope='me' — exclude_none on the wire
}
