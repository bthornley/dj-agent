import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { put, del } from '@vercel/blob';
import { dbGetAllMediaAssets, dbSaveMediaAsset, dbDeleteMediaAsset } from '@/lib/db';
import { MediaAsset, MediaType } from '@/lib/types';
import { v4 as uuid } from 'uuid';
import { rateLimit, safeError } from '@/lib/rate-limit';

// Allowlisted MIME types to prevent malicious uploads
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
]);

// Magic byte signatures for common file types
const MAGIC_BYTES: [string, number[]][] = [
    ['image/jpeg', [0xFF, 0xD8, 0xFF]],
    ['image/png', [0x89, 0x50, 0x4E, 0x47]],
    ['image/gif', [0x47, 0x49, 0x46]],
    ['image/webp', [0x52, 0x49, 0x46, 0x46]], // RIFF header
    ['video/mp4', []], // ftyp box — check at offset 4
    ['video/webm', [0x1A, 0x45, 0xDF, 0xA3]],
];

function validateMagicBytes(buffer: ArrayBuffer, claimedType: string): boolean {
    const bytes = new Uint8Array(buffer.slice(0, 12));
    // For MP4: check for 'ftyp' at offset 4
    if (claimedType === 'video/mp4' || claimedType === 'video/quicktime') {
        return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
    }
    // For audio and SVG, skip magic-byte check (harder to validate)
    if (claimedType.startsWith('audio/') || claimedType === 'image/svg+xml') return true;
    // Check magic bytes for other types
    for (const [type, sig] of MAGIC_BYTES) {
        if (claimedType === type && sig.length > 0) {
            return sig.every((b, i) => bytes[i] === b);
        }
    }
    return true; // Unknown type, allow (MIME already checked)
}

function sanitizeFilename(name: string): string {
    return name
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Strip special chars
        .replace(/\.{2,}/g, '.')           // No path traversal
        .substring(0, 255);                 // Cap length
}

function getMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'image';
}

// GET /api/social/media — List all media assets
export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const assets = await dbGetAllMediaAssets(userId);
    return NextResponse.json(assets);
}

// POST /api/social/media — Upload media files
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = rateLimit(`media:${userId}`, 10, 60_000);
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const tagsRaw = formData.get('tags') as string | null;
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    if (!files.length) {
        return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const results: MediaAsset[] = [];

    for (const file of files) {
        // Validate MIME type against allowlist
        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            continue; // Skip non-allowed file types
        }

        // Validate file size (10MB max for images, 50MB for video/audio)
        const maxSize = file.type.startsWith('image/') ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
        if (file.size > maxSize) {
            continue;
        }

        // Validate magic bytes to prevent MIME spoofing
        const buffer = await file.arrayBuffer();
        if (!validateMagicBytes(buffer, file.type)) {
            console.warn(`[security] Magic byte mismatch for ${file.name} (claimed: ${file.type})`);
            continue;
        }

        const safeName = sanitizeFilename(file.name);

        try {
            // Upload to Vercel Blob with sanitized filename
            const blob = await put(`social-media/${userId}/${Date.now()}-${safeName}`, new Blob([buffer], { type: file.type }), {
                access: 'public',
            });

            const now = new Date().toISOString();
            const asset: MediaAsset = {
                id: uuid(),
                fileName: safeName,
                fileSize: file.size,
                mimeType: file.type,
                mediaType: getMediaType(file.type),
                url: blob.url,
                thumbnailUrl: blob.url, // Vercel Blob doesn't auto-generate thumbnails
                width: 0,
                height: 0,
                duration: 0,
                tags,
                usedInPosts: [],
                createdAt: now,
                updatedAt: now,
            };

            await dbSaveMediaAsset(asset, userId);
            results.push(asset);
        } catch (err) {
            console.error(`Failed to upload ${safeName}:`, err);
        }
    }

    return NextResponse.json({
        uploaded: results.length,
        skipped: files.length - results.length,
        assets: results,
    }, { status: 201 });
}

// DELETE /api/social/media — Delete a media asset
export async function DELETE(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = rateLimit(`media-del:${userId}`, 5, 60_000);
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const { id, url } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    // Delete from blob storage
    if (url) {
        try {
            await del(url);
        } catch (err) {
            console.error('Blob delete failed:', err);
        }
    }

    // Delete from DB
    await dbDeleteMediaAsset(id, userId);
    return NextResponse.json({ success: true });
}
