export const PROJECT_STATUSES = ["Planning", "Active", "Completed"] as const;
export const FEATURE_PRIORITIES = ["Must", "Should", "Could", "Won't"] as const;
export const FEATURE_STATUSES = [
  "Not Started",
  "In Progress",
  "Done",
  "Review",
  "Accepted",
  "Needs Revision",
] as const;
export const CONTRACT_METHODS = ["GET", "POST", "PATCH", "DELETE"] as const;
export const CONTRACT_STATUSES = ["Draft", "Agreed", "Implemented"] as const;
export const CONSOLIDATION_TYPES = [
  "Duplicate API",
  "Too many calls",
  "Naming inconsistency",
  "Data inefficiency",
] as const;
export const CONSOLIDATION_STATUSES = ["Pending", "Fixed"] as const;
export const BLUEPRINT_TYPES = ["Entity", "Flow", "Rule", "UX Rule"] as const;

// SDLC Phase enum for strict workflow
export const SDLC_PHASES = [
  "business-definition",
  "actors",
  "capabilities",
  "features",
  "api-contracts",
  "ready-check",
  "execution",
  "review",
] as const;
export type SDLCPhase = (typeof SDLC_PHASES)[number];

export const PFDS_COLLECTIONS = [
  "projects",
  "actors",
  "capabilities",
  "features",
  "api-contracts",
  "consolidation-log",
  "system-blueprint",
] as const;

export type PfdsCollectionName = (typeof PFDS_COLLECTIONS)[number];

export function formatTimeline(startDate?: string, endDate?: string): string {
  if (!startDate || !endDate) {
    return "Timeline TBD";
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Timeline TBD";
  }

  const fmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${fmt.format(start)} - ${fmt.format(end)}`;
}

export function withProjectDisplayName<T extends Record<string, unknown>>(
  project: T,
): T & { timeline: string; displayName: string } {
  const projectName =
    typeof project.projectName === "string" ? project.projectName : "Untitled Project";
  const startDate = typeof project.startDate === "string" ? project.startDate : undefined;
  const endDate = typeof project.endDate === "string" ? project.endDate : undefined;
  const timeline = formatTimeline(startDate, endDate);
  const displayName = `${projectName} (${timeline})`;
  return {
    ...project,
    timeline,
    displayName,
  };
}
