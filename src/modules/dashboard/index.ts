/**
 * API publik modul dashboard (Dashboard Head, Dashboard PIC, Riwayat). Modul lain dan UI hanya boleh mengimpor dari
 * sini (Technical Design §5.1).
 */
export { getDailyActivity, getDoneStages, donePeriodRange, DONE_PAGE_SIZES } from './application/history';
export type { DailyActivityDay, DailyActivityResult, DonePeriod, DoneStagesResult, DoneStageView } from './application/history';
export { getHeadDashboard } from './application/head-dashboard';
export type { CapacityRow, DueRow, HeadDashboard, QualityRow, RiskRow, RoleSummary } from './application/head-dashboard';
export { getPicDashboard } from './application/pic-dashboard';
export type { CardSummary, PicDashboard, QueueRow, TimelineStage } from './application/pic-dashboard';
export { capacityRange } from './application/capacity-view';
export type { CapacityMode, CapacitySlice, PicCapacity } from './application/capacity-view';
export type { DashboardDeps, DashLog, LoginPic } from './application/ports';
export type { Capacity, CapacityStatus } from './domain/capacity';
export type { LogQuality } from './domain/activity-quality';
export type { ScheduleConflict } from './domain/schedule';
export { createPrismaDashboardReads } from './infrastructure/prisma-dashboard-reads';
