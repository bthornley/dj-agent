// ============================================================
// DJ Event Agent — Core Data Model
// ============================================================

export type ArtistType = 'dj' | 'band' | 'solo_artist' | 'music_teacher';

export interface ScheduleMoment {
  time: string;       // e.g. "6:30 PM"
  moment: string;     // e.g. "First Dance"
  notes: string;
}

export type DeliverableType =
  | 'run_of_show'
  | 'proposal'
  | 'show_sheet'
  | 'gear_checklist'
  | 'email_draft';

export interface Deliverable {
  type: DeliverableType;
  content: string;       // rendered markdown/HTML
  status: 'draft' | 'approved' | 'sent';
  generatedAt: string;   // ISO date
}

export type EventType =
  | 'wedding'
  | 'corporate'
  | 'charity'
  | 'birthday'
  | 'after_party'
  | 'concert'
  | 'festival'
  | 'other';

export type EventStatus =
  | 'inquiry'
  | 'quoting'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export interface Event {
  id: string;
  status: EventStatus;

  // Client
  clientName: string;
  org: string;
  phone: string;
  email: string;

  // Venue
  venueName: string;
  address: string;
  loadInNotes: string;
  indoorOutdoor: 'indoor' | 'outdoor' | 'both' | '';

  // Date/Time
  date: string;            // YYYY-MM-DD
  startTime: string;       // HH:MM
  endTime: string;
  setupTime: string;
  strikeTime: string;

  // Event details
  eventType: EventType;
  attendanceEstimate: number;
  budgetRange: string;     // e.g. "$1,000 – $2,500"
  vibeDescription: string;

  // Schedule
  scheduleMoments: ScheduleMoment[];

  // Deliverables
  deliverables: Deliverable[];

  // Gear
  inventoryRequired: InventoryRequirement[];

  // Risks / Questions
  risks: string[];
  questions: string[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  rawInquiry: string;      // original text blob
}

export interface InventoryRequirement {
  itemId: string;
  quantity: number;
  notes: string;
}

// ---- Inventory (capability list) ----

export type GearCategory =
  | 'speakers'
  | 'subs'
  | 'mixer'
  | 'microphones'
  | 'stands'
  | 'cables'
  | 'lighting'
  | 'effects'
  | 'backups'
  | 'other';

export interface InventoryItem {
  id: string;
  name: string;
  category: GearCategory;
  quantity: number;
  backupAvailable: boolean;
  notes: string;
}

// ---- Proposal ----

export interface PackageTier {
  name: string;
  price: number;
  description: string;
  includes: string[];
}

export interface Proposal {
  packages: PackageTier[];
  addOns: { name: string; price: number }[];
  depositPercent: number;
  depositTerms: string;
  cancellationPolicy: string;
  powerRequirements: string;
  clientResponsibilities: string[];
}

// ---- Intake result ----

export interface IntakeResult {
  event: Partial<Event>;
  missingFields: string[];
  questions: string[];
}

// ---- Planner ----

export interface PlannerTask {
  id: string;
  type: DeliverableType;
  label: string;
  ready: boolean;
  blockers: string[];
}

export interface PlannerResult {
  tasks: PlannerTask[];
  summary: string;
}

// ============================================================
// Lead Finder Agent — Data Model
// ============================================================

export type LeadStatus =
  | 'new'
  | 'queued_for_dj_agent'
  | 'rejected'
  | 'contacted'
  | 'in_talks'
  | 'booked';

export type EntityType =
  | 'club'
  | 'bar'
  | 'hotel'
  | 'event_planner'
  | 'promoter'
  | 'corporate'
  | 'festival'
  | 'restaurant'
  | 'city_event'
  | 'lounge'
  | 'event_space'
  | 'brewery_winery'
  | 'rooftop'
  | 'other';

export type Priority = 'P1' | 'P2' | 'P3';
export type Confidence = 'low' | 'med' | 'high';
export type BudgetSignal = 'low' | 'med' | 'high' | 'unknown';

export interface Lead {
  // Identity
  lead_id: string;
  entity_name: string;
  entity_type: EntityType;
  city: string;
  state: string;
  neighborhood: string;
  website_url: string;
  source: string;  // google_maps, event_platform, instagram, venue_site, manual, etc.
  source_url: string;
  found_at: string; // ISO timestamp

  // Contact
  contact_name: string;
  role: string;  // GM, events director, booking, marketing, promoter
  email: string;
  phone: string;
  contact_form_url: string;
  instagram_handle: string;
  facebook_page: string;
  preferred_contact_method: string; // email/form/phone/IG

  // Event Fit
  music_fit_tags: string[];   // latin, open format, house, corporate, etc.
  event_types_seen: string[]; // DJ nights, private parties, corporate mixers
  capacity_estimate: number | null;
  budget_signal: BudgetSignal;
  notes: string;

  // Scoring
  lead_score: number;       // 0–100
  score_reason: string;
  confidence: Confidence;
  priority: Priority;
  status: LeadStatus;

  // Dedup & Audit
  dedupe_key: string;
  raw_snippet: string;
  agent_trace: string;
}

export interface QuerySeed {
  id: string;
  region: string;        // e.g. "Orange County", "Long Beach"
  keywords: string[];     // e.g. ["nightclub", "lounge", "DJ night"]
  source: string;         // google_maps, web_search, etc.
  active: boolean;
  created_at: string;
}

export interface LeadHandoff {
  lead_id: string;
  entity_name: string;
  entity_type: EntityType;
  city: string;
  state: string;
  source_url: string;
  email: string;
  contact_form_url: string;
  phone: string;
  instagram_handle: string;
  lead_score: number;
  score_reason: string;
  notes: string;
  suggested_angle: string;  // "weekday residency", "branded party", etc.
  brief: string;            // 2–4 sentence summary
  // Optional enriched fields
  contact_name: string;
  role: string;
  event_types_seen: string[];
  music_fit_tags: string[];
}
