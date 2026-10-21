import { createHmac, createHash, timingSafeEqual } from "node:crypto";
export function invitationToken(id: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`gastapp:invitation:v1:${id}`)
    .digest("base64url");
}
export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function validToken(token: string, hash: string | null) {
  return (
    !!hash &&
    hash.length === 64 &&
    timingSafeEqual(Buffer.from(tokenHash(token)), Buffer.from(hash))
  );
}
