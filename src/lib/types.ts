// ============================================================
// GigLift — Core Data Model
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
  mode?: string;           // 'performer' | 'teacher'
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

// ============================================================
// Social Hype Agent — Data Model
// ============================================================

export type MediaType = 'image' | 'video' | 'audio';

export interface MediaAsset {
  id: string;
  fileName: string;           // original file name
  fileSize: number;           // bytes
  mimeType: string;           // e.g. image/jpeg, video/mp4
  mediaType: MediaType;       // image, video, or audio
  url: string;                // blob storage URL
  thumbnailUrl: string;       // smaller preview URL (same as url for images)
  width: number;              // 0 if unknown
  height: number;             // 0 if unknown
  duration: number;           // seconds, 0 for images
  tags: string[];             // user-assigned tags for search/filter
  usedInPosts: string[];      // post IDs where this asset was used
  createdAt: string;
  updatedAt: string;
}

export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'soundcloud' | 'spotify';

export interface ConnectedAccount {
  platform: SocialPlatform;
  handle: string;              // @username or page name
  profileUrl: string;          // full URL to profile
  accessToken: string;         // platform API access token
  pageId: string;              // Meta Page ID (for FB) or IG Business Account ID
  connected: boolean;          // whether we have a valid token
  lastVerified: string;        // ISO timestamp of last token check
  tokenExpiresAt: string;      // ISO timestamp when token expires
}

export interface BrandProfile {
  id: string;
  voiceExamples: string[];       // 5 captions they wrote
  vibeWords: string[];           // e.g. ["energy", "underground", "party"]
  emojis: string[];              // emojis they actually use
  avoidTopics: string[];         // topics to never touch
  profanityLevel: 'none' | 'mild' | 'any';
  politicsAllowed: boolean;
  locations: string[];           // cities/regions they play
  typicalVenues: string[];       // venue names
  brandColors: string[];         // hex codes
  djName: string;
  bio: string;
  connectedAccounts: ConnectedAccount[];
  updatedAt: string;
}

export interface EPKCustomSection {
  id: string;
  title: string;
  body: string;
}

export interface EPKConfig {
  headline: string;          // custom headline override
  tagline: string;           // one-liner under the name
  bio: string;               // custom EPK bio (may differ from brand bio)
  sectionOrder: string[];    // section IDs in display order
  hiddenSections: string[];  // section IDs to hide
  customSections: EPKCustomSection[];
  selectedMedia: string[];   // media asset IDs to show (empty = show all)
  selectedEvents: string[];  // event IDs to show (empty = show all)
  theme: 'dark' | 'light' | 'gradient';
  accentColor: string;       // hex override
  updatedAt: string;
}

export type ContentPillar =
  | 'event'              // upcoming events (flyers, set times, ticket links)
  | 'proof_of_party'     // crowd clips, reactions, before/after
  | 'taste_identity'     // micro-edits, crate digs, "track ID?" bait
  | 'education'          // Q&As, "help me pick the opener", polls
  | 'credibility';       // testimonials, venue tags, collaborator shoutouts

export type PostType =
  | 'reel'
  | 'carousel'
  | 'story'
  | 'fb_event'
  | 'fb_post'
  | 'live';

export type PostPlatform = 'instagram' | 'facebook' | 'both';

export type PostStatus =
  | 'idea'
  | 'draft'
  | 'approved'
  | 'scheduled'
  | 'posted'
  | 'rejected';

export interface SocialPost {
  id: string;
  pillar: ContentPillar;
  postType: PostType;
  platform: PostPlatform;
  hookText: string;              // first 1–2 lines
  caption: string;               // full caption
  hashtags: string[];            // tight set, 6–15
  cta: string;                   // "comment", "save", "DM SETLIST", etc.
  mediaRefs: string[];           // filenames/paths of attached media
  status: PostStatus;
  scheduledFor: string;          // ISO datetime
  postedAt: string;              // ISO datetime
  variant: 'A' | 'B';           // A/B testing
  variantPairId: string;         // links A/B variants
  eventId: string;               // linked event (if pillar=event)
  planId: string;                // parent content plan
  notes: string;                 // internal notes
  createdAt: string;
  updatedAt: string;
}

export type ContentPlanStatus = 'draft' | 'approved' | 'active' | 'completed';

export interface ContentPlanTargets {
  reels: number;
  carousels: number;
  stories: number;       // per day
  fbEvents: number;
  fbPosts: number;
  lives: number;
}

export interface ContentPlan {
  id: string;
  weekOf: string;                // ISO date (Monday)
  theme: string;                 // weekly theme
  targets: ContentPlanTargets;
  postIds: string[];             // SocialPost IDs in this plan
  status: ContentPlanStatus;
  strategyNotes: string;         // why this theme/mix was chosen
  createdAt: string;
  updatedAt: string;
}

export type EngagementTaskType =
  | 'reply_comment'
  | 'reply_dm'
  | 'outbound_comment'
  | 'collab_outreach'
  | 'venue_tag'
  | 'promoter_connect';

export type EngagementTaskStatus = 'pending' | 'approved' | 'completed' | 'skipped';

export interface EngagementTask {
  id: string;
  type: EngagementTaskType;
  target: string;                // @handle, page name, or post URL
  context: string;               // "Promoter asked about rates", "Crowd comment on reel"
  draftReply: string;            // suggested reply text
  status: EngagementTaskStatus;
  requiresApproval: boolean;     // true for booking/money DMs
  handoffReason: string;         // why it needs human review
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReport {
  id: string;
  weekOf: string;
  reach: number;
  impressions: number;
  saves: number;
  shares: number;
  comments: number;
  followerGrowth: number;
  profileVisits: number;
  linkClicks: number;
  topPostIds: string[];          // best performing post IDs
  insights: string[];            // "Crowd clips beat studio clips 2.3×"
  recommendations: string[];    // "Increase reel frequency next week"
  createdAt: string;
}
