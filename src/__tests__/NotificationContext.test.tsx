import { render, screen, act } from '@testing-library/react';
import { NotificationProvider, useNotification } from '../contexts/NotificationContext';

const TestComponent = () => {
  const { showNotification } = useNotification();
  return (
    <button onClick={() => showNotification('Test message', 'success')}>
      Show Notification
    </button>
  );
};

describe('NotificationContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows and automatically dismisses notifications', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    const button = screen.getByText('Show Notification');
    act(() => {
      button.click();
    });

    expect(screen.getByText('Test message')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
  });

  it('shows different types of notifications with correct styling', () => {
    const TestMultipleTypes = () => {
      const { showNotification } = useNotification();
      return (
        <>
          <button onClick={() => showNotification('Success', 'success')}>Success</button>
          <button onClick={() => showNotification('Error', 'error')}>Error</button>
          <button onClick={() => showNotification('Info', 'info')}>Info</button>
        </>
      );
    };

    render(
      <NotificationProvider>
        <TestMultipleTypes />
      </NotificationProvider>
    );

    act(() => {
      screen.getByText('Success').click();
    });
    expect(screen.getByText('Success').closest('div')).toHaveClass('bg-green-500');

    act(() => {
      screen.getByText('Error').click();
    });
    expect(screen.getByText('Error').closest('div')).toHaveClass('bg-red-500');

    act(() => {
      screen.getByText('Info').click();
    });
    expect(screen.getByText('Info').closest('div')).toHaveClass('bg-blue-500');
  });

  it('throws error when used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow('useNotification must be used within a NotificationProvider');
    consoleError.mockRestore();
  });
});