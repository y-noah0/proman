/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { SDLCPhase } from "@/lib/pfds";
import {
  areFeaturesComplete,
  calculateProgressMetrics,
  isActorsPhaseComplete,
  isCapabilitiesPhaseComplete,
} from "@/lib/sdlc";
import { LoadingSpinner, ErrorAlert } from "@/app/components/ui";
import { ProgressBar } from "@/app/components/progress-bar";
import { PhaseNavigation } from "@/app/components/phase-navigation";
import { BusinessDefinitionPhase } from "@/app/components/business-definition-phase";
import { ActorsModal } from "@/app/components/actors-modal";
import { CapabilitiesModal } from "@/app/components/capabilities-modal";
import { FeaturesModal } from "@/app/components/features-modal";
import { useOptimisticList } from "@/lib/optimistic";

// Helper to ensure proper phase completion record
function getEmptyPhaseCompletion(): Record<SDLCPhase, boolean> {
  return {
    "business-definition": false,
    "actors": false,
    "capabilities": false,
    "features": false,
    "api-contracts": false,
    "ready-check": false,
    "execution": false,
    "review": false,
  };
}

type Project = {
  id: string;
  projectName: string;
  description: string;
  status: "Planning" | "Active" | "Completed";
  targetUsers?: string;
  coreProblem?: string;
  revenueModel?: string;
  phaseCompletion?: Record<SDLCPhase, boolean>;
};

type Actor = { id: string; name: string; description: string };
type Capability = { id: string; name: string; actorIds?: string[]; description: string };
type Feature = {
  id: string;
  featureName: string;
  actorId?: string;
  capabilityId?: string;
  priority: "Must" | "Should" | "Could" | "Won't";
  status: string;
  validatedFeature?: boolean;
  apiContractId?: string;
  description: string;
  acceptanceCriteria: string;
  timeline?: string;
};

type ApiContract = {
  id: string;
  endpoint: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  requestSchema: string;
  responseSchema: string;
  status: "Draft" | "Agreed" | "Implemented";
  featureId?: string;
  notes: string;
};

type ContractDraft = {
  endpoint: string;
  method: ApiContract["method"];
  requestSchema: string;
  responseSchema: string;
  notes: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Request failed: ${url}`);
  return (await response.json()) as T;
}

async function createItem<T>(
  collection: string,
  projectId: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`/api/pfds/${collection}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, projectId }),
  });
  if (!response.ok) throw new Error("Failed to create item");
  return (await response.json()) as T;
}

async function updateItem<T>(
  collection: string,
  itemId: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`/api/pfds/${collection}/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to update item");
  return (await response.json()) as T;
}

async function updateProject(projectId: string, payload: Record<string, unknown>): Promise<Project> {
  const response = await fetch(`/api/pfds/projects/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to update project");
  return (await response.json()) as Project;
}

