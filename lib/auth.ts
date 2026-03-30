import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "pfds_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type Session = {
  username: string;
  exp: number;
};

function getSecret(): string {
  return process.env.AUTH_SECRET ?? "dev-only-secret-change-me";
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf-8");
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(username: string): string {
  const payload = {
    username,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string | undefined): Session | null {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length) {
    return null;
  }

  if (!timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(encodedPayload)) as Session;
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getSessionFromCookieHeader(
  cookieHeader: string | null,
): Session | null {
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(";").map((part) => part.trim());
  const tokenPart = parts.find((part) => part.startsWith(`${SESSION_COOKIE}=`));

  if (!tokenPart) {
    return null;
  }

  const token = tokenPart.slice(`${SESSION_COOKIE}=`.length);
  return verifySessionToken(token);
}

export async function getServerSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export const authConfig = {
  sessionCookieName: SESSION_COOKIE,
  sessionTtlSeconds: SESSION_TTL_SECONDS,
  username: process.env.AUTH_USERNAME ?? "admin",
  password: process.env.AUTH_PASSWORD ?? "admin",
};
