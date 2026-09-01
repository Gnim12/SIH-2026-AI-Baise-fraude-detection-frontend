import { API_BASE } from './client';
import type { DashboardScope, DashboardSummary } from '../types/dashboard';

export interface DashboardQuery {
  scope: DashboardScope;
  fromDate: string; // 'YYYY-MM-DD'
  toDate: string; // 'YYYY-MM-DD'
  /** Only ever sent when scope='all' — see DashboardScreen. Sending it
   *  under scope='me' would be a no-op anyway (backend/app/api/dashboard.py
   *  ignores officer_id/lane_id under scope='me' by construction), but the
   *  frontend doesn't rely on the backend to catch a mistake it can simply
   *  not make. */
  officerId?: string;
  laneId?: string;
}

/** GET /api/v1/dashboard/summary. Query params are literal FastAPI
 *  parameter names (snake_case) — unlike the JSON response body, GET query
 *  strings never go through app/contracts/wire.py's camelCase conversion. */
export async function fetchDashboardSummary(query: DashboardQuery): Promise<DashboardSummary> {
  const params = new URLSearchParams({
    scope: query.scope,
    from_date: query.fromDate,
    to_date: query.toDate,
  });
  if (query.officerId) params.set('officer_id', query.officerId);
  if (query.laneId) params.set('lane_id', query.laneId);

  const res = await fetch(`${API_BASE}/api/v1/dashboard/summary?${params.toString()}`, {
    credentials: 'include',
  });
  if (res.status === 403) throw new Error('FORBIDDEN');
  if (!res.ok) throw new Error(`fetchDashboardSummary failed: ${res.status}`);
  return res.json();
}
