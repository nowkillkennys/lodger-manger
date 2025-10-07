type EventType = 'error' | 'pageView' | 'action' | 'submit';

interface EventData {
  [key: string]: string | number | boolean | object;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  public init(options: { enableDebug?: boolean } = {}) {
    if (this.initialized) return;
    
    if (options.enableDebug) {
      console.log('Analytics service initialized with debug mode');
    }
    
    this.initialized = true;
  }

  public trackEvent(type: EventType, data: EventData) {
    if (!this.initialized) {
      console.warn('Analytics service not initialized');
      return;
    }

    const event = {
      type,
      timestamp: new Date().toISOString(),
      data
    };

    // In a real implementation, you would send this to your analytics service
    // For now, we'll just log it
    console.log('Analytics event:', event);
  }

  public trackPageView(path: string) {
    this.trackEvent('pageView', { path });
  }

  public trackError(error: Error, context?: object) {
    this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      ...context
    });
  }
}

export default AnalyticsService.getInstance();