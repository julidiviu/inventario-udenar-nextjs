import bcrypt from "bcryptjs";

const ROUNDS = 12;

/** Hashea una contraseña plana para guardar en users.password_hash. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

/** Compara una contraseña plana contra su hash (lo usará el login). */
export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
