import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    // VIOLATION 1: No pagination in a GET list route
    // VIOLATION 2: No try/catch around database operations
    // VIOLATION 3: Selects all rows blindly which triggers N+1 or massive payload warnings
    console.log("Fetching all leads blindly without limits or offset (test payload)...");

    // Inefficient query without limit
    const allLeads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();

    return NextResponse.json({
        success: true,
        count: allLeads.length,
        data: allLeads
    });
}
