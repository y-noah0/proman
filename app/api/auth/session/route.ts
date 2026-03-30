import { NextResponse } from "next/server";
import { getSessionFromCookieHeader } from "@/lib/auth";

export async function GET(request: Request) {
  const session = getSessionFromCookieHeader(request.headers.get("cookie"));

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    username: session.username,
  });
}
