import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DecisionBar, NOTE_REQUIRED_MESSAGE } from './DecisionBar';

describe('DecisionBar', () => {
  it('blocks submitting HOLD with an empty note and shows the required message', () => {
    const onSubmit = vi.fn();
    render(<DecisionBar systemBand="CLEAR" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Hold' }));

    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    expect(screen.getByText(NOTE_REQUIRED_MESSAGE)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('unblocks HOLD once a note is entered', () => {
    const onSubmit = vi.fn();
    render(<DecisionBar systemBand="CLEAR" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Hold' }));
    fireEvent.change(screen.getByLabelText('note'), {
      target: { value: 'Font mismatch confirmed on physical inspection.' },
    });

    expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled();
    expect(screen.queryByText(NOTE_REQUIRED_MESSAGE)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledWith(
      'HOLD',
      'Font mismatch confirmed on physical inspection.',
      true,
    );
  });

  it('allows submitting a decision matching the system recommendation with no note', () => {
    const onSubmit = vi.fn();
    render(<DecisionBar systemBand="CLEAR" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(screen.queryByText(NOTE_REQUIRED_MESSAGE)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledWith('CLEAR', '', false);
  });

  it('rings the system-recommended button without pre-selecting it', () => {
    render(<DecisionBar systemBand="SECONDARY" onSubmit={vi.fn()} />);

    const secondaryButton = screen.getByRole('button', { name: 'Secondary' });
    expect(secondaryButton.className).toContain('ring-2');
    expect(secondaryButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('requires a note when overriding even without HOLD/REFER', () => {
    const onSubmit = vi.fn();
    render(<DecisionBar systemBand="HOLD" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(screen.getByText(NOTE_REQUIRED_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  it('selects a decision with number keys and submits with Enter', () => {
    const onSubmit = vi.fn();
    render(<DecisionBar systemBand="CLEAR" onSubmit={onSubmit} />);

    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(onSubmit).toHaveBeenCalledWith('CLEAR', '', false);
  });
});
