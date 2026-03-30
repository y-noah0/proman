import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getSessionFromCookieHeader } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { PFDS_COLLECTIONS, PfdsCollectionName, withProjectDisplayName } from "@/lib/pfds";

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

function toApiRecord(input: Record<string, unknown>) {
  const { _id, ...rest } = input;
  return {
    id: String(_id),
    ...rest,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ collection: string; id: string }> },
) {
  const session = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { collection, id } = await context.params;
  if (!isValidCollection(collection) || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  const db = await getDb();
  const found = await db.collection(collectionMap[collection]).findOne({ _id: new ObjectId(id) });

  if (!found) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const mapped = toApiRecord(found as Record<string, unknown>);
  if (collection !== "projects") {
    return NextResponse.json(mapped);
  }

  return NextResponse.json(withProjectDisplayName(mapped));
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ collection: string; id: string }> },
) {
  const session = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { collection, id } = await context.params;
  if (!isValidCollection(collection) || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  delete payload.id;
  delete payload._id;
  payload.updatedAt = new Date().toISOString();

  const db = await getDb();
  const result = await db
    .collection(collectionMap[collection])
    .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: payload }, { returnDocument: "after" });

  if (!result) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const mapped = toApiRecord(result as unknown as Record<string, unknown>);
  if (collection !== "projects") {
    return NextResponse.json(mapped);
  }

  return NextResponse.json(withProjectDisplayName(mapped));
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ collection: string; id: string }> },
) {
  const session = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { collection, id } = await context.params;
  if (!isValidCollection(collection) || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.collection(collectionMap[collection]).deleteOne({ _id: new ObjectId(id) });

  if (!result.deletedCount) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (collection === "projects") {
    await Promise.all([
      db.collection("actors").deleteMany({ projectId: id }),
      db.collection("capabilities").deleteMany({ projectId: id }),
      db.collection("features").deleteMany({ projectId: id }),
      db.collection("apiContracts").deleteMany({ projectId: id }),
      db.collection("consolidationLogs").deleteMany({ projectId: id }),
      db.collection("systemBlueprint").deleteMany({ projectId: id }),
    ]);
  }

  return NextResponse.json({ ok: true });
}
