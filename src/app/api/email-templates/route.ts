import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbGetEmailTemplates, dbSaveEmailTemplate, dbDeleteEmailTemplate } from '@/lib/db';

// GET /api/email-templates — List user's templates
export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const templates = await dbGetEmailTemplates(userId);
    return NextResponse.json(templates);
}

// POST /api/email-templates — Create or update a template
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, name, subject, bodyTemplate } = body;

    if (!name || !subject || !bodyTemplate) {
        return NextResponse.json({ error: 'name, subject, and bodyTemplate are required' }, { status: 400 });
    }

    const template = await dbSaveEmailTemplate(userId, { id, name, subject, bodyTemplate });
    return NextResponse.json(template);
}

// DELETE /api/email-templates — Delete a template
export async function DELETE(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await dbDeleteEmailTemplate(id, userId);
    return NextResponse.json({ success: true });
}
