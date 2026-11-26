import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  inline?: boolean;
  fallbackTitle?: string;
  resetKey?: string | number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected rendering error occurred.',
    };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, message: '' });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Dashboard render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.inline) {
        return (
          <div
            role="alert"
            className="px-4 py-3 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/25 flex items-center justify-between gap-3 text-xs"
          >
            <div className="min-w-0">
              <p className="font-medium text-rose-800 dark:text-rose-200">
                {this.props.fallbackTitle || 'Unable to display this item'}
              </p>
              <p className="text-rose-600 dark:text-rose-300/80 truncate mt-0.5">
                {this.state.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="px-2.5 py-1 rounded text-xs font-medium bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100/70 shrink-0"
            >
              Retry
            </button>
          </div>
        );
      }

      return (
        <div className="cadence-shell min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 dark:bg-[#0B0F17] dark:text-slate-100 p-6">
          <div className="cadence-card editorial-modal editorial-preserve-pad max-w-md w-full rounded-xl bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h1 className="font-display text-lg font-semibold">
              {this.props.fallbackTitle || 'Unable to load dashboard'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
