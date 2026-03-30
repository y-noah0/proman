import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(authConfig.sessionCookieName);
  return response;
}
