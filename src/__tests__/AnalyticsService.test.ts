import AnalyticsService from '../services/AnalyticsService';

describe('AnalyticsService', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('tracks events correctly', () => {
    const eventData = {
      agreementId: 'TEST-123',
      action: 'view'
    };

    AnalyticsService.trackEvent('agreement_view', eventData);
    expect(console.log).toHaveBeenCalledWith(
      'Analytics events:',
      expect.arrayContaining([
        expect.objectContaining({
          type: 'agreement_view',
          data: eventData
        })
      ])
    );
  });

  it('handles error events', () => {
    const errorData = {
      agreementId: 'TEST-123',
      errorMessage: 'Test error',
      errorType: 'validation'
    };

    AnalyticsService.trackEvent('error', errorData);
    expect(console.log).toHaveBeenCalledWith(
      'Analytics events:',
      expect.arrayContaining([
        expect.objectContaining({
          type: 'error',
          data: errorData
        })
      ])
    );
  });

  it('queues events for processing', () => {
    const events = [
      { type: 'agreement_view', data: { agreementId: 'TEST-1' } },
      { type: 'agreement_sign', data: { agreementId: 'TEST-1' } },
      { type: 'pdf_generate', data: { agreementId: 'TEST-1' } }
    ];

    events.forEach(event => {
      AnalyticsService.trackEvent(event.type as any, event.data);
    });

    expect(console.log).toHaveBeenCalledWith(
      'Analytics events:',
      expect.arrayContaining(events)
    );
  });
});