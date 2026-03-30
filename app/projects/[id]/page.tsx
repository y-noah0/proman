/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";

type Project = {
  id: string;
  projectName: string;
  description: string;
  status: "Planning" | "Active" | "Completed";
  displayName: string;
  timeline: string;
};

type Actor = { id: string; name: string; description: string };
type Capability = { id: string; name: string; actorId?: string; description: string };
type Feature = {
  id: string;
  featureName: string;
  actorId?: string;
  capabilityId?: string;
  priority: "Must" | "Should" | "Could" | "Won't";
  status: "Backlog" | "Planning" | "Ready" | "In Progress" | "Review" | "Done";
  definitionOfReady: boolean;
  definitionOfDone: boolean;
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

type ConsolidationLog = {
  id: string;
  issue: string;
  type: "Duplicate API" | "Too many calls" | "Naming inconsistency" | "Data inefficiency";
  description: string;
  affectedFeatureId?: string;
  actionTaken: string;
  status: "Pending" | "Fixed";
};

type BlueprintItem = {
  id: string;
  itemName: string;
  type: "Entity" | "Flow" | "Rule" | "UX Rule";
  description: string;
};

type FeatureView = "Kanban" | "Ready to Build" | "Needs Contract" | "In Progress" | "Review Queue";
type ContractView = "All Contracts" | "Unapproved Contracts";

const FEATURE_STATUSES: Feature["status"][] = ["Backlog", "Planning", "Ready", "In Progress", "Review", "Done"];

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed: ${url}`);
  }
  return (await response.json()) as T;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card fade-in p-5">
      <p className="section-title">{title}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function ProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [actors, setActors] = useState<Actor[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [contracts, setContracts] = useState<ApiContract[]>([]);
  const [logs, setLogs] = useState<ConsolidationLog[]>([]);
  const [blueprints, setBlueprints] = useState<BlueprintItem[]>([]);

  const [featureView, setFeatureView] = useState<FeatureView>("Kanban");
  const [contractView, setContractView] = useState<ContractView>("All Contracts");

  const [error, setError] = useState("");

  const [newActor, setNewActor] = useState({ name: "", description: "" });
  const [newCapability, setNewCapability] = useState({ name: "", actorId: "", description: "" });
  const [newBlueprint, setNewBlueprint] = useState({ itemName: "", type: "Entity", description: "" });
  const [newFeature, setNewFeature] = useState({
    featureName: "",
    actorId: "",
    capabilityId: "",
    priority: "Should",
    status: "Backlog",
    definitionOfReady: false,
    definitionOfDone: false,
    apiContractId: "",
    description: "",
    acceptanceCriteria: "",
    timeline: "",
  });
  const [newContract, setNewContract] = useState({
    endpoint: "",
    method: "GET",
    requestSchema: "",
    responseSchema: "",
    status: "Draft",
    featureId: "",
    notes: "",
  });
  const [newLog, setNewLog] = useState({
    issue: "",
    type: "Data inefficiency",
    description: "",
    affectedFeatureId: "",
    actionTaken: "",
    status: "Pending",
  });

  const loadAll = useCallback(async () => {
    try {
      await fetchJson<{ authenticated: true; username: string }>("/api/auth/session");
    } catch {
      router.replace("/login");
      return;
    }

    try {
      const [p, a, c, f, api, log, bp] = await Promise.all([
        fetchJson<Project>(`/api/pfds/projects/${projectId}`),
        fetchJson<Actor[]>(`/api/pfds/actors?projectId=${projectId}`),
        fetchJson<Capability[]>(`/api/pfds/capabilities?projectId=${projectId}`),
        fetchJson<Feature[]>(`/api/pfds/features?projectId=${projectId}`),
        fetchJson<ApiContract[]>(`/api/pfds/api-contracts?projectId=${projectId}`),
        fetchJson<ConsolidationLog[]>(`/api/pfds/consolidation-log?projectId=${projectId}`),
        fetchJson<BlueprintItem[]>(`/api/pfds/system-blueprint?projectId=${projectId}`),
      ]);

      setProject(p);
      setActors(a);
      setCapabilities(c);
      setFeatures(f);
      setContracts(api);
      setLogs(log);
      setBlueprints(bp);
      setError("");
    } catch {
      setError("Failed to load this project workspace.");
    }
  }, [projectId, router]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const actorNameById = useMemo(() => new Map(actors.map((item) => [item.id, item.name])), [actors]);
  const capabilityNameById = useMemo(
    () => new Map(capabilities.map((item) => [item.id, item.name])),
    [capabilities],
  );

  const contractEndpointById = useMemo(
    () => new Map(contracts.map((item) => [item.id, `${item.method} ${item.endpoint}`])),
    [contracts],
  );

  const featuresByStatus = useMemo(() => {
    const buckets = new Map<Feature["status"], Feature[]>();
    for (const status of FEATURE_STATUSES) {
      buckets.set(status, []);
    }
    for (const feature of features) {
      buckets.get(feature.status)?.push(feature);
    }
    return buckets;
  }, [features]);

  const filteredFeatures = useMemo(() => {
    if (featureView === "Kanban") {
      return features;
    }
    if (featureView === "Ready to Build") {
      return features.filter((item) => item.definitionOfReady && item.status === "Ready");
    }
    if (featureView === "Needs Contract") {
      return features.filter((item) => !item.apiContractId);
    }
    if (featureView === "In Progress") {
      return features.filter((item) => item.status === "In Progress");
    }
    return features.filter((item) => item.status === "Review");
  }, [featureView, features]);

  const filteredContracts = useMemo(() => {
    if (contractView === "All Contracts") {
      return contracts;
    }
    return contracts.filter((item) => item.status !== "Agreed");
  }, [contractView, contracts]);

  const blueprintByType = useMemo(() => {
    const buckets = new Map<BlueprintItem["type"], BlueprintItem[]>();
    for (const type of ["Entity", "Flow", "Rule", "UX Rule"] as BlueprintItem["type"][]) {
      buckets.set(type, []);
    }
    for (const item of blueprints) {
      buckets.get(item.type)?.push(item);
    }
    return buckets;
  }, [blueprints]);

  async function createRecord(collection: string, payload: Record<string, unknown>) {
    const response = await fetch(`/api/pfds/${collection}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, projectId }),
    });

    if (!response.ok) {
      throw new Error("Create failed");
    }
  }

  async function onCreateActor(event: FormEvent) {
    event.preventDefault();
    await createRecord("actors", newActor);
    setNewActor({ name: "", description: "" });
    await loadAll();
  }

  async function onCreateCapability(event: FormEvent) {
    event.preventDefault();
    await createRecord("capabilities", newCapability);
    setNewCapability({ name: "", actorId: "", description: "" });
    await loadAll();
  }

  async function onCreateBlueprint(event: FormEvent) {
    event.preventDefault();
    await createRecord("system-blueprint", newBlueprint);
    setNewBlueprint({ itemName: "", type: "Entity", description: "" });
    await loadAll();
  }

  async function onCreateFeature(event: FormEvent) {
    event.preventDefault();
    await createRecord("features", newFeature);
    setNewFeature({
      featureName: "",
      actorId: "",
      capabilityId: "",
      priority: "Should",
      status: "Backlog",
      definitionOfReady: false,
      definitionOfDone: false,
      apiContractId: "",
      description: "",
      acceptanceCriteria: "",
      timeline: "",
    });
    await loadAll();
  }

  async function onCreateContract(event: FormEvent) {
    event.preventDefault();
    await createRecord("api-contracts", newContract);
    setNewContract({
      endpoint: "",
      method: "GET",
      requestSchema: "",
      responseSchema: "",
      status: "Draft",
      featureId: "",
      notes: "",
    });
    await loadAll();
  }

  async function onCreateLog(event: FormEvent) {
    event.preventDefault();
    await createRecord("consolidation-log", newLog);
    setNewLog({
      issue: "",
      type: "Data inefficiency",
      description: "",
      affectedFeatureId: "",
      actionTaken: "",
      status: "Pending",
    });
    await loadAll();
  }

  if (!project) {
    return <main className="p-8">Loading workspace...</main>;
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <header className="card fade-in p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/" className="subtle text-sm hover:underline">
              Back to Projects
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{project.displayName}</h1>
            <p className="subtle mt-2 text-sm">{project.description || "No description provided."}</p>
          </div>
          <span className="chip">Status: {project.status}</span>
        </div>
      </header>

      {error ? <p className="text-sm text-[var(--warn)]">{error}</p> : null}

      <Section title="System Blueprint">
        <form onSubmit={onCreateBlueprint} className="mb-4 grid gap-3 md:grid-cols-4">
          <input
            value={newBlueprint.itemName}
            onChange={(event) => setNewBlueprint((s) => ({ ...s, itemName: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            placeholder="Item Name"
            required
          />
          <select
            value={newBlueprint.type}
            onChange={(event) =>
              setNewBlueprint((s) => ({ ...s, type: event.target.value as BlueprintItem["type"] }))
            }
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          >
            <option value="Entity">Entity</option>
            <option value="Flow">Flow</option>
            <option value="Rule">Rule</option>
            <option value="UX Rule">UX Rule</option>
          </select>
          <input
            value={newBlueprint.description}
            onChange={(event) => setNewBlueprint((s) => ({ ...s, description: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 md:col-span-2"
            placeholder="Description"
          />
          <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-white md:col-span-4">Add Item</button>
        </form>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(["Entity", "Flow", "Rule", "UX Rule"] as BlueprintItem["type"][]).map((type) => (
            <div key={type} className="rounded-xl border border-[var(--line)] p-3">
              <p className="font-medium">{type}</p>
              <ul className="mt-2 space-y-2 text-sm">
                {(blueprintByType.get(type) ?? []).map((item) => (
                  <li key={item.id}>
                    <p className="font-medium">{item.itemName}</p>
                    <p className="subtle">{item.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Actors">
        <form onSubmit={onCreateActor} className="mb-4 grid gap-3 md:grid-cols-3">
          <input
            value={newActor.name}
            onChange={(event) => setNewActor((s) => ({ ...s, name: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            placeholder="Actor Name"
            required
          />
          <input
            value={newActor.description}
            onChange={(event) => setNewActor((s) => ({ ...s, description: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            placeholder="Description"
          />
          <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-white">Add Actor</button>
        </form>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actors.map((actor) => (
            <article key={actor.id} className="rounded-xl border border-[var(--line)] p-3">
              <p className="font-medium">{actor.name}</p>
              <p className="subtle mt-1 text-sm">{actor.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Capabilities">
        <form onSubmit={onCreateCapability} className="mb-4 grid gap-3 md:grid-cols-4">
          <input
            value={newCapability.name}
            onChange={(event) => setNewCapability((s) => ({ ...s, name: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            placeholder="Capability Name"
            required
          />
          <select
            value={newCapability.actorId}
            onChange={(event) => setNewCapability((s) => ({ ...s, actorId: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          >
            <option value="">No Actor Linked</option>
            {actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.name}
              </option>
            ))}
          </select>
          <input
            value={newCapability.description}
            onChange={(event) => setNewCapability((s) => ({ ...s, description: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            placeholder="Description"
          />
          <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-white">Add Capability</button>
        </form>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((capability) => (
            <article key={capability.id} className="rounded-xl border border-[var(--line)] p-3">
              <p className="font-medium">{capability.name}</p>
              <p className="subtle mt-1 text-sm">Actor: {actorNameById.get(capability.actorId ?? "") ?? "None"}</p>
              <p className="subtle mt-1 text-sm">{capability.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Features">
        <div className="mb-4 flex flex-wrap gap-2">
          {(["Kanban", "Ready to Build", "Needs Contract", "In Progress", "Review Queue"] as FeatureView[]).map(
            (view) => (
              <button
                key={view}
                onClick={() => setFeatureView(view)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  view === featureView
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--line)] bg-white"
                }`}
                type="button"
              >
                {view}
              </button>
            ),
          )}
        </div>

        <form onSubmit={onCreateFeature} className="mb-4 grid gap-3 md:grid-cols-3">
          <input
            value={newFeature.featureName}
            onChange={(event) => setNewFeature((s) => ({ ...s, featureName: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            placeholder="Feature Name"
            required
          />
          <select
            value={newFeature.actorId}
            onChange={(event) => setNewFeature((s) => ({ ...s, actorId: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          >
            <option value="">Actor</option>
            {actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.name}
              </option>
            ))}
          </select>
          <select
            value={newFeature.capabilityId}
            onChange={(event) => setNewFeature((s) => ({ ...s, capabilityId: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          >
            <option value="">Capability</option>
            {capabilities.map((capability) => (
              <option key={capability.id} value={capability.id}>
                {capability.name}
              </option>
            ))}
          </select>
          <select
            value={newFeature.priority}
            onChange={(event) =>
              setNewFeature((s) => ({ ...s, priority: event.target.value as Feature["priority"] }))
            }
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          >
            <option value="Must">Must</option>
            <option value="Should">Should</option>
            <option value="Could">Could</option>
            <option value="Won't">Won&apos;t</option>
          </select>
          <select
            value={newFeature.status}
            onChange={(event) =>
              setNewFeature((s) => ({ ...s, status: event.target.value as Feature["status"] }))
            }
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          >
            {FEATURE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            value={newFeature.apiContractId}
            onChange={(event) => setNewFeature((s) => ({ ...s, apiContractId: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          >
            <option value="">No API Contract</option>
            {contracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.method} {contract.endpoint}
              </option>
            ))}
          </select>
          <input
            value={newFeature.timeline}
            type="date"
            onChange={(event) => setNewFeature((s) => ({ ...s, timeline: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          />
          <input
            value={newFeature.description}
            onChange={(event) => setNewFeature((s) => ({ ...s, description: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            placeholder="Description"
          />
          <input
            value={newFeature.acceptanceCriteria}
            onChange={(event) => setNewFeature((s) => ({ ...s, acceptanceCriteria: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            placeholder="Acceptance Criteria"
          />
          <label className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={newFeature.definitionOfReady}
              onChange={(event) =>
                setNewFeature((s) => ({ ...s, definitionOfReady: event.target.checked }))
              }
            />
            Definition of Ready
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={newFeature.definitionOfDone}
              onChange={(event) => setNewFeature((s) => ({ ...s, definitionOfDone: event.target.checked }))}
            />
            Definition of Done
          </label>
          <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-white md:col-span-3">Add Feature</button>
        </form>

        {featureView === "Kanban" ? (
          <div className="grid gap-3 xl:grid-cols-6">
            {FEATURE_STATUSES.map((status) => (
              <div key={status} className="rounded-xl border border-[var(--line)] p-3">
                <p className="font-medium">{status}</p>
                <div className="mt-2 space-y-2 text-sm">
                  {(featuresByStatus.get(status) ?? []).map((item) => (
                    <article key={item.id} className="rounded-lg border border-[var(--line)] bg-white p-2">
                      <p className="font-medium">{item.featureName}</p>
                      <p className="subtle">{item.priority}</p>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFeatures.map((item) => (
              <article key={item.id} className="rounded-xl border border-[var(--line)] bg-white p-3 text-sm">
                <p className="font-medium">{item.featureName}</p>
                <p className="subtle">Status: {item.status}</p>
                <p className="subtle">Actor: {actorNameById.get(item.actorId ?? "") ?? "None"}</p>
                <p className="subtle">Capability: {capabilityNameById.get(item.capabilityId ?? "") ?? "None"}</p>
                <p className="subtle">API: {contractEndpointById.get(item.apiContractId ?? "") ?? "None"}</p>
              </article>
            ))}
          </div>
        )}
      </Section>

      <Section title="API Contracts">
        <div className="mb-4 flex flex-wrap gap-2">
          {(["All Contracts", "Unapproved Contracts"] as ContractView[]).map((view) => (
            <button
              key={view}
              onClick={() => setContractView(view)}
              className={`rounded-full border px-3 py-1 text-sm ${
                contractView === view
                  ? "border-[var(--accent-2)] bg-[var(--accent-2)] text-white"
                  : "border-[var(--line)] bg-white"
              }`}
              type="button"
            >
              {view}
            </button>
          ))}
        </div>

        <form onSubmit={onCreateContract} className="mb-4 grid gap-3 md:grid-cols-3">
          <input
            value={newContract.endpoint}
            onChange={(event) => setNewContract((s) => ({ ...s, endpoint: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            placeholder="Endpoint"
            required
          />
          <select
            value={newContract.method}
            onChange={(event) =>
              setNewContract((s) => ({ ...s, method: event.target.value as ApiContract["method"] }))
            }
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
          <select
            value={newContract.status}
            onChange={(event) =>
              setNewContract((s) => ({ ...s, status: event.target.value as ApiContract["status"] }))
            }
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          >
            <option value="Draft">Draft</option>
            <option value="Agreed">Agreed</option>
            <option value="Implemented">Implemented</option>
          </select>
          <input
            value={newContract.requestSchema}
            onChange={(event) => setNewContract((s) => ({ ...s, requestSchema: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            placeholder="Request Schema"
          />
          <input
            value={newContract.responseSchema}
            onChange={(event) => setNewContract((s) => ({ ...s, responseSchema: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            placeholder="Response Schema"
          />
          <select
            value={newContract.featureId}
            onChange={(event) => setNewContract((s) => ({ ...s, featureId: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          >
            <option value="">No Feature Linked</option>
            {features.map((feature) => (
              <option key={feature.id} value={feature.id}>
                {feature.featureName}
              </option>
            ))}
          </select>
          <input
            value={newContract.notes}
            onChange={(event) => setNewContract((s) => ({ ...s, notes: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 md:col-span-2"
            placeholder="Notes"
          />
          <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-white">Add Contract</button>
        </form>

        <div className="space-y-2 text-sm">
          {filteredContracts.map((contract) => (
            <article key={contract.id} className="rounded-xl border border-[var(--line)] bg-white p-3">
              <p className="font-medium">
                {contract.method} {contract.endpoint}
              </p>
              <p className="subtle">Status: {contract.status}</p>
              <p className="subtle">Feature: {features.find((f) => f.id === contract.featureId)?.featureName ?? "None"}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Consolidation Log">
        <form onSubmit={onCreateLog} className="mb-4 grid gap-3 md:grid-cols-3">
          <input
            value={newLog.issue}
            onChange={(event) => setNewLog((s) => ({ ...s, issue: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            placeholder="Issue"
            required
          />
          <select
            value={newLog.type}
            onChange={(event) =>
              setNewLog((s) => ({ ...s, type: event.target.value as ConsolidationLog["type"] }))
            }
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          >
            <option value="Duplicate API">Duplicate API</option>
            <option value="Too many calls">Too many calls</option>
            <option value="Naming inconsistency">Naming inconsistency</option>
            <option value="Data inefficiency">Data inefficiency</option>
          </select>
          <select
            value={newLog.status}
            onChange={(event) =>
              setNewLog((s) => ({ ...s, status: event.target.value as ConsolidationLog["status"] }))
            }
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          >
            <option value="Pending">Pending</option>
            <option value="Fixed">Fixed</option>
          </select>
          <input
            value={newLog.description}
            onChange={(event) => setNewLog((s) => ({ ...s, description: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            placeholder="Description"
          />
          <select
            value={newLog.affectedFeatureId}
            onChange={(event) => setNewLog((s) => ({ ...s, affectedFeatureId: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          >
            <option value="">No Affected Feature</option>
            {features.map((feature) => (
              <option key={feature.id} value={feature.id}>
                {feature.featureName}
              </option>
            ))}
          </select>
          <input
            value={newLog.actionTaken}
            onChange={(event) => setNewLog((s) => ({ ...s, actionTaken: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            placeholder="Action Taken"
          />
          <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-white md:col-span-3">Add Log</button>
        </form>
        <div className="space-y-2 text-sm">
          {logs.map((item) => (
            <article key={item.id} className="rounded-xl border border-[var(--line)] bg-white p-3">
              <p className="font-medium">{item.issue}</p>
              <p className="subtle">
                {item.type} | {item.status}
              </p>
              <p className="subtle">Affected Feature: {features.find((f) => f.id === item.affectedFeatureId)?.featureName ?? "None"}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Sprint Board">
        <div className="grid gap-3 xl:grid-cols-6">
          {FEATURE_STATUSES.map((status) => (
            <div key={status} className="rounded-xl border border-[var(--line)] p-3">
              <p className="font-medium">{status}</p>
              <div className="mt-2 space-y-2 text-sm">
                {(featuresByStatus.get(status) ?? []).map((feature) => (
                  <article key={feature.id} className="rounded-lg border border-[var(--line)] bg-white p-2">
                    <p className="font-medium">{feature.featureName}</p>
                    <p className="subtle">{feature.priority}</p>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Rules & Workflow">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="font-semibold">Rules</h3>
            <ol className="subtle mt-2 list-decimal space-y-1 pl-5 text-sm">
              <li>No feature without Definition of Ready</li>
              <li>No API without contract</li>
              <li>No coding outside this system</li>
              <li>No untracked changes</li>
              <li>Every week the system must become simpler</li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold">Workflow</h3>
            <ol className="subtle mt-2 list-decimal space-y-1 pl-5 text-sm">
              <li>Add Actor</li>
              <li>Define Capabilities</li>
              <li>Create Features</li>
              <li>Define API Contracts</li>
              <li>Mark Definition of Ready</li>
              <li>Build (In Progress)</li>
              <li>Review</li>
              <li>Mark Definition of Done</li>
              <li>Log consolidation issues weekly</li>
            </ol>
          </div>
        </div>
      </Section>
    </main>
  );
}
