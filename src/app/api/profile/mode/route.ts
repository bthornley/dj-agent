import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

// GET /api/profile/mode — Get active mode (performer or instructor)
export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const meta = user.publicMetadata as Record<string, unknown>;
    const mode = (meta.activeMode as string) || 'performer';

    return NextResponse.json({ mode });
}

// PUT /api/profile/mode — Switch between performer and instructor mode
export async function PUT(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { mode } = await request.json();
    if (mode !== 'performer' && mode !== 'instructor') {
        return NextResponse.json({ error: 'Mode must be "performer" or "instructor"' }, { status: 400 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const existingMeta = user.publicMetadata as Record<string, unknown>;

    await client.users.updateUser(userId, {
        publicMetadata: { ...existingMeta, activeMode: mode },
    });

    return NextResponse.json({ mode });
}
