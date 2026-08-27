import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { LaneHeader } from './LaneHeader';
import { LaneScreen } from '../../screens/LaneScreen';
import { HistoryScreen } from '../../screens/HistoryScreen';
import { SessionDetail } from '../../screens/SessionDetail';
import type { ConnectionState } from '../../api/socket';
import { useSettingsStore } from '../../store/settingsStore';

/** §2: "3 routes only." LaneHeader is the instrument shell's outermost
 *  chrome and stays mounted across all three — connection state is only
 *  meaningful on the lane route, where the only live WS connection lives. */
export function AppShell() {
  const laneId = useSettingsStore((s) => s.laneId);
  const officerId = useSettingsStore((s) => s.officerId);
  const [connectionState, setConnectionState] = useState<ConnectionState>('reconnecting');

  return (
    <div className="flex h-screen flex-col">
      <LaneHeader
        laneId={laneId}
        officerId={officerId}
        connectionState={connectionState}
        watchlistSyncedAt={null}
      />
      <div className="min-h-0 flex-1">
        <Routes>
          <Route path="/" element={<LaneScreen onConnectionStateChange={setConnectionState} />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/history/:sessionId" element={<SessionDetail />} />
        </Routes>
      </div>
    </div>
  );
}
