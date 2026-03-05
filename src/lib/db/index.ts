// ============================================================
// Database Barrel — Re-exports all domain modules
// Import from '@/lib/db' works exactly as before (zero breaking changes)
// ============================================================

export { getDb, clampPageSize, dbGetSearchQuota, dbIncrementSearchQuota } from './connection';
export type { PaginationOptions, PaginatedResult } from './connection';
export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './connection';

export { dbGetAllEvents, dbGetEvent, dbSaveEvent, dbDeleteEvent, dbSearchEvents } from './events';

export { dbGetAllLeads, dbGetLead, dbSaveLead, dbDeleteLead, dbDeleteAllLeads, dbFindLeadByDedupeKey, dbGetLeadStats, dbGetHandoffQueue } from './leads';
export { dbGetAllSeeds, dbSaveSeed, dbDeleteSeed, dbDeleteAllSeeds } from './leads';
export type { LeadFilters } from './leads';

export { dbGetBrandProfile, dbSaveBrandProfile } from './social';
export { dbGetAllSocialPosts, dbGetSocialPost, dbSaveSocialPost, dbDeleteSocialPost, dbGetPostStats } from './social';
export { dbGetContentPlan, dbGetLatestContentPlan, dbSaveContentPlan } from './social';
export { dbGetEngagementTasks, dbSaveEngagementTask } from './social';
export { dbGetAllMediaAssets, dbGetMediaAsset, dbSaveMediaAsset, dbDeleteMediaAsset } from './social';
export { dbGetPlatformStats, dbGetUserStats } from './social';
export type { SocialPostFilters } from './social';

export { dbGetEPKConfig, dbSaveEPKConfig } from './epk';
export { dbGetFlyers, dbGetFlyer, dbSaveFlyer, dbDeleteFlyer } from './epk';
export type { FlyerConfig } from './epk';

export { dbSaveSentEmail, dbGetSentEmails, dbGetSentEmail } from './emails';
export { dbGetEmailTemplates, dbSaveEmailTemplate, dbDeleteEmailTemplate } from './emails';
export type { EmailTemplate } from './emails';
