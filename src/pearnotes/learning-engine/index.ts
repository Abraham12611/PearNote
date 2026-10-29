/**
 * PearNotes learning engine (issue #29) — pure, deterministic, auditable.
 * Public surface: types, evidence intake, mastery projection, remediation
 * policy + consent, journey projection, adapter boundary, fixture demo.
 */
export * from "./types";
export {
  validateEvidence,
  intakeEvidence,
  dedupeAttempts,
  relevantEvidence,
  type IntakeResult,
} from "./evidence";
export { deriveMastery } from "./mastery";
export { evaluateForRemediation, decideProposal } from "./remediation";
export { projectJourney, type CoreNodeInput } from "./journey";
export {
  type LearningEnginePort,
  type ValidatedActivityTemplate,
  validateTemplateChoice,
  evaluateObjectives,
} from "./adapter";
export { runBiologyDemo, type DemoStep } from "./demo";
export {
  FIX,
  AUTHORIZED_CELLS_SEGMENTS,
  AUTHORIZED_DIFFUSION_SEGMENTS,
  CELLS_REMEDIATION_SPEC,
  CORE_NODES,
  ev,
} from "./fixtures";
