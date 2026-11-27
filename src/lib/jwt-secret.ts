const DEFAULT_SECRET = "examina-secure-secret-key-2024-competition";

export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || DEFAULT_SECRET;
  return new TextEncoder().encode(secret);
}
