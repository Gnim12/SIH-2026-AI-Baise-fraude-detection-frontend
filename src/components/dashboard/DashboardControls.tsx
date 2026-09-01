import type { DashboardFilterOptions, DashboardScope } from '../../types/dashboard';

interface DashboardControlsProps {
  /** When false, none of the scope/officer/lane markup renders at all --
   *  not a disabled control. A disabled toggle still tells a non-admin
   *  officer "there is a scope=all view, you just can't use it", which is
   *  exactly the leak §1 says not to create. */
  isAdmin: boolean;
  scope: DashboardScope;
  onScopeChange: (scope: DashboardScope) => void;
  fromDate: string;
  toDate: string;
  onDateRangeChange: (fromDate: string, toDate: string) => void;
  filterOptions?: DashboardFilterOptions;
  officerId: string;
  laneId: string;
  onOfficerChange: (officerId: string) => void;
  onLaneChange: (laneId: string) => void;
}

export function DashboardControls({
  isAdmin,
  scope,
  onScopeChange,
  fromDate,
  toDate,
  onDateRangeChange,
  filterOptions,
  officerId,
  laneId,
  onOfficerChange,
  onLaneChange,
}: DashboardControlsProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded border border-shell-600 bg-shell-800 p-3">
      <label className="flex flex-col gap-1 text-scale-2 text-steel-400">
        From
        <input
          type="date"
          value={fromDate}
          max={toDate}
          onChange={(e) => onDateRangeChange(e.target.value, toDate)}
          className="rounded border border-shell-600 bg-shell-900 px-2 py-1 font-mono text-scale-2 text-steel-200"
        />
      </label>
      <label className="flex flex-col gap-1 text-scale-2 text-steel-400">
        To
        <input
          type="date"
          value={toDate}
          min={fromDate}
          onChange={(e) => onDateRangeChange(fromDate, e.target.value)}
          className="rounded border border-shell-600 bg-shell-900 px-2 py-1 font-mono text-scale-2 text-steel-200"
        />
      </label>

      {isAdmin && (
        <span role="group" aria-label="Scope" className="flex overflow-hidden rounded border border-shell-600 text-scale-2 font-mono uppercase tracking-wide">
          {(['me', 'all'] as const).map((option) => {
            const pressed = scope === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={pressed}
                onClick={() => onScopeChange(option)}
                className={`px-2 py-1 ${pressed ? 'bg-shell-600 text-steel-200' : 'text-steel-400 hover:bg-shell-700 hover:text-steel-300'}`}
              >
                {option}
              </button>
            );
          })}
        </span>
      )}

      {isAdmin && scope === 'all' && (
        <>
          <label className="flex flex-col gap-1 text-scale-2 text-steel-400">
            Officer
            <select
              value={officerId}
              onChange={(e) => onOfficerChange(e.target.value)}
              className="rounded border border-shell-600 bg-shell-900 px-2 py-1 font-mono text-scale-2 text-steel-200"
            >
              <option value="">All officers</option>
              {filterOptions?.officerIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-scale-2 text-steel-400">
            Lane
            <select
              value={laneId}
              onChange={(e) => onLaneChange(e.target.value)}
              className="rounded border border-shell-600 bg-shell-900 px-2 py-1 font-mono text-scale-2 text-steel-200"
            >
              <option value="">All lanes</option>
              {filterOptions?.laneIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
    </div>
  );
}