async function deleteItem(collection: string, itemId: string): Promise<void> {
  const response = await fetch(`/api/pfds/${collection}/${itemId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete item");
}

export default function SDLCOrchestratorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageMode, setPageMode] = useState<"workflow" | "execution">("workflow");
  const [currentPhase, setCurrentPhase] = useState<SDLCPhase>("business-definition");

  // Modals
  const [showActorsModal, setShowActorsModal] = useState(false);
  const [showCapabilitiesModal, setShowCapabilitiesModal] = useState(false);
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [editingActorId, setEditingActorId] = useState<string | null>(null);
  const [editingCapabilityId, setEditingCapabilityId] = useState<string | null>(null);
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
  const [capabilityQuickInputs, setCapabilityQuickInputs] = useState<Record<string, string>>({});
  const [featureQuickInputs, setFeatureQuickInputs] = useState<Record<string, string>>({});
  const [contractDrafts, setContractDrafts] = useState<Record<string, ContractDraft>>({});
  const [savingContractForFeatureId, setSavingContractForFeatureId] = useState<string | null>(null);
  const [actorDraft, setActorDraft] = useState<Omit<Actor, "id">>({
    name: "",
    description: "",
  });
  const [capabilityDraft, setCapabilityDraft] = useState<Omit<Capability, "id">>({
    name: "",
    actorIds: [],
    description: "",
  });
  const [featureDraft, setFeatureDraft] = useState<Omit<Feature, "id">>({
    featureName: "",
    actorId: "",
    capabilityId: "",
    priority: "Should",
    status: "Not Started",
    validatedFeature: false,
    apiContractId: "",
    description: "",
    acceptanceCriteria: "",
    timeline: "",
  });

  // Optimistic lists
  const actorsOpt = useOptimisticList<Actor>(
    [],
    (item) => createItem("actors", projectId, item),
    (id, item) => updateItem("actors", id, item),
    (id) => deleteItem("actors", id),
  );

  const capabilitiesOpt = useOptimisticList<Capability>(
    [],
    (item) => createItem("capabilities", projectId, item),
    (id, item) => updateItem("capabilities", id, item),
    (id) => deleteItem("capabilities", id),
  );

  const featuresOpt = useOptimisticList<Feature>(
    [],
    (item) => createItem("features", projectId, item),
    (id, item) => updateItem("features", id, item),
    (id) => deleteItem("features", id),
  );

  const contractsOpt = useOptimisticList<ApiContract>(
    [],
    (item) => createItem("api-contracts", projectId, item),
    (id, item) => updateItem("api-contracts", id, item),
    (id) => deleteItem("api-contracts", id),
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      await fetchJson<{ authenticated: boolean }>("/api/auth/session");
    } catch {
      router.replace("/login");
      return;
    }

    try {
      const [p, a, c, f, contracts] = await Promise.all([
        fetchJson<Project>(`/api/pfds/projects/${projectId}`),
        fetchJson<Actor[]>(`/api/pfds/actors?projectId=${projectId}`),
        fetchJson<Capability[]>(`/api/pfds/capabilities?projectId=${projectId}`),
        fetchJson<Feature[]>(`/api/pfds/features?projectId=${projectId}`),
        fetchJson<ApiContract[]>(`/api/pfds/api-contracts?projectId=${projectId}`),
      ]);

      setProject(p);
      actorsOpt.setItems(a);
      capabilitiesOpt.setItems(c);
      featuresOpt.setItems(f);
      contractsOpt.setItems(contracts);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  // Calculate progress
  const projectState = project
    ? {
        ...project,
        phaseCompletion: {
          ...getEmptyPhaseCompletion(),
          ...project.phaseCompletion,
        },
      }
    : null;

  const progressMetrics =
    projectState && project
      ? calculateProgressMetrics(
          projectState,
          featuresOpt.items.length,
          featuresOpt.items.filter((f) => f.status === "Done").length,
        )
      : null;

  const handlePhaseSelect = (phase: SDLCPhase) => {
    setCurrentPhase(phase);
  };

  const handleBusinessDefinitionSave = async (data: {
    targetUsers: string;
    coreProblem: string;
    revenueModel: string;
  }) => {
    if (!project) return;
    const updated = await updateProject(projectId, {
      ...data,
      phaseCompletion: {
        ...getEmptyPhaseCompletion(),
        ...project.phaseCompletion,
        "business-definition": true,
      },
    });
    setProject(updated);
    // Auto-advance to next phase
    setCurrentPhase("actors");
  };

  const markPhaseComplete = async (phase: SDLCPhase) => {
    if (!project) return;
    const nextCompletion = {
      ...getEmptyPhaseCompletion(),
      ...project.phaseCompletion,
      [phase]: true,
    };
    setProject({ ...project, phaseCompletion: nextCompletion });
    try {
      await updateProject(projectId, { phaseCompletion: nextCompletion });
    } catch {
      // Keep optimistic UI state; this can be retried later on further updates.
    }
  };

  const handleQuickAddCapability = async (actor: Actor) => {
    const rawName = (capabilityQuickInputs[actor.id] ?? "").trim();
    if (!rawName) return;

    const existing = capabilitiesOpt.items.find(
      (cap) => cap.name.toLowerCase() === rawName.toLowerCase(),
    );

    if (existing) {
      const nextActorIds = Array.from(new Set([...(existing.actorIds ?? []), actor.id]));
      if (nextActorIds.length !== (existing.actorIds ?? []).length) {
        await capabilitiesOpt.update(existing.id, {
          ...existing,
          actorIds: nextActorIds,
        });
      }
    } else {
      await capabilitiesOpt.create({
        name: rawName,
        actorIds: [actor.id],
        description: "",
      });
    }

    setCapabilityQuickInputs((prev) => ({ ...prev, [actor.id]: "" }));
  };

  const handleQuickAddFeature = async (capability: Capability) => {
    const rawName = (featureQuickInputs[capability.id] ?? "").trim();
    if (!rawName) return;

    const existing = featuresOpt.items.find(
      (feature) => feature.featureName.toLowerCase() === rawName.toLowerCase(),
    );

    const defaultActorId = capability.actorIds?.[0] ?? "";

    if (existing && existing.capabilityId === capability.id) {
      setFeatureQuickInputs((prev) => ({ ...prev, [capability.id]: "" }));
      return;
    }

    if (existing) {
      await featuresOpt.create({
        featureName: rawName,
        actorId: existing.actorId || defaultActorId,
        capabilityId: capability.id,
        priority: existing.priority,
        status: "Not Started",
        validatedFeature: false,
        apiContractId: "",
        description: existing.description,
        acceptanceCriteria: existing.acceptanceCriteria,
        timeline: existing.timeline ?? "",
      });
    } else {
      await featuresOpt.create({
        featureName: rawName,
        actorId: defaultActorId,
        capabilityId: capability.id,
        priority: "Should",
        status: "Not Started",
        validatedFeature: false,
        apiContractId: "",
        description: "",
        acceptanceCriteria: "",
        timeline: "",
      });
    }

    setFeatureQuickInputs((prev) => ({ ...prev, [capability.id]: "" }));
  };

  const getContractByFeatureId = (featureId?: string) => {
    if (!featureId) return null;
    return contractsOpt.items.find((contract) => contract.featureId === featureId) ?? null;
  };

  const getContractDraft = (feature: Feature): ContractDraft => {
    const localDraft = contractDrafts[feature.id];
    if (localDraft) return localDraft;
    const existingContract = getContractByFeatureId(feature.id);
    if (existingContract) {
      return {
        endpoint: existingContract.endpoint,
        method: existingContract.method,
        requestSchema: existingContract.requestSchema,
        responseSchema: existingContract.responseSchema,
        notes: existingContract.notes,
      };
    }
    return {
      endpoint: "",
      method: "GET",
      requestSchema: "",
      responseSchema: "",
      notes: "",
    };
  };

  const setContractDraftField = (
    featureId: string,
    field: keyof ContractDraft,
    value: string,
  ) => {
    setContractDrafts((prev) => {
      const current = prev[featureId] ?? {
        endpoint: "",
        method: "GET" as ApiContract["method"],
        requestSchema: "",
        responseSchema: "",
        notes: "",
      };
      return {
        ...prev,
        [featureId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const saveContractForFeature = async (feature: Feature) => {
    const draft = getContractDraft(feature);
    if (!draft.endpoint.trim() || !draft.requestSchema.trim() || !draft.responseSchema.trim()) {
      return;
    }

    setSavingContractForFeatureId(feature.id);
    try {
      const existing = getContractByFeatureId(feature.id);
      if (existing) {
        await contractsOpt.update(existing.id, {
          ...existing,
          ...draft,
          featureId: feature.id,
          status: existing.status || "Draft",
        });
      } else {
        const created = await contractsOpt.create({
          ...draft,
          featureId: feature.id,
          status: "Draft",
        });
        await featuresOpt.update(feature.id, {
          ...feature,
          apiContractId: created.id,
        });
      }
    } finally {
      setSavingContractForFeatureId(null);
    }
  };

  const isFeatureReadyForExecution = (feature: Feature) => {
    const hasContract = !!getContractByFeatureId(feature.id);
    const businessComplete = !!project?.phaseCompletion?.["business-definition"];
    return !!(
      businessComplete &&
      feature.actorId &&
      feature.capabilityId &&
      feature.validatedFeature &&
      hasContract
    );
  };

  const readyFeatures = featuresOpt.items.filter(isFeatureReadyForExecution);
  const executionPool =
    readyFeatures.length > 0
      ? readyFeatures
      : featuresOpt.items.filter((feature) =>
          ["Not Started", "In Progress", "Needs Revision", "Done", "Accepted"].includes(feature.status),
        );
  const executionFeatures = executionPool.filter((feature) =>
    ["Not Started", "In Progress", "Needs Revision"].includes(feature.status),
  );
  const reviewFeatures = executionPool.filter((feature) => feature.status === "Done");
  const executionCanContinue =
    executionPool.length > 0 &&
    executionFeatures.length === 0 &&
    executionPool.some((feature) => ["Done", "Accepted"].includes(feature.status));
  const universalExecutionProgress =
    featuresOpt.items.length === 0
      ? 0
      : Math.round(
          (featuresOpt.items.filter((feature) => ["Done", "Accepted"].includes(feature.status)).length /
            featuresOpt.items.length) *
            100,
        );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner label="Loading SDLC Orchestrator..." />
      </div>
    );
  }

  if (!project || !projectState || !progressMetrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorAlert message={error || "Failed to load project"} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      {/* Left Sidebar with Phase Navigation */}
      <PhaseNavigation
        projectState={projectState}
        currentPhase={currentPhase}
        onPhaseSelect={handlePhaseSelect}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden pb-28">
        {/* Progress Bar */}
        <ProgressBar progress={progressMetrics.overallProgress} />

        <div className="border-b border-[var(--line)] bg-[var(--bg-card)] px-6 py-3">
          <div className="flex w-fit items-center gap-2 rounded-lg border border-[var(--line)] p-1">
            <button
              onClick={() => setPageMode("workflow")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                pageMode === "workflow"
                  ? "bg-[var(--accent-2)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--line)]"
              }`}
            >
              Workflow
            </button>
            <button
              onClick={() => setPageMode("execution")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                pageMode === "execution"
                  ? "bg-[var(--accent-2)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--line)]"
              }`}
            >
              Execution
            </button>
          </div>
        </div>

        {/* Phase Content */}
        {pageMode === "workflow" && (
          <>
        {currentPhase === "business-definition" && (
          <BusinessDefinitionPhase
            projectName={project.projectName}
            targetUsers={project.targetUsers || ""}
            coreProblem={project.coreProblem || ""}
            revenueModel={project.revenueModel || ""}
            isLoading={loading}
            onSave={handleBusinessDefinitionSave}
          />
        )}

        {currentPhase === "actors" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-[var(--line)] bg-[var(--bg-card)] px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => setCurrentPhase("business-definition")}
                    className="px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--line)] rounded-lg"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => {
                      if (isActorsPhaseComplete(actorsOpt.items)) {
                          void markPhaseComplete("actors");
                        setCurrentPhase("capabilities");
                      }
                    }}
                    disabled={!isActorsPhaseComplete(actorsOpt.items)}
                    className="px-6 py-2 bg-[var(--accent-2)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    Continue →
                  </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-8 pb-32">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                  System Users & Actors
                </h1>
                <p className="text-[var(--text-secondary)] mb-6">
                  Define who interacts with your system. Each actor represents a distinct user role or persona.
                </p>

                <button
                  onClick={() => setShowActorsModal(true)}
                  className="px-4 py-2 bg-[var(--accent-2)] text-white rounded-lg font-medium hover:opacity-90"
                >
                  + Add Actor
                </button>

                <div className="mt-6">
                  {actorsOpt.items.length === 0 ? (
                    <div className="text-center py-8 bg-[var(--bg-card)] rounded-lg border border-[var(--line)]">
                      <p className="text-[var(--text-secondary)]">
                        No actors defined yet. Add at least one to continue.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {actorsOpt.items.map((actor) => (
                        <div
                          key={actor.id}
                          className="bg-[var(--bg-card)] border border-[var(--line)] rounded-lg p-4 hover:border-[var(--accent-2)] transition-colors"
                        >
                          {editingActorId === actor.id ? (
                            <div className="space-y-3">
                              <input
                                value={actorDraft.name}
                                onChange={(e) =>
                                  setActorDraft((prev) => ({ ...prev, name: e.target.value }))
                                }
                                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--text-primary)]"
                              />
                              <textarea
                                value={actorDraft.description}
                                onChange={(e) =>
                                  setActorDraft((prev) => ({ ...prev, description: e.target.value }))
                                }
                                rows={2}
                                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--text-primary)]"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setEditingActorId(null)}
                                  className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--line)]"
                                  aria-label="Cancel actor edit"
                                >
                                  <X size={16} />
                                </button>
                                <button
                                  onClick={async () => {
                                    await actorsOpt.update(actor.id, actorDraft);
                                    setEditingActorId(null);
                                  }}
                                  className="rounded-lg p-2 text-[var(--accent-2)] hover:bg-[var(--line)]"
                                  aria-label="Save actor edit"
                                >
                                  <Check size={16} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-semibold">{actor.name}</h3>
                                {actor.description && (
                                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                                    {actor.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingActorId(actor.id);
                                    setActorDraft({
                                      name: actor.name,
                                      description: actor.description,
                                    });
                                  }}
                                  className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--line)]"
                                  aria-label="Edit actor"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  onClick={() => actorsOpt.delete(actor.id)}
                                  className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                                  aria-label="Delete actor"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPhase === "capabilities" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-[var(--line)] bg-[var(--bg-card)] px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => setCurrentPhase("actors")}
                    className="px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--line)] rounded-lg"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => {
                      if (isCapabilitiesPhaseComplete(capabilitiesOpt.items)) {
                          void markPhaseComplete("capabilities");
                        setCurrentPhase("features");
                      }
                    }}
                    disabled={!isCapabilitiesPhaseComplete(capabilitiesOpt.items)}
                    className="px-6 py-2 bg-[var(--accent-2)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    Continue →
                  </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-8 pb-32">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                  Capabilities
                </h1>
                <p className="text-[var(--text-secondary)] mb-6">
                  Add capabilities directly under each actor. Type an existing capability to auto-link it to another actor.
                </p>

                <div className="mt-6">
                  {actorsOpt.items.length === 0 ? (
                    <div className="text-center py-8 bg-[var(--bg-card)] rounded-lg border border-[var(--line)]">
                      <p className="text-[var(--text-secondary)]">
                        Add actors first to define capabilities by actor section.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {actorsOpt.items.map((actor) => {
                        const actorCapabilities = capabilitiesOpt.items.filter((cap) =>
                          (cap.actorIds ?? []).includes(actor.id),
                        );
                        return (
                          <section
                            key={actor.id}
                            className="bg-[var(--bg-card)] border border-[var(--line)] rounded-lg p-4"
                          >
                            <h3 className="font-semibold text-lg">{actor.name}</h3>
                            {actor.description && (
                              <p className="text-sm text-[var(--text-secondary)] mt-1">
                                {actor.description}
                              </p>
                            )}

                            <div className="mt-4 flex gap-2">
                              <input
                                list={`capability-suggestions-${actor.id}`}
                                value={capabilityQuickInputs[actor.id] ?? ""}
                                onChange={(e) =>
                                  setCapabilityQuickInputs((prev) => ({
                                    ...prev,
                                    [actor.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void handleQuickAddCapability(actor);
                                  }
                                }}
                                placeholder="Add capability (autocomplete enabled)"
                                className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--text-primary)]"
                              />
                              <datalist id={`capability-suggestions-${actor.id}`}>
                                {Array.from(new Set(capabilitiesOpt.items.map((cap) => cap.name))).map((name) => (
                                  <option key={name} value={name} />
                                ))}
                              </datalist>
                              <button
                                onClick={() => void handleQuickAddCapability(actor)}
                                className="rounded-lg bg-[var(--accent-2)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                              >
                                Add
                              </button>
                            </div>

                            {actorCapabilities.length === 0 ? (
                              <p className="mt-4 text-sm text-[var(--text-secondary)]">
                                No capabilities for this actor yet.
                              </p>
                            ) : (
                              <div className="mt-4 space-y-3">
                                {actorCapabilities.map((cap) => (
                                  <div
                                    key={`${actor.id}-${cap.id}`}
                                    className="border border-[var(--line)] rounded-lg p-4 hover:border-[var(--accent-2)] transition-colors"
                                  >
                          {editingCapabilityId === cap.id ? (
                            <div className="space-y-3">
                              <input
                                value={capabilityDraft.name}
                                onChange={(e) =>
                                  setCapabilityDraft((prev) => ({ ...prev, name: e.target.value }))
                                }
                                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--text-primary)]"
                              />
                              <div className="rounded-lg border border-[var(--line)] bg-[var(--bg)] p-3">
                                <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">
                                  Linked actors
                                </p>
                                <div className="flex flex-wrap gap-3">
                                  {actorsOpt.items.map((actor) => {
                                    const checked = capabilityDraft.actorIds?.includes(actor.id);
                                    return (
                                      <label key={actor.id} className="flex items-center gap-2 text-sm">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(e) => {
                                            setCapabilityDraft((prev) => {
                                              const current = prev.actorIds ?? [];
                                              return {
                                                ...prev,
                                                actorIds: e.target.checked
                                                  ? [...current, actor.id]
                                                  : current.filter((id) => id !== actor.id),
                                              };
                                            });
                                          }}
                                        />
                                        {actor.name}
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                              <textarea
                                value={capabilityDraft.description}
                                onChange={(e) =>
                                  setCapabilityDraft((prev) => ({ ...prev, description: e.target.value }))
                                }
                                rows={2}
                                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--text-primary)]"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setEditingCapabilityId(null)}
                                  className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--line)]"
                                  aria-label="Cancel capability edit"
                                >
                                  <X size={16} />
                                </button>
                                <button
                                  onClick={async () => {
                                    await capabilitiesOpt.update(cap.id, capabilityDraft);
                                    setEditingCapabilityId(null);
                                  }}
                                  className="rounded-lg p-2 text-[var(--accent-2)] hover:bg-[var(--line)]"
                                  aria-label="Save capability edit"
                                >
                                  <Check size={16} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-semibold">{cap.name}</h3>
                                {cap.actorIds && cap.actorIds.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {cap.actorIds.map((actorId) => {
                                      const actor = actorsOpt.items.find((a) => a.id === actorId);
                                      return (
                                        <span
                                          key={actorId}
                                          className="text-xs bg-[var(--accent-2)] bg-opacity-20 text-[var(--accent-2)] px-2 py-1 rounded"
                                        >
                                          {actor?.name || "Unknown"}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                                {cap.description && (
                                  <p className="text-sm text-[var(--text-secondary)] mt-2">
                                    {cap.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingCapabilityId(cap.id);
                                    setCapabilityDraft({
                                      name: cap.name,
                                      actorIds: cap.actorIds ?? [],
                                      description: cap.description,
                                    });
                                  }}
                                  className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--line)]"
                                  aria-label="Edit capability"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  onClick={() => capabilitiesOpt.delete(cap.id)}
                                  className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                                  aria-label="Delete capability"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </section>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPhase === "features" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-[var(--line)] bg-[var(--bg-card)] px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setCurrentPhase("capabilities")}
                  className="px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--line)] rounded-lg"
                >
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (areFeaturesComplete(featuresOpt.items)) {
                      void markPhaseComplete("features");
                      setCurrentPhase("api-contracts");
                    }
                  }}
                  disabled={!areFeaturesComplete(featuresOpt.items)}
                  className="px-6 py-2 bg-[var(--accent-2)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                >
                  Continue →
                </button>
              </div>
            </div>
            <div className="flex-1 p-8 pb-32 overflow-auto">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                  Feature Breakdown
                </h1>
                <p className="text-[var(--text-secondary)] mb-6">
                  Add features under each capability section. Autocomplete helps you reuse feature patterns quickly.
                </p>

                <div className="mt-6">
                  {capabilitiesOpt.items.length === 0 ? (
                    <div className="text-center py-8 bg-[var(--bg-card)] rounded-lg border border-[var(--line)]">
                      <p className="text-[var(--text-secondary)]">
                        Define capabilities first, then add features under each capability.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {capabilitiesOpt.items.map((capability) => {
                        const capabilityFeatures = featuresOpt.items.filter(
                          (feature) => feature.capabilityId === capability.id,
                        );

                        return (
                          <section
                            key={capability.id}
                            className="bg-[var(--bg-card)] border border-[var(--line)] rounded-lg p-4"
                          >
                            <h3 className="font-semibold text-lg">{capability.name}</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(capability.actorIds ?? []).map((actorId) => {
                                const actor = actorsOpt.items.find((item) => item.id === actorId);
                                return (
                                  <span
                                    key={`${capability.id}-${actorId}`}
                                    className="text-xs bg-[var(--accent-2)] bg-opacity-20 text-[var(--accent-2)] px-2 py-1 rounded"
                                  >
                                    {actor?.name ?? "Unknown actor"}
                                  </span>
                                );
                              })}
                            </div>

                            <div className="mt-4 flex gap-2">
                              <input
                                list={`feature-suggestions-${capability.id}`}
                                value={featureQuickInputs[capability.id] ?? ""}
                                onChange={(e) =>
                                  setFeatureQuickInputs((prev) => ({
                                    ...prev,
                                    [capability.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void handleQuickAddFeature(capability);
                                  }
                                }}
                                placeholder="Add feature (autocomplete enabled)"
                                className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--text-primary)]"
                              />
                              <datalist id={`feature-suggestions-${capability.id}`}>
                                {Array.from(new Set(featuresOpt.items.map((feature) => feature.featureName))).map(
                                  (name) => (
                                    <option key={name} value={name} />
                                  ),
                                )}
                              </datalist>
                              <button
                                onClick={() => void handleQuickAddFeature(capability)}
                                className="rounded-lg bg-[var(--accent-2)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                              >
                                Add
                              </button>
                            </div>

                            {capabilityFeatures.length === 0 ? (
                              <p className="mt-4 text-sm text-[var(--text-secondary)]">
                                No features for this capability yet.
                              </p>
                            ) : (
                              <div className="mt-4 space-y-3">
                                {capabilityFeatures.map((feature) => (
                                  <div
                                    key={feature.id}
                                    className="border border-[var(--line)] rounded-lg p-4 hover:border-[var(--accent-2)] transition-colors"
                                  >
                        {editingFeatureId === feature.id ? (
                          <div className="space-y-3">
                            <input
                              value={featureDraft.featureName}
                              onChange={(e) =>
                                setFeatureDraft((prev) => ({ ...prev, featureName: e.target.value }))
                              }
                              className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--text-primary)]"
                            />
                            <textarea
                              value={featureDraft.description}
                              onChange={(e) =>
                                setFeatureDraft((prev) => ({ ...prev, description: e.target.value }))
                              }
                              rows={2}
                              className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--text-primary)]"
                            />
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={featureDraft.validatedFeature || false}
                                onChange={(e) =>
                                  setFeatureDraft((prev) => ({
                                    ...prev,
                                    validatedFeature: e.target.checked,
                                  }))
                                }
                              />
                              Validated feature
                            </label>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditingFeatureId(null)}
                                className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--line)]"
                                aria-label="Cancel feature edit"
                              >
                                <X size={16} />
                              </button>
                              <button
                                onClick={async () => {
                                  await featuresOpt.update(feature.id, featureDraft);
                                  setEditingFeatureId(null);
                                }}
                                className="rounded-lg p-2 text-[var(--accent-2)] hover:bg-[var(--line)]"
                                aria-label="Save feature edit"
                              >
                                <Check size={16} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={feature.validatedFeature || false}
                                onChange={(e) => {
                                  featuresOpt.update(feature.id, {
                                    ...feature,
                                    validatedFeature: e.target.checked,
                                  });
                                }}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <h3 className="font-semibold">{feature.featureName}</h3>
                                {feature.description && (
                                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                                    {feature.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingFeatureId(feature.id);
                                  setFeatureDraft({
                                    ...feature,
                                  });
                                }}
                                className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--line)]"
                                aria-label="Edit feature"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => featuresOpt.delete(feature.id)}
                                className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                                aria-label="Delete feature"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </section>
                        );
                      })}
                    </div>
                  )}
                </div>
            </div>
          </div>
          </div>
        )}

        {currentPhase === "api-contracts" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-[var(--line)] bg-[var(--bg-card)] px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setCurrentPhase("features")}
                  className="px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--line)] rounded-lg"
                >
                  ← Back
                </button>
                <button
                  onClick={() => {
                    const contractsComplete =
                      featuresOpt.items.length > 0 &&
                      featuresOpt.items.every((feature) => !!getContractByFeatureId(feature.id));
                    if (contractsComplete) {
                      void markPhaseComplete("api-contracts");
                      setCurrentPhase("ready-check");
                    }
                  }}
                  disabled={
                    featuresOpt.items.length === 0 ||
                    !featuresOpt.items.every((feature) => !!getContractByFeatureId(feature.id))
                  }
                  className="px-6 py-2 bg-[var(--accent-2)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                >
                  Continue →
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-8 pb-32">
              <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">API Contracts</h1>
                <p className="text-[var(--text-secondary)] mb-6">
                  Every feature must have an endpoint, method, and request/response schema before moving forward.
                </p>

                {featuresOpt.items.length === 0 ? (
                  <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-card)] p-6 text-[var(--text-secondary)]">
                    Add features first to design API contracts.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {featuresOpt.items.map((feature) => {
                      const actorName = actorsOpt.items.find((a) => a.id === feature.actorId)?.name ?? "Unlinked actor";
                      const capabilityName =
                        capabilitiesOpt.items.find((c) => c.id === feature.capabilityId)?.name ?? "Unlinked capability";
                      const contract = getContractDraft(feature);
                      const hasContract = !!getContractByFeatureId(feature.id);
                      return (
                        <section
                          key={feature.id}
                          className="rounded-lg border border-[var(--line)] bg-[var(--bg-card)] p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <h3 className="font-semibold">{feature.featureName}</h3>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {actorName} · {capabilityName}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-xs ${
                                hasContract
                                  ? "bg-green-500/15 text-green-400"
                                  : "bg-yellow-500/15 text-yellow-400"
                              }`}
                            >
                              {hasContract ? "Contract linked" : "Missing contract"}
                            </span>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <input
                              value={contract.endpoint}
                              onChange={(e) => setContractDraftField(feature.id, "endpoint", e.target.value)}
                              placeholder="/api/example"
                              className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--text-primary)]"
                            />
                            <select
                              value={contract.method}
                              onChange={(e) =>
                                setContractDraftField(feature.id, "method", e.target.value as ApiContract["method"])
                              }
                              className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--text-primary)]"
                            >
                              <option value="GET">GET</option>
                              <option value="POST">POST</option>
                              <option value="PATCH">PATCH</option>
                              <option value="DELETE">DELETE</option>
                            </select>
                            <textarea
                              value={contract.requestSchema}
                              onChange={(e) =>
                                setContractDraftField(feature.id, "requestSchema", e.target.value)
                              }
                              placeholder='{"field":"type"}'
                              rows={3}
                              className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--text-primary)]"
                            />
                            <textarea
                              value={contract.responseSchema}
                              onChange={(e) =>
                                setContractDraftField(feature.id, "responseSchema", e.target.value)
                              }
                              placeholder='{"result":"type"}'
                              rows={3}
                              className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--text-primary)]"
                            />
                          </div>
                          <textarea
                            value={contract.notes}
                            onChange={(e) => setContractDraftField(feature.id, "notes", e.target.value)}
                            placeholder="Optional contract notes"
                            rows={2}
                            className="mt-3 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--text-primary)]"
                          />
                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={() => void saveContractForFeature(feature)}
                              disabled={savingContractForFeatureId === feature.id}
                              className="rounded-lg bg-[var(--accent-2)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                            >
                              {savingContractForFeatureId === feature.id ? "Saving..." : hasContract ? "Update Contract" : "Save Contract"}
                            </button>
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentPhase === "ready-check" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-[var(--line)] bg-[var(--bg-card)] px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setCurrentPhase("api-contracts")}
                  className="px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--line)] rounded-lg"
                >
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (readyFeatures.length > 0 && readyFeatures.length === featuresOpt.items.length) {
                      void markPhaseComplete("ready-check");
                      setCurrentPhase("execution");
                    }
                  }}
                  disabled={readyFeatures.length === 0 || readyFeatures.length !== featuresOpt.items.length}
                  className="px-6 py-2 bg-[var(--accent-2)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                >
                  Continue →
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-8 pb-32">
              <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Definition of Ready</h1>
                <p className="text-[var(--text-secondary)] mb-6">
                  A feature is ready only when business context is complete and actor, capability, validation, and API contract are all present.
                </p>

                <div className="space-y-4">
                  {featuresOpt.items.map((feature) => {
                    const checks = [
                      {
                        label: "Business Definition complete",
                        pass: !!projectState.phaseCompletion["business-definition"],
                      },
                      { label: "Actor linked", pass: !!feature.actorId },
                      { label: "Capability linked", pass: !!feature.capabilityId },
                      { label: "Feature validated", pass: !!feature.validatedFeature },
                      { label: "API contract exists", pass: !!getContractByFeatureId(feature.id) },
                    ];
                    const ready = checks.every((item) => item.pass);
                    return (
                      <section
                        key={feature.id}
                        className="rounded-lg border border-[var(--line)] bg-[var(--bg-card)] p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="font-semibold">{feature.featureName}</h3>
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              ready ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"
                            }`}
                          >
                            {ready ? "Ready" : "Not Ready"}
                          </span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {checks.map((item) => (
                            <div key={item.label} className="flex items-center gap-2 text-sm">
                              <span className={item.pass ? "text-green-400" : "text-yellow-400"}>
                                {item.pass ? "✓" : "•"}
                              </span>
                              <span>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPhase === "execution" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-[var(--line)] bg-[var(--bg-card)] px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setCurrentPhase("ready-check")}
                  className="px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--line)] rounded-lg"
                >
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (executionCanContinue) {
                      void markPhaseComplete("execution");
                      setCurrentPhase("review");
                    }
                  }}
                  disabled={!executionCanContinue}
                  className="px-6 py-2 bg-[var(--accent-2)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                >
                  Continue →
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-8 pb-32">
              <div className="mx-auto max-w-5xl">
                <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Execution (Sprint)</h1>
                <p className="text-[var(--text-secondary)] mb-6">
                  Only ready features appear here. Move each feature through execution until done.
                </p>

                {executionFeatures.length === 0 ? (
                  <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-card)] p-6 text-[var(--text-secondary)]">
                    {executionCanContinue
                      ? "All executable items are done. Continue to move into review."
                      : "No executable features right now. Ensure features are ready, or move done items to review."}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {executionFeatures.map((feature) => (
                      <section
                        key={feature.id}
                        className="rounded-lg border border-[var(--line)] bg-[var(--bg-card)] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{feature.featureName}</h3>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {capabilitiesOpt.items.find((c) => c.id === feature.capabilityId)?.name ?? "No capability"}
                            </p>
                          </div>
                          <select
                            value={feature.status}
                            onChange={(e) => {
                              void featuresOpt.update(feature.id, {
                                ...feature,
                                status: e.target.value,
                              });
                            }}
                            className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
                          >
                            <option value="Not Started">Not Started</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Done">Done</option>
                            <option value="Needs Revision">Needs Revision</option>
                          </select>
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentPhase === "review" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-[var(--line)] bg-[var(--bg-card)] px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setCurrentPhase("execution")}
                  className="px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--line)] rounded-lg"
                >
                  ← Back
                </button>
                <button
                  onClick={() => {
                    const reviewDone =
                      executionPool.length > 0 &&
                      executionPool.every((feature) => feature.status === "Accepted");
                    if (reviewDone) {
                      void markPhaseComplete("review");
                    }
                  }}
                  disabled={
                    executionPool.length === 0 ||
                    !executionPool.every((feature) => feature.status === "Accepted")
                  }
                  className="px-6 py-2 bg-[var(--accent-2)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                >
                  Complete Workflow
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-8 pb-32">
              <div className="mx-auto max-w-5xl">
                <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Review & Completion</h1>
                <p className="text-[var(--text-secondary)] mb-6">
                  Review completed features. Rejected items are sent back to Execution automatically.
                </p>

                {reviewFeatures.length === 0 ? (
                  <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-card)] p-6 text-[var(--text-secondary)]">
                    No completed features waiting for review.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviewFeatures.map((feature) => (
                      <section
                        key={feature.id}
                        className="rounded-lg border border-[var(--line)] bg-[var(--bg-card)] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{feature.featureName}</h3>
                            <p className="text-xs text-[var(--text-secondary)]">Status: Done</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                void featuresOpt.update(feature.id, {
                                  ...feature,
                                  status: "Accepted",
                                });
                              }}
                              className="rounded-lg bg-green-500/20 px-3 py-2 text-sm font-medium text-green-400 hover:bg-green-500/30"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => {
                                void featuresOpt.update(feature.id, {
                                  ...feature,
                                  status: "Needs Revision",
                                });
                                setCurrentPhase("execution");
                              }}
                              className="rounded-lg bg-yellow-500/20 px-3 py-2 text-sm font-medium text-yellow-400 hover:bg-yellow-500/30"
                            >
                              Needs Revision
                            </button>
                          </div>
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
          </>
        )}

        {pageMode === "execution" && (
          <div className="flex-1 overflow-auto p-8 pb-32">
            <div className="mx-auto max-w-6xl space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">Execution Overview</h1>
                <p className="mt-2 text-[var(--text-secondary)]">
                  Structured delivery view across todo, statuses, and review progress.
                </p>
              </div>

              <section className="rounded-lg border border-[var(--line)] bg-[var(--bg-card)] p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold">Universal Progress</span>
                  <span className="text-[var(--text-secondary)]">{universalExecutionProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--line)]">
                  <div
                    className="h-2 rounded-full bg-[var(--accent-2)] transition-all"
                    style={{ width: `${universalExecutionProgress}%` }}
                  />
                </div>
              </section>

              <div className="grid gap-4 lg:grid-cols-3">
                <section className="rounded-lg border border-[var(--line)] bg-[var(--bg-card)] p-4">
                  <h2 className="mb-3 text-lg font-semibold">Todo List</h2>
                  {executionFeatures.length === 0 ? (
                    <p className="text-sm text-[var(--text-secondary)]">No pending items.</p>
                  ) : (
                    <div className="space-y-3">
                      {executionFeatures.map((feature) => (
                        <div key={`todo-${feature.id}`} className="rounded-md border border-[var(--line)] p-3">
                          <p className="font-medium">{feature.featureName}</p>
                          <p className="mb-2 text-xs text-[var(--text-secondary)]">{feature.status}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                void featuresOpt.update(feature.id, {
                                  ...feature,
                                  status: "In Progress",
                                })
                              }
                              className="rounded bg-[var(--line)] px-2 py-1 text-xs hover:bg-[var(--accent-2)] hover:text-white"
                            >
                              Start
                            </button>
                            <button
                              onClick={() =>
                                void featuresOpt.update(feature.id, {
                                  ...feature,
                                  status: "Done",
                                })
                              }
                              className="rounded bg-green-500/20 px-2 py-1 text-xs text-green-300 hover:bg-green-500/30"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-lg border border-[var(--line)] bg-[var(--bg-card)] p-4 lg:col-span-2">
                  <h2 className="mb-3 text-lg font-semibold">Features by Status</h2>
                  {featuresOpt.items.length === 0 ? (
                    <p className="text-sm text-[var(--text-secondary)]">No features available.</p>
                  ) : (
                    <div className="space-y-3">
                      {featuresOpt.items.map((feature) => (
                        <div
                          key={`status-${feature.id}`}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--line)] p-3"
                        >
                          <div>
                            <p className="font-medium">{feature.featureName}</p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {capabilitiesOpt.items.find((cap) => cap.id === feature.capabilityId)?.name ?? "No capability"}
                            </p>
                          </div>
                          <select
                            value={feature.status}
                            onChange={(e) =>
                              void featuresOpt.update(feature.id, {
                                ...feature,
                                status: e.target.value,
                              })
                            }
                            className="rounded-md border border-[var(--line)] bg-[var(--bg)] px-2 py-1 text-sm"
                          >
                            <option value="Not Started">Not Started</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Done">Done</option>
                            <option value="Accepted">Accepted</option>
                            <option value="Needs Revision">Needs Revision</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ActorsModal
        isOpen={showActorsModal}
        onClose={() => setShowActorsModal(false)}
        actors={actorsOpt.items}
        onAdd={(actor) => actorsOpt.create(actor)}
        onDelete={(id) => actorsOpt.delete(id)}
        isLoading={loading}
      />

      <CapabilitiesModal
        isOpen={showCapabilitiesModal}
        onClose={() => setShowCapabilitiesModal(false)}
        capabilities={capabilitiesOpt.items}
        actors={actorsOpt.items}
        onAdd={(capability) => capabilitiesOpt.create(capability)}
        onDelete={(id) => capabilitiesOpt.delete(id)}
        isLoading={loading}
      />

      <FeaturesModal
        isOpen={showFeaturesModal}
        onClose={() => setShowFeaturesModal(false)}
        features={featuresOpt.items as any}
        actors={actorsOpt.items}
        capabilities={capabilitiesOpt.items}
        onAdd={(feature) => featuresOpt.create(feature)}
        onDelete={(id) => featuresOpt.delete(id)}
        isLoading={loading}
      />
    </div>
  );
}
