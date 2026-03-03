'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => { } });

export function useToast() {
    return useContext(ToastContext);
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const idRef = useRef(0);

    const toast = useCallback((message: string, type: ToastType = 'info') => {
        const id = ++idRef.current;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const dismiss = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const typeStyles: Record<ToastType, { bg: string; border: string; icon: string }> = {
        success: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', icon: '✅' },
        error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', icon: '❌' },
        info: { bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)', icon: 'ℹ️' },
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            {/* Toast container */}
            {toasts.length > 0 && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
                    display: 'flex', flexDirection: 'column', gap: '8px',
                    pointerEvents: 'none', maxWidth: '400px',
                }}>
                    {toasts.map(t => {
                        const s = typeStyles[t.type];
                        return (
                            <div
                                key={t.id}
                                onClick={() => dismiss(t.id)}
                                style={{
                                    pointerEvents: 'auto',
                                    padding: '14px 18px',
                                    borderRadius: '12px',
                                    background: s.bg,
                                    border: `1px solid ${s.border}`,
                                    backdropFilter: 'blur(12px)',
                                    color: 'var(--text-primary, #e2e8f0)',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                                    animation: 'toast-slide-in 0.3s ease-out',
                                }}
                            >
                                <span style={{ fontSize: '16px', flexShrink: 0 }}>{s.icon}</span>
                                <span>{t.message}</span>
                            </div>
                        );
                    })}
                </div>
            )}
            <style>{`
                @keyframes toast-slide-in {
                    from { opacity: 0; transform: translateX(40px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </ToastContext.Provider>
    );
}
