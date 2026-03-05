'use client';

import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Global error boundary — catches unhandled React errors and shows
 * a recovery UI instead of a white screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '50vh',
                    padding: '2rem',
                    textAlign: 'center',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                }}>
                    <h2 style={{ fontSize: '1.5rem', color: '#ef4444', marginBottom: '0.5rem' }}>
                        Something went wrong
                    </h2>
                    <p style={{ color: '#6b7280', marginBottom: '1rem', maxWidth: '400px' }}>
                        An unexpected error occurred. Try refreshing the page or clicking the button below.
                    </p>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <pre style={{
                            background: '#1f2937',
                            color: '#f87171',
                            padding: '1rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.75rem',
                            maxWidth: '600px',
                            overflow: 'auto',
                            marginBottom: '1rem',
                        }}>
                            {this.state.error.message}
                        </pre>
                    )}
                    <button
                        onClick={this.handleReset}
                        style={{
                            padding: '0.5rem 1.5rem',
                            background: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                        }}
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
