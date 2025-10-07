import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Toast } from './Toast';
import AnalyticsService from '../services/AnalyticsService';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    AnalyticsService.trackEvent('error', {
      errorMessage: error.message,
      errorType: 'boundary',
      componentStack: errorInfo.componentStack
    });
  }

  private handleDismiss = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">Please try refreshing the page or contact support if the problem persists.</p>
          <Toast 
            message={this.state.error?.message || 'An unexpected error occurred'} 
            type="error"
            onDismiss={this.handleDismiss}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;