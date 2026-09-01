import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../store/authStore';
import { useSessionStore } from '../../store/sessionStore';
import type { ScreeningEvent } from '../../types/screening';

vi.mock('../../api/client', () => ({
  fetchCases: vi.fn().mockResolvedValue([]),
  startScreening: vi.fn().mockResolvedValue({ sessionId: 'sess-dev-fixture' }),
  submitDecision: vi.fn().mockResolvedValue({}),
  resolveAssetUrl: (p: string) => p,
}));

const submitCapture = vi.fn();
vi.mock('../../api/capture', () => ({
  submitCapture: (...args: unknown[]) => submitCapture(...args),
}));

let capturedOnEvent: ((event: ScreeningEvent) => void) | null = null;
vi.mock('../../api/socket', () => ({
  connectScreeningSocket: vi.fn(({ onEvent }: { onEvent: (event: ScreeningEvent) => void }) => {
    capturedOnEvent = onEvent;
    return { close: vi.fn() };
  }),
}));

function fakeStream(): MediaStream {
  const track = { stop: vi.fn(), kind: 'video' } as unknown as MediaStreamTrack;
  return { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
}

async function renderApp() {
  // Imported dynamically, after the vi.mock calls above have registered —
  // same pattern used by the other walkthrough tests in this repo.
  const { CaptureScreen } = await import('./CaptureScreen');
  const { LaneScreen } = await import('../../screens/LaneScreen');
  const result = render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<CaptureScreen />} />
        <Route path="/lane/:sessionId" element={<LaneScreen />} />
      </Routes>
    </MemoryRouter>,
  );
  // Let DevFixturePicker's mocked fetchCases() resolve before proceeding.
  await act(async () => {});
  return result;
}

async function addDocument() {
  const file = new File(['x'], 'passport.jpg', { type: 'image/jpeg' });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  // readImageDimensions() resolves within 300ms via its jsdom image-decode
  // fallback (see DocumentCapturePanel.tsx) — wait for the resulting
  // preview/remove control rather than a fixed sleep.
  await waitFor(() => expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument(), {
    timeout: 1000,
  });
}

async function captureLiveFrame() {
  fireEvent.click(screen.getByRole('button', { name: 'Activate camera' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Capture frame' })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Capture frame' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Retake' })).toBeInTheDocument());
}

describe('CaptureScreen', () => {
  beforeEach(() => {
    capturedOnEvent = null;
    submitCapture.mockReset();
    useSessionStore.getState().reset();
    // CaptureScreen (this test renders it directly, without AppShell/
    // RequireAuth) now reads officerId from authStore, not settingsStore.
    useAuthStore.getState().setOfficer({ id: 1, officerId: 'OFF-2291', name: 'Test Officer', role: 'officer' });
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockReset();
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockResolvedValue(fakeStream());
  });

  it('disables Start screening with zero documents', async () => {
    await renderApp();
    expect(screen.getByRole('button', { name: /Start screening/ })).toBeDisabled();
  });

  it('disables Start screening with a document but no live frame', async () => {
    await renderApp();
    await addDocument();
    expect(screen.getByRole('button', { name: /Start screening/ })).toBeDisabled();
  });

  it('enables Start screening once a document and a live frame are both present', async () => {
    await renderApp();
    await addDocument();
    await captureLiveFrame();
    expect(screen.getByRole('button', { name: /Start screening/ })).not.toBeDisabled();
  });

  it('shows a technical error line, not a crash, when camera permission is denied', async () => {
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new DOMException('denied', 'NotAllowedError'),
    );
    await renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Activate camera' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

    expect(screen.getByRole('alert')).toHaveTextContent(/Camera permission denied/);
    // Still usable — no crash, the activate control is still present.
    expect(screen.getByRole('button', { name: 'Activate camera' })).toBeInTheDocument();
  });

  it('submitting navigates to /lane/:sessionId and populates sessionStore via the existing reducer', async () => {
    submitCapture.mockResolvedValue({ sessionId: 'sess-capture-1' });
    await renderApp();
    await addDocument();
    await captureLiveFrame();

    fireEvent.click(screen.getByRole('button', { name: /Start screening/ }));

    await waitFor(() => expect(capturedOnEvent).not.toBeNull());
    expect(submitCapture).toHaveBeenCalledTimes(1);

    await act(async () => {
      capturedOnEvent?.({ stage: 'received', sessionId: 'sess-capture-1', laneId: 'IGI-T3-LANE-07', officerId: 'OFF-2291' });
    });

    expect(useSessionStore.getState().session?.sessionId).toBe('sess-capture-1');
    expect(screen.getByText('sess-capture-1')).toBeInTheDocument();
  });
});
