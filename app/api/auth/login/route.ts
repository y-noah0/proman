import { NextResponse } from "next/server";
import { authConfig, createSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json()) as { username?: string; password?: string };
  const username = body.username?.trim();
  const password = body.password ?? "";

  if (username !== authConfig.username || password !== authConfig.password) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const token = createSessionToken(username);
  const response = NextResponse.json({ ok: true, username });

  response.cookies.set(authConfig.sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: authConfig.sessionTtlSeconds,
    path: "/",
  });

  return response;
}
