import { z, ZodSchema } from 'zod';
import { NextResponse } from 'next/server';

// ============================================================
// GigLift — Centralized Request Validation (Zod)
// ============================================================

const MAX_TEXT = 10_000;
const MAX_SHORT = 500;

// ---- Shared field validators ----

const idField = z.string().min(1).max(200);
const shortText = z.string().max(MAX_SHORT);
const longText = z.string().max(MAX_TEXT);
const optionalUrl = z.string().url().max(2000).optional().or(z.literal(''));
const dateStr = z.string().max(50).optional().or(z.literal(''));

// ---- Event Schemas ----

export const EventCreateSchema = z.object({
    id: idField,
    eventType: shortText.optional(),
    venueName: shortText.optional(),
    clientName: shortText.optional(),
    contactEmail: z.string().email().max(320).optional().or(z.literal('')),
    contactPhone: shortText.optional(),
    date: dateStr,
    time: shortText.optional(),
    duration: shortText.optional(),
    budget: z.number().min(0).max(1_000_000).optional(),
    status: z.enum(['inquiry', 'quoting', 'confirmed', 'completed', 'cancelled', '']).optional(),
    notes: longText.optional(),
}).passthrough(); // Allow extra fields for flexibility

export const EventUpdateSchema = EventCreateSchema.partial().omit({ id: true });

// ---- Lead Schemas ----

export const LeadCreateSchema = z.object({
    id: idField,
    venueName: shortText,
    venueType: shortText.optional(),
    contactEmail: z.string().email().max(320).optional().or(z.literal('')),
    contactPhone: shortText.optional(),
    website: optionalUrl,
    location: shortText.optional(),
    notes: longText.optional(),
    score: z.number().min(0).max(100).optional(),
}).passthrough();

export const LeadUpdateSchema = LeadCreateSchema.partial().omit({ id: true });

// ---- Query Seed Schema ----

export const SeedCreateSchema = z.object({
    id: idField.optional(),
    query: z.string().min(1).max(1000),
    region: shortText.optional(),
    genre: shortText.optional(),
    active: z.boolean().optional(),
}).passthrough();

// ---- Social Post Schemas ----

export const SocialPostCreateSchema = z.object({
    id: idField,
    caption: longText.optional(),
    hookText: shortText.optional(),
    hashtags: z.array(shortText).max(30).optional(),
    mediaRefs: z.array(z.string().max(2000)).max(10).optional(),
    postType: z.enum(['reel', 'post', 'story', 'carousel', '']).optional(),
    pillar: shortText.optional(),
    cta: shortText.optional(),
    status: z.enum(['idea', 'draft', 'approved', 'rejected', 'scheduled', 'published', '']).optional(),
}).passthrough();

export const SocialPostPatchSchema = z.object({
    id: idField,
    status: z.enum(['idea', 'draft', 'approved', 'rejected', 'scheduled', 'published']).optional(),
    caption: longText.optional(),
    hookText: shortText.optional(),
    hashtags: z.array(shortText).max(30).optional(),
    mediaRefs: z.array(z.string().max(2000)).max(10).optional(),
    cta: shortText.optional(),
}).passthrough();

// ---- Flyer Schema ----

export const FlyerCreateSchema = z.object({
    id: idField.optional(),
    eventId: idField.optional(),
    style: z.enum(['neon-club', 'elegant', 'retro', 'minimal', 'festival']).optional(),
    aspectRatio: z.enum(['1:1', '9:16', '16:9']).optional(),
    headline: shortText.optional(),
    subheadline: shortText.optional(),
    details: longText.optional(),
}).passthrough();

// ---- Email Send Schema ----

export const EmailSendSchema = z.object({
    leadId: idField.optional(),
    eventId: idField.optional(),
    to: z.string().email().max(320),
    subject: z.string().min(1).max(500),
    body: z.string().min(1).max(50_000),
    templateId: idField.optional(),
});

// ---- Brand Profile Schema ----

export const BrandProfileSchema = z.object({
    djName: shortText.optional(),
    bio: longText.optional(),
    vibeWords: z.array(shortText).max(20).optional(),
    locations: z.array(shortText).max(20).optional(),
    typicalVenues: z.array(shortText).max(20).optional(),
    brandColors: z.array(shortText).max(10).optional(),
    emojis: z.array(z.string().max(10)).max(10).optional(),
    connectedAccounts: z.array(z.object({
        platform: shortText,
        handle: shortText,
        accessToken: z.string().max(5000).optional(),
    })).max(10).optional(),
}).passthrough();

// ---- Helper: Parse + Validate Request Body ----

export type ParseResult<T> =
    | { data: T; error: null }
    | { data: null; error: NextResponse };

export async function parseBody<T>(
    request: Request,
    schema: ZodSchema<T>,
): Promise<ParseResult<T>> {
    let raw: unknown;
    try {
        raw = await request.json();
    } catch {
        return {
            data: null,
            error: NextResponse.json(
                { error: 'Invalid JSON in request body' },
                { status: 400 },
            ),
        };
    }

    const result = schema.safeParse(raw);
    if (!result.success) {
        const issues = result.error.issues.map(i => ({
            path: i.path.join('.'),
            message: i.message,
        }));
        return {
            data: null,
            error: NextResponse.json(
                { error: 'Validation failed', issues },
                { status: 400 },
            ),
        };
    }

    return { data: result.data, error: null };
}
