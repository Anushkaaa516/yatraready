import { createHash, createHmac, timingSafeEqual } from "crypto";

// Operator login: one shared password (OPERATOR_PASSWORD) and a signed cookie.
// The cookie holds only an expiry time plus an HMAC signature made with SESSION_SECRET,
// so it cannot be forged without the secret and never contains the password.

export const COOKIE = "yatra_operator";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;

export function authConfigured() {
  return Boolean(process.env.OPERATOR_PASSWORD) && (process.env.SESSION_SECRET ?? "").length >= 16;
}

const sign = (value: string) => createHmac("sha256", process.env.SESSION_SECRET ?? "").update(value).digest("hex");

// Compare hashes of equal length so timing does not reveal how much of the password matched.
export function passwordOk(input: string) {
  const expected = process.env.OPERATOR_PASSWORD;
  if (!expected) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function makeSession() {
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  return `${expires}.${sign(expires)}`;
}

export function sessionValid(value: string | undefined | null) {
  if (!value || !authConfigured()) return false;
  const [expires, signature] = value.split(".");
  if (!expires || !signature || Number(expires) < Date.now() / 1000) return false;
  const good = Buffer.from(sign(expires));
  const given = Buffer.from(signature);
  return good.length === given.length && timingSafeEqual(good, given);
}

export function cookieFrom(request: Request, name = COOKIE) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return undefined;
}

export const isOperator = (request: Request) => sessionValid(cookieFrom(request));

export const unauthorized = () => Response.json({ error: "Please log in as the operator." }, { status: 401 });
