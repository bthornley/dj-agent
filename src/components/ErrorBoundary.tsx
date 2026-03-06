'use client';

import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallbackTitle?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    minHeight: '300px', padding: '40px', textAlign: 'center',
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                    <h3 style={{ color: 'var(--text-primary, #e2e8f0)', fontSize: '18px', marginBottom: '8px' }}>
                        {this.props.fallbackTitle || 'Something went wrong'}
                    </h3>
                    <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '14px', maxWidth: '400px', lineHeight: '1.6', marginBottom: '20px' }}>
                        {this.state.error?.message || 'An unexpected error occurred. Please try refreshing the page.'}
                    </p>
                    <button
                        onClick={() => {
                            this.setState({ hasError: false, error: null });
                            window.location.reload();
                        }}
                        style={{
                            background: 'linear-gradient(135deg, #a78bfa, #6366f1)',
                            color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px',
                            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        🔄 Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
