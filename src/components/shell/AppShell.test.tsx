import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../store/authStore';
import { useSessionStore } from '../../store/sessionStore';

const fetchMeMock = vi.fn();
const loginMock = vi.fn();
const logoutMock = vi.fn();
const requestPasswordResetMock = vi.fn();
vi.mock('../../api/auth', () => ({
  fetchMe: (...args: unknown[]) => fetchMeMock(...args),
  login: (...args: unknown[]) => loginMock(...args),
  logout: (...args: unknown[]) => logoutMock(...args),
  requestPasswordReset: (...args: unknown[]) => requestPasswordResetMock(...args),
}));

// CaptureScreen (the real entry point once authenticated) pulls in
// DevFixturePicker, which calls fetchCases on mount — keep it inert here.
vi.mock('../../api/client', () => ({
  fetchCases: vi.fn().mockResolvedValue([]),
  startScreening: vi.fn(),
  submitDecision: vi.fn(),
  fetchHistory: vi.fn().mockResolvedValue([]),
  fetchHistoryEntry: vi.fn(),
  resolveAssetUrl: (p: string) => p,
}));

const connectScreeningSocketMock = vi.fn();
vi.mock('../../api/socket', () => ({
  connectScreeningSocket: (...args: unknown[]) => connectScreeningSocketMock(...args),
}));

