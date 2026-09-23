import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "session";
// Sesión de 2 horas (decisión aprobada): mismo valor en JWT y cookie.
export const SESSION_MAX_AGE = 2 * 60 * 60;

export interface SessionPayload {
  sub: string; // users.id
  codigo: string;
  rol: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "Falta AUTH_SECRET (mínimo 32 caracteres) en .env.local. " +
        "Genera uno con: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ codigo: payload.codigo, rol: payload.rol })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(getSecret());
}

export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      codigo: String(payload.codigo ?? ""),
      rol: String(payload.rol ?? ""),
    };
  } catch {
    return null;
  }
}

/** Lee la sesión desde la cookie httpOnly. Null si no hay o es inválida. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}
