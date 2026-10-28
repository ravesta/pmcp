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
export { updateProjectInfo } from './application/update-project-info';
export type { UpdateProjectInfoInput } from './application/update-project-info';
export type {
  Assignee,
  CardSourcePort,
  ProjectDeps,
  ProjectRepository,
  ProjectSnapshot,
  ReferencePort,
  RevisionRow,
  StageCardFacts,
  StageRef,
  StageSnapshot,
} from './application/ports';
export { PROJECT_STATUS_LABEL, STAGE_LABEL, STAGE_STATUS_LABEL } from './application/support';
export type { ProjectType } from './domain/project-rules';
export type { Estimate, ProjectStatus, StageKind, StageStatus } from './domain/stage-types';
export { createPrismaProjectRepository } from './infrastructure/prisma-project-repository';
export { createPrismaCardSource, createPrismaReference } from './infrastructure/prisma-reference-and-cards';
