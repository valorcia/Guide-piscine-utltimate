import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_TTL_SECONDS = 48 * 60 * 60; // 48h

function getSecret(): string {
  const s = process.env.DOWNLOAD_SIGNING_SECRET;
  if (!s) throw new Error("DOWNLOAD_SIGNING_SECRET is not set");
  return s;
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export interface SignedPayload {
  filename: string;
  email: string;
  expiresAt: number; // epoch seconds
}

export function signDownload(filename: string, email: string, ttlSeconds = DEFAULT_TTL_SECONDS): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload: SignedPayload = { filename, email, expiresAt };
  const body = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = createHmac("sha256", getSecret()).update(body).digest();
  return `${body}.${b64urlEncode(sig)}`;
}

export function verifyDownload(token: string): SignedPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sigB64] = parts;

  const expectedSig = createHmac("sha256", getSecret()).update(body).digest();
  const givenSig = b64urlDecode(sigB64);
  if (expectedSig.length !== givenSig.length) return null;
  if (!timingSafeEqual(expectedSig, givenSig)) return null;

  let payload: SignedPayload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8"));
  } catch {
    return null;
  }
  if (!payload.filename || !payload.expiresAt) return null;
  if (Math.floor(Date.now() / 1000) > payload.expiresAt) return null;

  return payload;
}

export function buildDownloadUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, "")}/api/download/${encodeURIComponent(token)}`;
}
