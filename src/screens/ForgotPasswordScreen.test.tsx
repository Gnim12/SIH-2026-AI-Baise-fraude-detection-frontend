import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestPasswordReset = vi.fn();
vi.mock('../api/auth', () => ({
  requestPasswordReset: (...args: unknown[]) => requestPasswordReset(...args),
}));

async function renderScreen() {
  const { ForgotPasswordScreen } = await import('./ForgotPasswordScreen');
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <ForgotPasswordScreen />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  requestPasswordReset.mockReset();
});

describe('ForgotPasswordScreen', () => {
  it('submits officer_id + reason and shows the confirmation state with the real backend reference code', async () => {
    requestPasswordReset.mockResolvedValue({
      referenceCode: 'PWR-20260901-0043',
      message: 'If that officer ID exists, a password reset request has been received and will be reviewed by an admin.',
    });

    await renderScreen();
    fireEvent.change(screen.getByLabelText('Officer ID'), { target: { value: 'OFF-2291' } });
    fireEvent.change(screen.getByLabelText('Reason (optional)'), { target: { value: 'forgot password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Request submitted' })).toBeInTheDocument());
    // The reference code shown is the exact one the (mocked) backend
    // returned, not a client-side placeholder or a hardcoded example.
    expect(screen.getByText(/PWR-20260901-0043/)).toBeInTheDocument();
    expect(requestPasswordReset).toHaveBeenCalledWith('OFF-2291', 'forgot password');
  });

  it('submits with an empty reason when none is given', async () => {
    requestPasswordReset.mockResolvedValue({ referenceCode: 'PWR-20260901-0099', message: 'ok' });

    await renderScreen();
    fireEvent.change(screen.getByLabelText('Officer ID'), { target: { value: 'OFF-3300' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));

    await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith('OFF-3300', ''));
  });

  it('shows an error and stays on the form if the request fails', async () => {
    requestPasswordReset.mockRejectedValue(new Error('TOO MANY REQUESTS — TRY AGAIN LATER'));

    await renderScreen();
    fireEvent.change(screen.getByLabelText('Officer ID'), { target: { value: 'OFF-2291' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('TOO MANY REQUESTS'));
    expect(screen.queryByRole('heading', { name: 'Request submitted' })).not.toBeInTheDocument();
  });

  it('the submit button is disabled until an officer ID is entered', async () => {
    await renderScreen();
    expect(screen.getByRole('button', { name: 'Submit request' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Officer ID'), { target: { value: 'OFF-2291' } });
    expect(screen.getByRole('button', { name: 'Submit request' })).toBeEnabled();
  });

  it('"Back to sign in" links to /login from the request form', async () => {
    await renderScreen();
    expect(screen.getByRole('link', { name: /Back to sign in/ })).toHaveAttribute('href', '/login');
  });
});
