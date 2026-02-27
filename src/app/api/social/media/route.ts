import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { put, del } from '@vercel/blob';
import { dbGetAllMediaAssets, dbSaveMediaAsset, dbDeleteMediaAsset } from '@/lib/db';
import { MediaAsset, MediaType } from '@/lib/types';
import { v4 as uuid } from 'uuid';

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

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const tagsRaw = formData.get('tags') as string | null;
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    if (!files.length) {
        return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const results: MediaAsset[] = [];

    for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
            continue; // Skip non-media files
        }

        // Validate file size (50MB max)
        if (file.size > 50 * 1024 * 1024) {
            continue;
        }

        try {
            // Upload to Vercel Blob
            const blob = await put(`social-media/${userId}/${Date.now()}-${file.name}`, file, {
                access: 'public',
            });

            const now = new Date().toISOString();
            const asset: MediaAsset = {
                id: uuid(),
                fileName: file.name,
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
            console.error(`Failed to upload ${file.name}:`, err);
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
