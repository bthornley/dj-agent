import { Event } from './types';

// ============================================================
// In-memory event store (v1 — no database)
// Persists to localStorage on the client, in-memory on the server.
// ============================================================

const STORAGE_KEY = 'dj-agent-events';

let memoryStore: Event[] = [];

export function getAllEvents(): Event[] {
    if (typeof window !== 'undefined') {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }
    return memoryStore;
}

export function getEvent(id: string): Event | undefined {
    return getAllEvents().find((e) => e.id === id);
}

export function saveEvent(event: Event): void {
    const events = getAllEvents();
    const idx = events.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
        events[idx] = event;
    } else {
        events.push(event);
    }
    persist(events);
}

export function deleteEvent(id: string): void {
    const events = getAllEvents().filter((e) => e.id !== id);
    persist(events);
}

function persist(events: Event[]): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    }
    memoryStore = events;
}
