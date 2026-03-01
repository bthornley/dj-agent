'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { MediaAsset } from '@/lib/types';

type FilterType = 'all' | 'image' | 'video' | 'audio';

export default function MediaLibraryPage() {
    const [assets, setAssets] = useState<MediaAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchAssets();
    }, []);

    async function fetchAssets() {
        setLoading(true);
        try {
            const res = await fetch('/api/social/media');
            const data = await res.json();
            if (Array.isArray(data)) setAssets(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    }

    async function uploadFiles(files: FileList | File[]) {
        const mediaFiles = Array.from(files).filter(f =>
            f.type.startsWith('image/') || f.type.startsWith('video/') || f.type.startsWith('audio/')
        );

        if (mediaFiles.length === 0) {
            setUploadProgress('No media files found in selection.');
            setTimeout(() => setUploadProgress(''), 3000);
            return;
        }

        setUploading(true);
        setUploadProgress(`Uploading ${mediaFiles.length} file${mediaFiles.length > 1 ? 's' : ''}...`);

        // Upload in batches of 5
        const batchSize = 5;
        let totalUploaded = 0;
        let totalSkipped = 0;

        for (let i = 0; i < mediaFiles.length; i += batchSize) {
            const batch = mediaFiles.slice(i, i + batchSize);
            const formData = new FormData();
            batch.forEach(f => formData.append('files', f));

            setUploadProgress(`Uploading... (${Math.min(i + batchSize, mediaFiles.length)}/${mediaFiles.length})`);

            try {
                const res = await fetch('/api/social/media', {
                    method: 'POST',
                    body: formData,
                });
                const data = await res.json();
                totalUploaded += data.uploaded || 0;
                totalSkipped += data.skipped || 0;
            } catch (e) {
                console.error('Upload batch failed:', e);
                totalSkipped += batch.length;
            }
        }

        setUploadProgress(`✅ ${totalUploaded} uploaded${totalSkipped > 0 ? `, ${totalSkipped} skipped` : ''}`);
        setTimeout(() => setUploadProgress(''), 4000);
        setUploading(false);
        fetchAssets();
    }

    async function handleDelete(asset: MediaAsset) {
        if (!confirm(`Delete "${asset.fileName}"?`)) return;
        try {
            await fetch('/api/social/media', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: asset.id, url: asset.url }),
            });
            setAssets(prev => prev.filter(a => a.id !== asset.id));
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(asset.id);
                return next;
            });
        } catch (e) { console.error(e); }
    }

    async function handleBulkDelete() {
        if (selectedIds.size === 0) return;
        if (!confirm(`Delete ${selectedIds.size} selected files?`)) return;
        for (const id of selectedIds) {
            const asset = assets.find(a => a.id === id);
            if (asset) {
                await fetch('/api/social/media', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: asset.id, url: asset.url }),
                });
            }
        }
        setSelectedIds(new Set());
        fetchAssets();
    }

    function toggleSelect(id: string) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) {
            uploadFiles(e.dataTransfer.files);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOver(false);
    }, []);

    const filteredAssets = filter === 'all' ? assets : assets.filter(a => a.mediaType === filter);

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const typeIcons: Record<string, string> = {
        image: '🖼️', video: '🎬', audio: '🎵',
    };

    const filterTabs: { key: FilterType; label: string }[] = [
        { key: 'all', label: `All (${assets.length})` },
        { key: 'image', label: `🖼️ Images (${assets.filter(a => a.mediaType === 'image').length})` },
        { key: 'video', label: `🎬 Videos (${assets.filter(a => a.mediaType === 'video').length})` },
        { key: 'audio', label: `🎵 Audio (${assets.filter(a => a.mediaType === 'audio').length})` },
    ];

    return (
        <>
            <header className="topbar">
                <Link href="/dashboard" className="topbar-logo" style={{ textDecoration: 'none' }}>
                    <img src="/logo.png" alt="GigLift" style={{ width: 48, height: 48, borderRadius: 10, filter: "drop-shadow(0 0 6px rgba(168,85,247,0.4))" }} />
                    <span>GigLift</span>
                </Link>
                <nav className="topbar-nav" style={{ gap: '8px', alignItems: 'center' }}>
                    <Link href="/social" className="btn btn-ghost btn-sm">�� Social Crew</Link>
                    <Link href="/social/queue" className="btn btn-ghost btn-sm">📝 Queue</Link>
                    <Link href="/social/media" className="btn btn-secondary btn-sm">📁 Media</Link>
                    <Link href="/social/brand" className="btn btn-ghost btn-sm">🎨 Brand</Link>
                    <Link href="/social/analytics" className="btn btn-ghost btn-sm">📊 Analytics</Link>
                    <UserButton />
                </nav>
            </header>

            <main className="main-content fade-in">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">Media Library</h2>
                        <p className="section-subtitle">Upload photos, videos, and audio for use in social posts</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {selectedIds.size > 0 && (
                            <button className="btn btn-ghost btn-sm" style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                                onClick={handleBulkDelete}>
                                🗑️ Delete ({selectedIds.size})
                            </button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => folderInputRef.current?.click()} disabled={uploading}>
                            📂 Import Folder
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                            ⬆️ Upload Files
                        </button>
                    </div>
                </div>

                {/* Hidden file inputs */}
                <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*"
                    style={{ display: 'none' }}
                    onChange={e => e.target.files && uploadFiles(e.target.files)} />
                <input ref={folderInputRef} type="file" multiple
                    // @ts-expect-error webkitdirectory is a non-standard attribute
                    webkitdirectory=""
                    style={{ display: 'none' }}
                    onChange={e => e.target.files && uploadFiles(e.target.files)} />

                {/* Upload progress */}
                {uploadProgress && (
                    <div className="card" style={{ padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {uploading && <div className="spinner" style={{ width: '16px', height: '16px' }} />}
                        <span style={{ fontSize: '14px', color: uploadProgress.startsWith('✅') ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                            {uploadProgress}
                        </span>
                    </div>
                )}

                {/* Drag & Drop Zone */}
                <div
                    className={`media-drop-zone ${dragOver ? 'media-drop-active' : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    <div className="media-drop-content">
                        <span className="media-drop-icon">📁</span>
                        <p className="media-drop-title">Drag & drop files or folders here</p>
                        <p className="media-drop-subtitle">Or use the buttons above to select files / import a folder</p>
                        <p className="media-drop-hint">Supports: JPG, PNG, GIF, WebP, MP4, MOV, WebM, MP3, WAV • Max 50MB per file</p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="tabs" style={{ marginBottom: '20px' }}>
                    {filterTabs.map(ft => (
                        <button key={ft.key}
                            className={`tab ${filter === ft.key ? 'active' : ''}`}
                            onClick={() => setFilter(ft.key)}>
                            {ft.label}
                        </button>
                    ))}
                </div>

                {/* Media Grid */}
                {loading ? (
                    <div className="empty-state"><div className="spinner" /></div>
                ) : filteredAssets.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📁</div>
                        <h3>No media {filter !== 'all' ? `of type "${filter}"` : 'uploaded yet'}</h3>
                        <p>Upload photos, videos, and audio to use in your social posts.</p>
                    </div>
                ) : (
                    <div className="media-grid">
                        {filteredAssets.map(asset => (
                            <div key={asset.id}
                                className={`media-card ${selectedIds.has(asset.id) ? 'media-card-selected' : ''}`}
                                onClick={() => toggleSelect(asset.id)}>
                                <div className="media-card-preview">
                                    {asset.mediaType === 'image' ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={asset.url} alt={asset.fileName} className="media-card-img" />
                                    ) : asset.mediaType === 'video' ? (
                                        <video src={asset.url} className="media-card-img" muted preload="metadata" />
                                    ) : (
                                        <div className="media-card-audio-icon">🎵</div>
                                    )}
                                    <div className="media-card-type-badge">
                                        {typeIcons[asset.mediaType]} {asset.mediaType}
                                    </div>
                                    {selectedIds.has(asset.id) && (
                                        <div className="media-card-check">✓</div>
                                    )}
                                </div>
                                <div className="media-card-info">
                                    <div className="media-card-name" title={asset.fileName}>{asset.fileName}</div>
                                    <div className="media-card-meta">{formatSize(asset.fileSize)}</div>
                                </div>
                                <div className="media-card-actions" onClick={e => e.stopPropagation()}>
                                    <button className="btn btn-ghost btn-sm"
                                        style={{ fontSize: '11px', padding: '2px 8px', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                                        onClick={() => handleDelete(asset)}>
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
}
