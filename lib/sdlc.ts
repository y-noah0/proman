/**
 * SDLC Orchestrator - Phase Management and Validation Logic
 * Enforces strict step-by-step workflow with gating and progress tracking
 */

import { SDLCPhase, SDLC_PHASES } from "./pfds";

export interface SDLCProjectState {
  id: string;
  projectName: string;
  description: string;
  
  // Business Definition Phase
  targetUsers?: string;
  coreProblem?: string;
  revenueModel?: string;
  businessDefined: boolean;
  
  // Phase completion tracking (0-7 for each phase)
  phaseCompletion: Record<SDLCPhase, boolean>;
  
  // Feature readiness tracking
  featureIds?: string[];
  completedFeatureIds?: string[];
  
  status: "Planning" | "Active" | "Completed";
  createdAt: string;
  updatedAt: string;
}

export interface PhaseRequirements {
  phase: SDLCPhase;
  name: string;
  description: string;
  requiredPrevious: SDLCPhase[];
  canNavigate: boolean;
  isComplete: boolean;
  completionPercentage: number;
}

export interface ProgressMetrics {
  overallProgress: number; // 0-100
  phaseProgress: Record<SDLCPhase, number>; // 0-100 per phase
  completedPhases: number; // out of 8
  currentPhase: SDLCPhase;
}

/**
 * Determine if a phase is unlocked based on previous completion
 */
export function isPhaseLocked(
  phase: SDLCPhase,
  projectState: Partial<SDLCProjectState>,
): boolean {
  const phaseIndex = SDLC_PHASES.indexOf(phase);
  if (phaseIndex === 0) return false; // First phase always unlocked

  const requiredPhase = SDLC_PHASES[phaseIndex - 1];
  return !projectState.phaseCompletion?.[requiredPhase];
}

/**
 * Get all phase requirements with current state
 */
export function getPhaseRequirements(
  projectState: Partial<SDLCProjectState>,
): PhaseRequirements[] {
  return SDLC_PHASES.map((phase, index) => {
    const isLocked = isPhaseLocked(phase, projectState);
    const isComplete = projectState.phaseCompletion?.[phase] ?? false;
    const phaseNames: Record<SDLCPhase, string> = {
      "business-definition": "Business Definition",
      "actors": "System Users & Actors",
      "capabilities": "Capabilities",
      "features": "Feature Breakdown",
      "api-contracts": "API Contracts",
      "ready-check": "Definition of Ready",
      "execution": "Sprint Execution",
      "review": "Review & Completion",
    };

    const descriptions: Record<SDLCPhase, string> = {
      "business-definition": "Define target users, core problem, and revenue model",
      "actors": "Identify system actors and their roles",
      "capabilities": "Define what each actor can do",
      "features": "Break down capabilities into features",
      "api-contracts": "Design API contracts for each feature",
      "ready-check": "Validate features meet readiness criteria",
      "execution": "Execute and track feature completion",
      "review": "Review and accept completed features",
    };

    return {
      phase,
      name: phaseNames[phase],
      description: descriptions[phase],
      requiredPrevious: SDLC_PHASES.slice(0, index),
      canNavigate: !isLocked,
      isComplete,
      completionPercentage: isComplete ? 100 : 0,
    };
  });
}

/**
 * Calculate overall progress metrics
 */
export function calculateProgressMetrics(
  projectState: Partial<SDLCProjectState>,
  totalFeatures: number = 0,
  completedFeatures: number = 0,
): ProgressMetrics {
  const phaseProgress: Record<SDLCPhase, number> = {} as any;
  let completedPhases = 0;

  SDLC_PHASES.forEach((phase) => {
    const isComplete = projectState.phaseCompletion?.[phase] ?? false;
    if (isComplete) completedPhases++;

    if (phase === "execution") {
      // Execution phase progress is based on feature completion
      if (totalFeatures === 0) {
        phaseProgress[phase] = isComplete ? 100 : 0;
      } else {
        phaseProgress[phase] = Math.round((completedFeatures / totalFeatures) * 100);
      }
    } else {
      phaseProgress[phase] = isComplete ? 100 : 0;
    }
  });

  // Overall progress: 7 base phases (12.5% each) + 1 execution phase weighted by features
  const baseProgress = (completedPhases / SDLC_PHASES.length) * 100;
  const executionWeight = phaseProgress["execution"];
  const overallProgress = Math.round(baseProgress * 0.875 + executionWeight * 0.125);

  const currentPhaseIndex = Math.min(
    completedPhases,
    SDLC_PHASES.length - 1,
  );

  return {
    overallProgress: Math.min(overallProgress, 100),
    phaseProgress,
    completedPhases,
    currentPhase: SDLC_PHASES[currentPhaseIndex],
  };
}

/**
 * Validate business definition is complete
 */
export function isBusinessDefinitionComplete(
  projectState: Partial<SDLCProjectState>,
): boolean {
  return !!(
    projectState.targetUsers?.trim() &&
    projectState.coreProblem?.trim() &&
    projectState.revenueModel?.trim()
  );
}

/**
 * Check if actors phase is complete (at least 1 actor)
 */
export function isActorsPhaseComplete(actors: unknown[]): boolean {
  return Array.isArray(actors) && actors.length > 0;
}

/**
 * Check if capabilities phase is complete (at least 1 capability)
 */
export function isCapabilitiesPhaseComplete(capabilities: unknown[]): boolean {
  return Array.isArray(capabilities) && capabilities.length > 0;
}

/**
 * Check if features phase is complete (at least 1 validated feature)
 */
export function areFeaturesComplete(
  features: Array<{ id?: string; validatedFeature?: boolean } | unknown>,
): boolean {
  return (
    Array.isArray(features) &&
    features.length > 0 &&
    features.some(
      (f) =>
        typeof f === "object" &&
        f !== null &&
        "validatedFeature" in f &&
        (f as any).validatedFeature === true,
    )
  );
}

/**
 * Validate if feature is ready for execution
 */
export function isFeatureReady(feature: {
  actorId?: string;
  capabilityId?: string;
  apiContractId?: string;
  validatedFeature?: boolean;
}): boolean {
  return !!(
    feature.actorId &&
    feature.capabilityId &&
    feature.apiContractId &&
    feature.validatedFeature
  );
}

/**
 * Get lock reason for a phase if it's locked
 */
export function getPhaseLockReason(
  phase: SDLCPhase,
  projectState: Partial<SDLCProjectState>,
): string | null {
  const phaseIndex = SDLC_PHASES.indexOf(phase);
  if (phaseIndex === 0) return null;

  const requiredPhase = SDLC_PHASES[phaseIndex - 1];
  const phaseNames: Record<SDLCPhase, string> = {
    "business-definition": "Business Definition",
    "actors": "System Users & Actors",
    "capabilities": "Capabilities",
    "features": "Feature Breakdown",
    "api-contracts": "API Contracts",
    "ready-check": "Definition of Ready",
    "execution": "Sprint Execution",
    "review": "Review & Completion",
  };

  if (!projectState.phaseCompletion?.[requiredPhase]) {
    return `Complete ${phaseNames[requiredPhase]} first`;
  }

  return null;
}
