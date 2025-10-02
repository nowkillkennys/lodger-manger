import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../contexts/ToastContext';

const TestComponent = () => {
  const { showToast } = useToast();
  return (
    <button onClick={() => showToast('Test message', 'success')}>
      Show Toast
    </button>
  );
};

describe('ToastContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('shows toast message when triggered', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    screen.getByText('Show Toast').click();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('automatically dismisses toast after timeout', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    screen.getByText('Show Toast').click();
    expect(screen.getByText('Test message')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
  });

  it('throws error when useToast is used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useToast must be used within a ToastProvider');

    consoleError.mockRestore();
  });

  it('allows manual toast dismissal', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    screen.getByText('Show Toast').click();
    const dismissButton = screen.getByRole('button', { name: /close/i });
    dismissButton.click();

    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
  });
});