function fakeStream(): MediaStream {
  const track = { stop: vi.fn(), kind: 'video' } as unknown as MediaStreamTrack;
  return { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
}

const DEV_OFFICER = { id: 1, officerId: 'OFF-2291', name: 'A. Okonkwo', role: 'officer' };

async function renderShell(initialPath = '/') {
  const { AppShell } = await import('./AppShell');
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppShell />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  fetchMeMock.mockReset();
  loginMock.mockReset();
  logoutMock.mockReset();
  requestPasswordResetMock.mockReset();
  connectScreeningSocketMock.mockReset();
  connectScreeningSocketMock.mockImplementation(() => ({ close: vi.fn() }));
  useAuthStore.setState({ officer: null, status: 'checking' });
  useSessionStore.getState().reset();
  (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockReset();
  (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockResolvedValue(fakeStream());
});

describe('AppShell auth guard', () => {
  it('shows a loading state until the initial GET /auth/me resolves, before rendering either screen', async () => {
    let resolveMe!: (v: null) => void;
    fetchMeMock.mockReturnValue(new Promise((r) => { resolveMe = r; }));

    await renderShell('/');
    expect(screen.getByText('Verifying session…')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Lane terminal access' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Start screening/ })).not.toBeInTheDocument();

    await act(async () => resolveMe(null));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Lane terminal access' })).toBeInTheDocument());
    // Explicit timeout (matches src/integration/fixtures.test.ts's own
    // convention): observed timing out under the full suite's parallel
    // CPU load (unrelated to this test's own logic) at vitest's 5000ms
    // default -- pre-existing fragility, not something this change caused.
  }, 10000);

  it('an unauthenticated visit to "/" redirects to /login', async () => {
    fetchMeMock.mockResolvedValue(null);
    await renderShell('/');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Lane terminal access' })).toBeInTheDocument());
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('an already-authenticated /auth/me populates authStore and shows the real entry screen directly', async () => {
    fetchMeMock.mockResolvedValue(DEV_OFFICER);
    await renderShell('/');
    await waitFor(() => expect(screen.getByRole('button', { name: /Start screening/ })).toBeInTheDocument());
    expect(useAuthStore.getState().officer).toEqual(DEV_OFFICER);
  });

  it('successful login navigates to the real entry screen and populates authStore', async () => {
    fetchMeMock.mockResolvedValue(null);
    loginMock.mockResolvedValue(DEV_OFFICER);
    await renderShell('/');
    await waitFor(() => screen.getByLabelText('Officer ID'));

    fireEvent.change(screen.getByLabelText('Officer ID'), { target: { value: 'OFF-2291' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'dev-password-2291' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.getByRole('button', { name: /Start screening/ })).toBeInTheDocument());
    expect(useAuthStore.getState().officer).toEqual(DEV_OFFICER);
    expect(useAuthStore.getState().status).toBe('authenticated');
  });

  it('wrong credentials show the error state and do not navigate away from /login', async () => {
    fetchMeMock.mockResolvedValue(null);
    loginMock.mockRejectedValue(new Error('AUTHENTICATION FAILED'));
    await renderShell('/');
    await waitFor(() => screen.getByLabelText('Officer ID'));

    fireEvent.change(screen.getByLabelText('Officer ID'), { target: { value: 'OFF-2291' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('AUTHENTICATION FAILED'));
    expect(screen.getByRole('heading', { name: 'Lane terminal access' })).toBeInTheDocument();
    expect(useAuthStore.getState().status).not.toBe('authenticated');
  });

  it('logout clears authStore and redirects to /login', async () => {
    fetchMeMock.mockResolvedValue(DEV_OFFICER);
    logoutMock.mockResolvedValue(undefined);
    await renderShell('/');
    await waitFor(() => expect(screen.getByRole('button', { name: /Start screening/ })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Lane terminal access' })).toBeInTheDocument());
    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().officer).toBeNull();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('a WS 4401 (session expired) mid-session clears authStore and redirects to /login, not a reconnect loop', async () => {
    fetchMeMock.mockResolvedValue(DEV_OFFICER);
    // Simulate socket.ts's real 4401 behavior at the call-site boundary:
    // reports 'expired' once, never 'reconnecting' -- see api/socket.test.ts
    // for the proof that socket.ts itself never schedules a retry on 4401.
    connectScreeningSocketMock.mockImplementation((opts: { onStatusChange: (s: string) => void }) => {
      opts.onStatusChange('expired');
      return { close: vi.fn() };
    });

    await renderShell('/lane/sess-1');

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Lane terminal access' })).toBeInTheDocument());
    expect(screen.getByText('SESSION EXPIRED — LOG IN AGAIN')).toBeInTheDocument();
    expect(useAuthStore.getState().officer).toBeNull();
    // The WS layer connected exactly once; AppShell's redirect-on-expired
    // effect must not itself trigger another connection attempt.
    expect(connectScreeningSocketMock).toHaveBeenCalledTimes(1);
  });
});

describe('AppShell forgot-password flow', () => {
  it('"Forgot password?" on the login screen navigates to the reset-request form', async () => {
    fetchMeMock.mockResolvedValue(null);
    await renderShell('/');
    await waitFor(() => screen.getByLabelText('Officer ID'));

    fireEvent.click(screen.getByRole('link', { name: 'Forgot password?' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Request assistance' })).toBeInTheDocument());
  });

  it('/forgot-password is reachable directly without authentication — not gated by RequireAuth', async () => {
    fetchMeMock.mockResolvedValue(null);
    await renderShell('/forgot-password');

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Request assistance' })).toBeInTheDocument());
    // A RequireAuth-gated route would have bounced this unauthenticated
    // visit to /login instead.
    expect(screen.queryByRole('heading', { name: 'Lane terminal access' })).not.toBeInTheDocument();
  });

  it('document title is set from APP_NAME, not a separately hardcoded string', async () => {
    fetchMeMock.mockResolvedValue(null);
    const { APP_NAME } = await import('../../lib/constants');
    await renderShell('/');
    await waitFor(() => expect(document.title).toBe(APP_NAME));
  });

  it('the login screen renders the brand mark from APP_NAME, not a hardcoded duplicate', async () => {
    fetchMeMock.mockResolvedValue(null);
    const { APP_NAME } = await import('../../lib/constants');
    await renderShell('/');
    await waitFor(() => expect(screen.getByText(new RegExp(APP_NAME))).toBeInTheDocument());
  });
});
