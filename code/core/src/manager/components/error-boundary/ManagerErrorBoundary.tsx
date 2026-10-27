import type { ReactNode } from 'react';
import React, { Component } from 'react';

import { Badge, Button, Collapsible } from '@aussieljk/forkbook/internal/components';

import { RefreshCwIcon, UnfoldVerticalIcon } from 'lucide-react';

import styles from './ManagerErrorBoundary.module.css';

interface ErrorFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo | null;
}

const ErrorFallback = ({ error, errorInfo }: ErrorFallbackProps) => {
  return (
    <div className={styles.container} data-testid="manager-error-boundary">
      <div className={styles.content}>
        <div className={styles.info}>
          <h1 className={styles.heading}>
            <Badge status="negative">Error</Badge>
            <span>Something went wrong</span>
          </h1>
          <p className={styles.subHeading}>
            The Forkbook Manager UI encountered an error. This is usually caused by custom addon
            code or configuration. Please check your browser console for more details. Try clearing
            browser storage if the issue persists.
          </p>
          <Button asChild size="medium">
            <a href={window.location.origin + window.location.pathname.replace('iframe.html', '')}>
              <RefreshCwIcon size={14} />
              Reload Forkbook
            </a>
          </Button>
        </div>
        <div className={styles.errorWrapper}>
          <pre className={styles.errorMessage}>{error.message || 'Unknown error'}</pre>
          <Collapsible
            collapsed={true}
            summary={({ isCollapsed, toggleCollapsed }) => (
              <div className={styles.collapseToggle} onClick={toggleCollapsed}>
                <UnfoldVerticalIcon />
                {isCollapsed ? 'Expand error' : 'Collapse error'}
              </div>
            )}
          >
            {(error.stack || errorInfo?.componentStack) && (
              <pre className={styles.errorStack}>
                {error.stack}
                {errorInfo?.componentStack && `\n\nComponent Stack:${errorInfo.componentStack}`}
              </pre>
            )}
          </Collapsible>
        </div>
      </div>
    </div>
  );
};

interface ManagerErrorBoundaryProps {
  children: ReactNode;
}

interface ManagerErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ManagerErrorBoundary extends Component<
  ManagerErrorBoundaryProps,
  ManagerErrorBoundaryState
> {
  constructor(props: ManagerErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ManagerErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console for debugging
    console.error('Forkbook Manager UI Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    this.setState({ errorInfo });

    if (typeof globalThis.sendTelemetryError === 'function') {
      globalThis.sendTelemetryError(error);
    }
  }

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children } = this.props;

    if (hasError && error) {
      return <ErrorFallback error={error} errorInfo={errorInfo} />;
    }

    return children;
  }
}
