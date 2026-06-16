import { createHmac, timingSafeEqual } from "crypto";

/**
 * Temporary signed token for ORCID registration flow.
 * Encodes ORCID profile data so the complete-profile page can read it
 * after the user is redirected from the ORCID OAuth callback.
 * Expires after 15 minutes.
 */

interface OrcidRegistrationData {
  orcidId: string;
  name: string;
}

const TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createOrcidRegistrationToken(data: OrcidRegistrationData): string {
  const payload = JSON.stringify({
    ...data,
    exp: Date.now() + TOKEN_EXPIRY_MS,
  });
  const encoded = Buffer.from(payload).toString("base64url");
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyOrcidRegistrationToken(token: string): OrcidRegistrationData | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;
  const expectedSig = sign(encoded);

  // Timing-safe comparison
  if (signature.length !== expectedSig.length) return null;
  const sigBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSig, "utf8");
  if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (!payload.exp || Date.now() > payload.exp) return null;
    if (!payload.orcidId || !payload.name) return null;
    return { orcidId: payload.orcidId, name: payload.name };
  } catch {
    return null;
  }
}
