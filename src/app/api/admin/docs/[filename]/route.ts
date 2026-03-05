import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Allowlisted files — only these can be served
const ALLOWED_FILES: Record<string, string> = {
    // Business docs
    'GigLift_Business_Plan.pptx': 'business',
    'GigLift_Business_Plan.pdf': 'business',
    'GigLift_Pitch_Deck.pptx': 'business',
    'GigLift_Marketing_Sales_Plan.pptx': 'business',
    'GigLift_Strategic_Outlook.pptx': 'business',
    'GigLift_Brand_Ambassador_Plan.pptx': 'business',
    'GigLift_IP_Strategy.pptx': 'business',
    // Tech docs
    'GigLift_Architecture.pptx': 'tech',
    'GigLift_Data_Dictionary.pptx': 'tech',
    'GigLift_Database_Model.pptx': 'tech',
    'GigLift_Dataflow.pptx': 'tech',
    'GigLift_Security.pptx': 'tech',
};

const MIME_TYPES: Record<string, string> = {
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// GET /api/admin/docs/[filename] — Serve a private document (admin-only)
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ filename: string }> }
) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin role check
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const role = (user.publicMetadata as Record<string, unknown>)?.role;
    if (role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { filename } = await params;

    // Security: only serve explicitly allowlisted files
    const category = ALLOWED_FILES[filename];
    if (!category) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const filePath = join(process.cwd(), 'data', 'docs', category, filename);

    if (!existsSync(filePath)) {
        return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    try {
        const buffer = await readFile(filePath);
        const ext = filename.substring(filename.lastIndexOf('.'));
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'private, no-cache',
            },
        });
    } catch (err) {
        console.error('[admin/docs] Error reading file:', err);
        return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
    }
}
