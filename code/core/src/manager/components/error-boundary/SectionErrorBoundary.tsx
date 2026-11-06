import type { ReactNode } from 'react';
import React, { Component } from 'react';

import styles from './SectionErrorBoundary.module.css';

interface SectionErrorBoundaryProps {
  /** The name of the part of the UI, for example "Sidebar". */
  name: string;
  children: ReactNode;
}

interface SectionErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches a render error in one part of the manager (sidebar, preview area, panel, page), so the
 * other parts keep working. "Try again" renders the children again.
 */
export class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  state: SectionErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(`Forkbook ${this.props.name} error:`, error);
    console.error('Component Stack:', errorInfo.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <div className={styles.container} role="alert" data-testid="section-error-boundary">
        <strong className={styles.heading}>{this.props.name} failed to render</strong>
        <pre className={styles.message}>{error.message || String(error)}</pre>
        <p className={styles.hint}>
          This is usually caused by addon code. The rest of Forkbook still works. See the browser
          console for details.
        </p>
        <button type="button" className={styles.button} onClick={this.reset}>
          Try again
        </button>
      </div>
    );
  }
}
