/**
 * API publik modul project. Modul lain dan UI hanya boleh mengimpor dari sini (Technical Design §5.1).
 */
export { createProject, STAGE_ORDER } from './application/create-project';
export type { CreateProjectInput, CreateProjectResult, StagePlanInput } from './application/create-project';
export {
  reviseStageEstimate,
  setManualProgress,
  updateStagePlanning,
  updateStageStatus,
} from './application/stage-use-cases';
export type {
  ReviseStageEstimateInput,
  ReviseStageEstimateResult,
  SetManualProgressInput,
  UpdateStagePlanningInput,
  UpdateStageStatusInput,
  UpdateStageStatusResult,
} from './application/stage-use-cases';
export { getProjectDetail, getProjectFormOptions, listActiveProjectViews, listNewAssignments, listProjectOptions, normalizePaging, PAGE_SIZES, searchProjects } from './application/project-queries';
export type { ProjectDetail, ProjectFormOptions, ProjectViewMode, SearchProjectsInput, SearchProjectsResult } from './application/project-queries';
export type { ProjectView, StageProgressView, StageRights, StageView } from './application/view-models';
export { updateStage } from './application/update-stage';
export type { UpdateStageInput, UpdateStageResult } from './application/update-stage';
export { applyCardRevision, getCardStageTarget, startProjectFromCard } from './application/card-link';
export type { CardRevisionInput, CardRevisionOutcome, CardStageTarget } from './application/card-link';
export { updateProjectInfo } from './application/update-project-info';
export type { UpdateProjectInfoInput } from './application/update-project-info';
export type {
  Assignee,
  CardSourcePort,
  PicCardSummary,
  ProjectDeps,
  NewAssignmentRow,
  PicRef,
  ProjectFilter,
  ProjectQueryRepository,
  ProjectRepository,
  StageStatusFilter,
  ProjectSnapshot,
  ReferencePort,
  RevisionRow,
  StageCardFacts,
  StageRef,
  StageSnapshot,
} from './application/ports';
export { PROJECT_STATUS_LABEL, STAGE_LABEL, STAGE_STATUS_LABEL } from './application/support';
export type { ProjectInfoInput, ProjectType } from './domain/project-rules';
export type { GanttBar } from './domain/gantt-bar';
export type { CompletionVerdict, DisplayStatus } from './domain/stage-lateness';
export type { Estimate, ProjectStatus, StageKind, StageStatus } from './domain/stage-types';
export { planAutoRevision } from './domain/revision';
export type { AutoRevisionPlan, RevisionWarning } from './domain/revision';
export { createPrismaProjectRepository } from './infrastructure/prisma-project-repository';
export { createPrismaProjectQueries } from './infrastructure/prisma-project-queries';
export { createPrismaReference } from './infrastructure/prisma-reference-and-cards';
export { cardWeight } from './domain/stage-progress';
export type { ProgressCard } from './domain/stage-progress';
