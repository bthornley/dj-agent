'use client';

import React from 'react';

// ============================================================
// Skeleton Loading Components — shimmer animations instead of spinners
// ============================================================

const shimmerStyle: React.CSSProperties = {
    background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite ease-in-out',
    borderRadius: '8px',
};

export function SkeletonLine({ width = '100%', height = '14px', style }: { width?: string; height?: string; style?: React.CSSProperties }) {
    return (
        <>
            <div style={{ ...shimmerStyle, width, height, ...style }} />
            <style jsx>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        </>
    );
}

export function SkeletonCard({ lines = 3, style }: { lines?: number; style?: React.CSSProperties }) {
    return (
        <>
            <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', padding: '20px', ...style,
            }}>
                <SkeletonLine width="60%" height="16px" style={{ marginBottom: '12px' }} />
                {Array.from({ length: lines }).map((_, i) => (
                    <SkeletonLine
                        key={i}
                        width={`${70 + Math.random() * 30}%`}
                        height="12px"
                        style={{ marginBottom: i < lines - 1 ? '8px' : '0' }}
                    />
                ))}
            </div>
            <style jsx>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        </>
    );
}

export function SkeletonStatsGrid({ count = 4 }: { count?: number }) {
    return (
        <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', marginBottom: '28px' }}>
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px', padding: '16px',
                    }}>
                        <SkeletonLine width="50%" height="24px" style={{ marginBottom: '8px' }} />
                        <SkeletonLine width="70%" height="10px" />
                    </div>
                ))}
            </div>
            <style jsx>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        </>
    );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <>
            <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', gap: '16px', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {Array.from({ length: cols }).map((_, i) => (
                        <SkeletonLine key={i} width={`${100 / cols}%`} height="12px" />
                    ))}
                </div>
                {/* Rows */}
                {Array.from({ length: rows }).map((_, ri) => (
                    <div key={ri} style={{ display: 'flex', gap: '16px', padding: '10px 16px', borderBottom: ri < rows - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        {Array.from({ length: cols }).map((_, ci) => (
                            <SkeletonLine key={ci} width={`${60 + Math.random() * 40}%`} height="12px" />
                        ))}
                    </div>
                ))}
            </div>
            <style jsx>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        </>
    );
}

export function SkeletonPage() {
    return (
        <div style={{ padding: '24px' }}>
            <SkeletonLine width="200px" height="28px" style={{ marginBottom: '8px' }} />
            <SkeletonLine width="300px" height="14px" style={{ marginBottom: '28px' }} />
            <SkeletonStatsGrid count={4} />
            <SkeletonTable rows={5} cols={4} />
        </div>
    );
}
