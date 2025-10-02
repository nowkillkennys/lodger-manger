import { render, screen, act } from '@testing-library/react';
import Toast from './Toast';
import { ToastContext } from '../contexts/ToastContext';

describe('Toast Component', () => {
  const mockShowToast = jest.fn();
  const mockHideToast = jest.fn();

  const defaultProps = {
    message: 'Test message',
    type: 'success',
    visible: true
  };

  const renderWithContext = (props = defaultProps) => {
    return render(
      <ToastContext.Provider value={{ showToast: mockShowToast, hideToast: mockHideToast }}>
        <Toast {...props} />
      </ToastContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the toast with correct message', () => {
    renderWithContext();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('applies correct styles based on type', () => {
    renderWithContext({ ...defaultProps, type: 'error' });
    const toastElement = screen.getByRole('alert');
    expect(toastElement).toHaveClass('bg-red-500');
  });

  it('hides after the specified duration', () => {
    jest.useFakeTimers();
    renderWithContext();
    
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockHideToast).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('is not visible when visible prop is false', () => {
    renderWithContext({ ...defaultProps, visible: false });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders success toast with correct message', () => {
    render(<Toast message="Success message" type="success" show={true} onClose={() => {}} />);
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('renders error toast with correct message', () => {
    render(<Toast message="Error message" type="error" show={true} onClose={() => {}} />);
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('does not render when show is false', () => {
    const { container } = render(
      <Toast message="Test message" type="success" show={false} onClose={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Toast', () => {
  it('renders success toast with message', () => {
    render(<Toast message="Success message" type="success" />);
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('renders error toast with message', () => {
    render(<Toast message="Error message" type="error" />);
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('applies correct CSS class based on type', () => {
    const { container } = render(<Toast message="Test" type="success" />);
    expect(container.firstChild).toHaveClass('bg-green-500');
    
    const { container: errorContainer } = render(<Toast message="Test" type="error" />);
    expect(errorContainer.firstChild).toHaveClass('bg-red-500');
  });
});