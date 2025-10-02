import { render, screen, act } from '@testing-library/react';
import { Toast } from '../Toast';
import { useToast } from '../../hooks/useToast';

// Mock the useToast hook
jest.mock('../../hooks/useToast');

describe('Toast Component', () => {
  beforeEach(() => {
    (useToast as jest.Mock).mockReturnValue({
      message: '',
      type: '',
      isVisible: false,
      showToast: jest.fn(),
      hideToast: jest.fn(),
    });
  });

  it('renders nothing when not visible', () => {
    (useToast as jest.Mock).mockReturnValue({
      message: 'Test message',
      type: 'success',
      isVisible: false,
    });

    render(<Toast />);
    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
  });

  it('renders success toast with correct message', () => {
    (useToast as jest.Mock).mockReturnValue({
      message: 'Success message',
      type: 'success',
      isVisible: true,
    });

    render(<Toast />);
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByTestId('toast')).toHaveClass('bg-green-500');
  });

  it('renders error toast with correct message', () => {
    (useToast as jest.Mock).mockReturnValue({
      message: 'Error message',
      type: 'error',
      isVisible: true,
    });

    render(<Toast />);
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByTestId('toast')).toHaveClass('bg-red-500');
  });
});