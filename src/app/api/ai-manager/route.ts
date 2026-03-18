import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { OpenAI } from "openai";

// Edge runtime isn't totally required, but good for stream performance if Vercel supports it here.
// However, Next 14+ raw body parsing with formidable/busboy is easier in Node runtime.
// We'll stick to standard Node for robust multipart formData handling.
export const maxDuration = 60; // Allow up to 60s for the STT -> LLM -> TTS pipeline

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// The persona prompt we defined earlier
const SYSTEM_PROMPT = `You are strictly professional, formal, and highly efficient. Think of a top-tier, seasoned booking agent or a highly organized executive assistant. You do not use slang, emojis, or overly casual language.
*Tone:* Confident, concise, polite, and strictly business-oriented.
*Vocabulary:* Understand industry terminology (rider, load-in, deposit, backline, flat fee vs. rev share). Always use proper terms.
*Pacing:* Because you are a voice assistant, your spoken responses must be extremely brief and to the point. Never read out long lists or full contracts. Summarize the key points and direct the user to the visual "Action Card" on their screen for details.

Core Rules & Constraints
1. Never commit without approval: You can draft counter-offers, acceptances, or emails, but you must ask for final confirmation before executing a binding action.
2. Speak for the screen: Assume the user is looking at their phone. Use phrases like, "I've put the details on your screen," or "Tap approve when you're ready."
3. No hallucinations: If you don't know the answer based on the context provided, say "I don't have that information right now," rather than guessing.`;

// Define the tools/functions the LLM can use to interact with the GigLift backend.
const TOOLS = [
    {
        type: "function" as const,
        function: {
            name: "draft_offer_response",
            description: "Drafts an acceptance, decline, or counter-offer for a specific gig or general request.",
            parameters: {
                type: "object",
                properties: {
                    action: {
                        type: "string",
                        enum: ["accept", "decline", "counter"],
                        description: "The type of response to draft.",
                    },
                    amount: {
                        type: "number",
                        description: "The total fee or counter-offer amount in dollars.",
                    },
                    deposit_percentage: {
                        type: "number",
                        description: "The required deposit percentage (e.g., 20 for 20%).",
                    },
                    client_name: {
                        type: "string",
                        description: "The name of the client or venue, if specified.",
                    }
                },
                required: ["action"],
            },
        },
    },
    {
        type: "function" as const,
        function: {
            name: "get_pending_requests",
            description: "Retrieves details of new gig offers. Use this when the user asks if they have any new gigs or offers.",
            parameters: { type: "object", properties: {} },
        },
    },
    {
        type: "function" as const,
        function: {
            name: "get_agenda",
            description: "Retrieves the user's confirmed schedule. Use this when asked about upcoming gigs, load-in times, or dates.",
            parameters: {
                type: "object",
                properties: {
                    date: {
                        type: "string",
                        description: "The date to check (e.g., 'tomorrow', 'Friday', '2024-05-12').",
                    }
                }
            },
        },
    },
    {
        type: "function" as const,
        function: {
            name: "review_leads_overview",
            description: "Retrieves a summary of total leads generated vs active seeds. Use when user asks about their leads, searches, or query performance.",
            parameters: { type: "object", properties: {} },
        },
    },
    {
        type: "function" as const,
        function: {
            name: "read_new_leads",
            description: "Reads the current list of new leads out loud to the user.",
            parameters: { type: "object", properties: {} },
        },
    },
    {
        type: "function" as const,
        function: {
            name: "add_query_seed",
            description: "Creates a new seed configuration for the Lead Finder agent. Use when user wants to search a new city, region, or keywords.",
            parameters: {
                type: "object",
                properties: {
                    region: { type: "string", description: "The city or region to search (e.g., 'Los Angeles')" },
                    keywords: {
                        type: "array",
                        items: { type: "string" },
                        description: "List of keywords to search for (e.g., ['corporate events', 'lounge'])"
                    }
                },
                required: ["region", "keywords"],
            },
        },
    },
    {
        type: "function" as const,
        function: {
            name: "adjust_query_seed",
            description: "Disables or modifies an existing poor-performing seed.",
            parameters: {
                type: "object",
                properties: {
                    action: { type: "string", enum: ["disable", "modify"], description: "Whether to disable or modify the seed." },
                    region: { type: "string", description: "The city or region of the seed to adjust." },
                    keywords: {
                        type: "array",
                        items: { type: "string" },
                        description: "New keywords if modifying."
                    }
                },
                required: ["action", "region"],
            },
        },
    },
    {
        type: "function" as const,
        function: {
            name: "get_business_overview",
            description: "Retrieves a quick overview of the user's business for today, including agenda, gig requests, and new leads.",
            parameters: { type: "object", properties: {} },
        },
    },
    {
        type: "function" as const,
        function: {
            name: "promote_with_social_hype_crew",
            description: "Requests the Social Hype Crew to start promoting an upcoming gig or event.",
            parameters: {
                type: "object",
                properties: {
                    event_name: { type: "string", description: "The name or description of the event to promote." }
                },
                required: ["event_name"],
            },
        },
    }
];

