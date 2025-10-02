import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast } from '../components/Toast';

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders with message', () => {
    render(<Toast message="Test message" />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('applies correct styles based on type', () => {
    const { container } = render(<Toast message="Success message" type="success" />);
    expect(container.firstChild).toHaveClass('bg-green-100');
  });

  it('calls onDismiss when close button is clicked', async () => {
    const onDismiss = jest.fn();
    render(<Toast message="Test message" onDismiss={onDismiss} />);
    
    await userEvent.click(screen.getByText('×'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('auto-dismisses after duration', () => {
    const onDismiss = jest.fn();
    render(<Toast message="Test message" duration={2000} onDismiss={onDismiss} />);
    
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    expect(onDismiss).toHaveBeenCalled();
  });
});