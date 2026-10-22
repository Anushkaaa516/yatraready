import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE, sessionValid } from "@/lib/auth";

// Sends anyone without a valid operator cookie from the dashboard to the login page.
// The operator API routes check the cookie again themselves, so this is a convenience
// redirect, not the only lock.
export function proxy(request: NextRequest) {
  if (!sessionValid(request.cookies.get(COOKIE)?.value)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
