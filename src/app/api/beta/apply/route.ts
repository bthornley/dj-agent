import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { role, reason } = body;

        // Ensure payload is valid
        if (!role || !reason) {
            return NextResponse.json({ error: 'Role and reason are required' }, { status: 400 });
        }

        const client = await clerkClient();

        // Update the user's public metadata with the 'beta' flag
        await client.users.updateUserMetadata(userId, {
            publicMetadata: {
                beta: true,
                betaRole: role,
                betaReason: reason,
                betaJoinDate: new Date().toISOString()
            }
        });

        return NextResponse.json({ success: true, message: 'Beta access granted.' });

    } catch (error) {
        console.error('Error in beta application:', error);
        return NextResponse.json(
            { error: 'Internal server error while applying for beta.' }, 
            { status: 500 }
        );
    }
}
