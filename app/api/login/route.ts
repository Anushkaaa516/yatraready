import { COOKIE, SESSION_SECONDS, authConfigured, makeSession, passwordOk } from "@/lib/auth";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(request: Request) {
  if (!authConfigured()) {
    return Response.json(
      { error: "Operator login is not set up yet. Set OPERATOR_PASSWORD and SESSION_SECRET." },
      { status: 503 },
    );
  }
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!passwordOk(password)) {
    await sleep(700); // slows down password guessing
    return Response.json({ error: "Wrong password. Please try again." }, { status: 401 });
  }

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `${COOKIE}=${makeSession()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure}`,
    },
  });
}
