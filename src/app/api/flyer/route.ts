import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetFlyers, dbSaveFlyer, dbDeleteFlyer } from '@/lib/db';

// GET /api/flyer — List user's flyers
export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const flyers = await dbGetFlyers(userId);
    return NextResponse.json(flyers);
}

// POST /api/flyer — Create or update a flyer
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const flyer = await dbSaveFlyer(userId, body);
    return NextResponse.json(flyer);
}

// DELETE /api/flyer — Delete a flyer
export async function DELETE(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await dbDeleteFlyer(id, userId);
    return NextResponse.json({ success: true });
}
