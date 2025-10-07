import { render, screen, fireEvent, act } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NotificationProvider } from '../contexts/NotificationContext';
import TenancyAgreement from '../components/TenancyAgreement';

expect.extend(toHaveNoViolations);

describe('TenancyAgreement Accessibility', () => {
  const mockAgreement = {
    agreementId: 'TEST-123',
    // ... same mock data as before
  };

  const renderComponent = () => {
    return render(
      <NotificationProvider>
        <TenancyAgreement
          tenantData={mockAgreement}
          onComplete={jest.fn()}
          onCancel={jest.fn()}
        />
      </NotificationProvider>
    );
  };

  it('should have no accessibility violations', async () => {
    const { container } = renderComponent();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('supports keyboard navigation', () => {
    renderComponent();
    
    const checkbox = screen.getByRole('checkbox');
    const previewButton = screen.getByText('Preview Agreement');
    const cancelButton = screen.getByText('Decline');

    // Test tab order
    checkbox.focus();
    expect(document.activeElement).toBe(checkbox);
    
    fireEvent.keyDown(checkbox, { key: 'Tab' });
    expect(document.activeElement).toBe(previewButton);
    
    fireEvent.keyDown(previewButton, { key: 'Tab' });
    expect(document.activeElement).toBe(cancelButton);
  });

  it('supports keyboard actions', () => {
    const onComplete = jest.fn();
    render(
      <NotificationProvider>
        <TenancyAgreement
          tenantData={mockAgreement}
          onComplete={onComplete}
          onCancel={jest.fn()}
        />
      </NotificationProvider>
    );

    const checkbox = screen.getByRole('checkbox');
    const previewButton = screen.getByText('Preview Agreement');

    // Test space key on checkbox
    checkbox.focus();
    fireEvent.keyDown(checkbox, { key: ' ' });
    expect(checkbox).toBeChecked();

    // Test enter key on button
    previewButton.focus();
    fireEvent.keyDown(previewButton, { key: 'Enter' });
    expect(screen.getByText('Agreement Preview')).toBeInTheDocument();
  });

  it('provides appropriate ARIA labels', () => {
    renderComponent();
    
    expect(screen.getByRole('checkbox'))
      .toHaveAccessibleName('I have read and agree to the terms of this tenancy agreement');
    
    expect(screen.getByRole('button', { name: 'Preview Agreement' }))
      .toHaveAttribute('aria-disabled', 'true');
  });
});