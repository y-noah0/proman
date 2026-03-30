import { NextResponse } from "next/server";
import { getSessionFromCookieHeader } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import {
  BLUEPRINT_TYPES,
  CONSOLIDATION_STATUSES,
  CONSOLIDATION_TYPES,
  CONTRACT_METHODS,
  CONTRACT_STATUSES,
  FEATURE_PRIORITIES,
  FEATURE_STATUSES,
  PFDS_COLLECTIONS,
  PROJECT_STATUSES,
  PfdsCollectionName,
  withProjectDisplayName,
} from "@/lib/pfds";

const collectionMap: Record<PfdsCollectionName, string> = {
  projects: "projects",
  actors: "actors",
  capabilities: "capabilities",
  features: "features",
  "api-contracts": "apiContracts",
  "consolidation-log": "consolidationLogs",
  "system-blueprint": "systemBlueprint",
};

function isValidCollection(value: string): value is PfdsCollectionName {
  return PFDS_COLLECTIONS.includes(value as PfdsCollectionName);
}

function normalizeRecord(collection: PfdsCollectionName, payload: Record<string, unknown>) {
  const now = new Date().toISOString();

  switch (collection) {
    case "projects": {
      const status = PROJECT_STATUSES.includes(payload.status as (typeof PROJECT_STATUSES)[number])
        ? (payload.status as string)
        : "Planning";

      return {
        projectName: String(payload.projectName ?? "Untitled Project"),
        description: String(payload.description ?? ""),
        startDate: payload.startDate ? String(payload.startDate) : "",
        endDate: payload.endDate ? String(payload.endDate) : "",
        status,
        createdAt: now,
        updatedAt: now,
      };
    }
    case "actors":
      return {
        name: String(payload.name ?? "Unnamed Actor"),
        projectId: String(payload.projectId ?? ""),
        description: String(payload.description ?? ""),
        createdAt: now,
        updatedAt: now,
      };
    case "capabilities":
      return {
        name: String(payload.name ?? "Unnamed Capability"),
        projectId: String(payload.projectId ?? ""),
        actorId: payload.actorId ? String(payload.actorId) : "",
        description: String(payload.description ?? ""),
        createdAt: now,
        updatedAt: now,
      };
    case "features": {
      const priority = FEATURE_PRIORITIES.includes(payload.priority as (typeof FEATURE_PRIORITIES)[number])
        ? (payload.priority as string)
        : "Should";
      const status = FEATURE_STATUSES.includes(payload.status as (typeof FEATURE_STATUSES)[number])
        ? (payload.status as string)
        : "Backlog";

      return {
        featureName: String(payload.featureName ?? "Untitled Feature"),
        projectId: String(payload.projectId ?? ""),
        actorId: payload.actorId ? String(payload.actorId) : "",
        capabilityId: payload.capabilityId ? String(payload.capabilityId) : "",
        priority,
        status,
        definitionOfReady: Boolean(payload.definitionOfReady),
        definitionOfDone: Boolean(payload.definitionOfDone),
        apiContractId: payload.apiContractId ? String(payload.apiContractId) : "",
        description: String(payload.description ?? ""),
        acceptanceCriteria: String(payload.acceptanceCriteria ?? ""),
        timeline: payload.timeline ? String(payload.timeline) : "",
        createdAt: now,
        updatedAt: now,
      };
    }
    case "api-contracts": {
      const method = CONTRACT_METHODS.includes(payload.method as (typeof CONTRACT_METHODS)[number])
        ? (payload.method as string)
        : "GET";
      const status = CONTRACT_STATUSES.includes(payload.status as (typeof CONTRACT_STATUSES)[number])
        ? (payload.status as string)
        : "Draft";

      return {
        endpoint: String(payload.endpoint ?? "/api/example"),
        projectId: String(payload.projectId ?? ""),
        method,
        requestSchema: String(payload.requestSchema ?? ""),
        responseSchema: String(payload.responseSchema ?? ""),
        status,
        featureId: payload.featureId ? String(payload.featureId) : "",
        notes: String(payload.notes ?? ""),
        createdAt: now,
        updatedAt: now,
      };
    }
    case "consolidation-log": {
      const type = CONSOLIDATION_TYPES.includes(payload.type as (typeof CONSOLIDATION_TYPES)[number])
        ? (payload.type as string)
        : "Data inefficiency";
      const status = CONSOLIDATION_STATUSES.includes(
        payload.status as (typeof CONSOLIDATION_STATUSES)[number],
      )
        ? (payload.status as string)
        : "Pending";

      return {
        issue: String(payload.issue ?? "New issue"),
        projectId: String(payload.projectId ?? ""),
        type,
        description: String(payload.description ?? ""),
        affectedFeatureId: payload.affectedFeatureId ? String(payload.affectedFeatureId) : "",
        actionTaken: String(payload.actionTaken ?? ""),
        status,
        createdAt: now,
        updatedAt: now,
      };
    }
    case "system-blueprint": {
      const type = BLUEPRINT_TYPES.includes(payload.type as (typeof BLUEPRINT_TYPES)[number])
        ? (payload.type as string)
        : "Entity";

      return {
        itemName: String(payload.itemName ?? "New item"),
        projectId: String(payload.projectId ?? ""),
        type,
        description: String(payload.description ?? ""),
        createdAt: now,
        updatedAt: now,
      };
    }
  }
}

function toApiRecord(input: Record<string, unknown>) {
  const { _id, ...rest } = input;
  return {
    id: String(_id),
    ...rest,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ collection: string }> },
) {
  const session = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { collection } = await context.params;
  if (!isValidCollection(collection)) {
    return NextResponse.json({ error: "Unknown collection." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const db = await getDb();

  const query: Record<string, string> = {};
  if (projectId && collection !== "projects") {
    query.projectId = projectId;
  }

  const records = await db
    .collection(collectionMap[collection])
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  const mapped = records.map((item) => toApiRecord(item as Record<string, unknown>));
  if (collection !== "projects") {
    return NextResponse.json(mapped);
  }

  return NextResponse.json(mapped.map((project) => withProjectDisplayName(project)));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ collection: string }> },
) {
  const session = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { collection } = await context.params;
  if (!isValidCollection(collection)) {
    return NextResponse.json({ error: "Unknown collection." }, { status: 404 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const record = normalizeRecord(collection, body);
  const db = await getDb();
  const result = await db.collection(collectionMap[collection]).insertOne(record);

  const created = {
    id: String(result.insertedId),
    ...record,
  };

  if (collection !== "projects") {
    return NextResponse.json(created, { status: 201 });
  }

  return NextResponse.json(withProjectDisplayName(created), { status: 201 });
}
