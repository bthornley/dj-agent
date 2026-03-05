import OpenAI from 'openai';

// ============================================================
// Shared AI Module — OpenAI Wrapper
// All agents use this for LLM calls. Gracefully falls back
// to null when the API key is unavailable.
// ============================================================

let _client: OpenAI | null = null;

function getClient(): OpenAI | null {
    if (!process.env.OPENAI_API_KEY) return null;
    if (!_client) {
        _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _client;
}

const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 1024;

/**
 * Run a chat completion and return the text response.
 * Returns null if no API key or on error (caller should fall back to templates).
 */
export async function aiComplete(
    systemPrompt: string,
    userPrompt: string,
    opts?: { maxTokens?: number; temperature?: number },
): Promise<string | null> {
    const client = getClient();
    if (!client) return null;

    try {
        const res = await client.chat.completions.create({
            model: MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            max_tokens: opts?.maxTokens ?? MAX_TOKENS,
            temperature: opts?.temperature ?? 0.8,
        });
        return res.choices[0]?.message?.content?.trim() ?? null;
    } catch (err) {
        console.error('[AI] completion error:', err instanceof Error ? err.message : err);
        return null;
    }
}

/**
 * Run a chat completion and parse the response as JSON.
 * Returns null if no API key, on error, or if JSON parsing fails.
 */
export async function aiJSON<T>(
    systemPrompt: string,
    userPrompt: string,
    opts?: { maxTokens?: number; temperature?: number },
): Promise<T | null> {
    const client = getClient();
    if (!client) return null;

    try {
        const res = await client.chat.completions.create({
            model: MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            max_tokens: opts?.maxTokens ?? MAX_TOKENS,
            temperature: opts?.temperature ?? 0.7,
            response_format: { type: 'json_object' },
        });

        const text = res.choices[0]?.message?.content?.trim();
        if (!text) return null;
        return JSON.parse(text) as T;
    } catch (err) {
        console.error('[AI] JSON completion error:', err instanceof Error ? err.message : err);
        return null;
    }
}

/**
 * Check if AI is available (API key is set).
 */
export function isAIAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
}