export async function POST(req: NextRequest) {
    try {
        // Enforce Server-Side Tenant Isolation
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = await currentUser();
        const userFirstName = user?.firstName || "User";

        const formData = await req.formData();
        const audioFile = formData.get("audio") as File;

        if (!audioFile) {
            return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
        }

        // 1. STT: Transcribe the audio using OpenAI Whisper
        // Whisper expects a File object (which Next.js formData natively provides)
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
        });

        const userText = transcription.text;
        console.log("🗣️ User Input (Whisper):", userText);

        if (!userText || userText.trim() === '') {
            return NextResponse.json({ error: "Could not transcribe audio" }, { status: 400 });
        }

        // 2. LLM: Process intent with GPT-4o
        // We inject strict tenant context to ensure the AI only acts on this user's data
        const context = `Current Context: 
- User Name: ${userFirstName}
- Tenant/User ID: ${userId}
- Pending Requests: 1 (Tilly's Golf Tournament, May 12th, $800 offer)
- Active Leads Overview: 3 active seeds, 42 total leads.
- Top New Leads: Knitting Factory (Los Angeles), The Roxy (West Hollywood)`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: `${SYSTEM_PROMPT}\n\n${context}` },
                { role: "user", content: userText },
            ],
            tools: TOOLS as any,
            tool_choice: "auto",
        });

        const responseMsg = completion.choices[0].message;
        let aiSpokenText = responseMsg.content || "";
        let actionCardPayload: any = { type: "generic_text", data: { text: aiSpokenText } };

        // Handle Function Calling (if the LLM determined an action is necessary)
        if (responseMsg.tool_calls && responseMsg.tool_calls.length > 0) {
            const toolCall = responseMsg.tool_calls[0];
            const functionName = (toolCall as any).function?.name;
            const functionArgs = JSON.parse((toolCall as any).function?.arguments || "{}");

            console.log(`🛠️ LLM Tool Call: ${functionName}`, functionArgs);

            // In a full production app, you would execute actual DB logic here.
            // For the demo, we map the intent directly to the UI Action Card.
            
            if (functionName === "draft_offer_response") {
                // Generate the spoken response summarizing the action
                aiSpokenText = `Got it. I'm drafting a ${functionArgs.action} for ${functionArgs.amount ? '$'+functionArgs.amount : 'the gig'}${functionArgs.deposit_percentage ? ' with a ' + functionArgs.deposit_percentage + '% deposit' : ''}. Ready to send?`;
                actionCardPayload = {
                    type: "draft_contract",
                    data: {
                        action: functionArgs.action,
                        amount: functionArgs.amount || null,
                        deposit: functionArgs.deposit_percentage || null,
                        client: functionArgs.client_name || "Client"
                    }
                };
            } else if (functionName === "get_pending_requests") {
                aiSpokenText = "You have one new request. Tilly's wants you for a golf tournament on May 12th for 800 dollars. I've put the details on your screen.";
                actionCardPayload = {
                    type: "gig_request",
                    data: { client: "Tilly's", date: "May 12th", amount: 800, type: "Golf Tournament" }
                };
            } else if (functionName === "get_agenda") {
                aiSpokenText = "Looking at your schedule. I've pulled up your agenda on the screen.";
                actionCardPayload = {
                    type: "agenda",
                    data: { date: functionArgs.date || "Upcoming" }
                };
            } else if (functionName === "review_leads_overview") {
                aiSpokenText = "You currently have 3 active seeds which have generated 42 potential leads this week. Would you like me to read the newest ones to you?";
                actionCardPayload = {
                    type: "seeds_overview",
                    data: { activeSeeds: 3, totalLeads: 42 }
                };
            } else if (functionName === "read_new_leads") {
                aiSpokenText = "Your top new leads in Los Angeles are the Knitting Factory and The Roxy. I've put them on your screen so you can track them.";
                actionCardPayload = {
                    type: "read_leads",
                    data: { 
                        leads: [
                            { name: "Knitting Factory", location: "Los Angeles", match: "98%" },
                            { name: "The Roxy", location: "West Hollywood", match: "95%" }
                        ] 
                    }
                };
            } else if (functionName === "add_query_seed") {
                aiSpokenText = `Got it. I've added a new seed for ${functionArgs.region} searching for ${functionArgs.keywords.join(" and ")}. The lead finder agent will start scanning shortly.`;
                actionCardPayload = {
                    type: "seed_adjusted",
                    data: { action: "added", region: functionArgs.region, keywords: functionArgs.keywords }
                };
            } else if (functionName === "adjust_query_seed") {
                aiSpokenText = `I've ${functionArgs.action}d the seed for ${functionArgs.region}.`;
                actionCardPayload = {
                    type: "seed_adjusted",
                    data: { action: functionArgs.action, region: functionArgs.region, keywords: functionArgs.keywords || [] }
                };
            } else if (functionName === "get_business_overview") {
                aiSpokenText = "Here is your business overview. You have one pending request from Tilly's, 3 active seeds generating leads, and your schedule is clear for today.";
                actionCardPayload = {
                    type: "generic_text",
                    data: { text: "Business Overview: 1 pending request, 3 active seeds, 42 total leads. No confirmed gigs today." }
                };
            } else if (functionName === "promote_with_social_hype_crew") {
                aiSpokenText = `Got it. I've sent a request to the Social Hype Crew to start promoting ${functionArgs.event_name || 'your upcoming gig'}. They are drafting content now.`;
                actionCardPayload = {
                    type: "generic_text",
                    data: { text: `Social Hype Crew activated for: ${functionArgs.event_name || 'upcoming event'}.` }
                };
            }
        }

        // Fallback if no text was generated
        if (!aiSpokenText) {
            aiSpokenText = "I tracked that, but I don't have a response right now.";
        }

        console.log("🤖 AI Response (Text):", aiSpokenText);
        console.log("🃏 UI Action Card:", actionCardPayload);

        // 3. TTS: Generate Audio for the AI's response using the Nova voice
        const mp3Response = await openai.audio.speech.create({
            model: "tts-1",
            voice: "nova",
            input: aiSpokenText,
        });

        const audioBuffer = Buffer.from(await mp3Response.arrayBuffer());

        // Return the Audio File combined with the Action Card payload in the headers
        // so the frontend can play the audio and render the UI simultaneously.
        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "X-Action-Card": JSON.stringify(actionCardPayload),
            },
        });

    } catch (error) {
        console.error("AI Manager Pipeline Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error in AI Pipeline" },
            { status: 500 }
        );
    }
}
