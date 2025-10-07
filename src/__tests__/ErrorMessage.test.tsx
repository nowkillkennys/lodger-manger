import { render, screen } from '@testing-library/react';
import ErrorMessage from '../components/ErrorMessage';

describe('ErrorMessage', () => {
  it('renders error message', () => {
    render(<ErrorMessage message="Test error message" />);
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('does not render when message is empty', () => {
    const { container } = render(<ErrorMessage message="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('has correct styling', () => {
    render(<ErrorMessage message="Test error" />);
    const errorElement = screen.getByText('Test error');
    expect(errorElement).toHaveClass('text-red-600');
  });
});