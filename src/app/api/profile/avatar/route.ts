import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

// POST /api/profile/avatar — Upload user avatar
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('avatar') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, GIF, or WebP.' }, { status: 400 });
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large. Maximum 5MB.' }, { status: 400 });
        }

        const client = await clerkClient();
        await client.users.updateUserProfileImage(userId, { file });

        // Get updated user to return new image URL
        const updatedUser = await client.users.getUser(userId);

        return NextResponse.json({
            success: true,
            imageUrl: updatedUser.imageUrl,
        });
    } catch (err) {
        console.error('Avatar upload error:', err);
        return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
    }
}

// DELETE /api/profile/avatar — Remove user avatar (reset to default)
export async function DELETE() {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const client = await clerkClient();
        await client.users.deleteUserProfileImage(userId);

        const updatedUser = await client.users.getUser(userId);

        return NextResponse.json({
            success: true,
            imageUrl: updatedUser.imageUrl,
        });
    } catch (err) {
        console.error('Avatar delete error:', err);
        return NextResponse.json({ error: 'Failed to remove avatar' }, { status: 500 });
    }
}
