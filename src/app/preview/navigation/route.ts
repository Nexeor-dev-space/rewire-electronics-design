import { NextResponse, type NextRequest } from "next/server";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { NAVIGATION_ADMIN_PATH, NAV_PREVIEW_COOKIE } from "@/lib/constants";

/**
 * Starts (or, with `?exit=1`, ends) the staff preview of the navigation draft.
 * It sets a session cookie; the storefront layout then renders the draft
 * navigation for that browser only. Anyone without Navigation access gets a
 * 404, so the route doesn't reveal it exists. See docs/NAVIGATION.md.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !hasPermission(session.user.permissions, PERMISSIONS.navigation)) {
    return new NextResponse(null, { status: 404 });
  }

  const exiting = request.nextUrl.searchParams.has("exit");
  const response = NextResponse.redirect(new URL(exiting ? NAVIGATION_ADMIN_PATH : "/", request.url));
  if (exiting) {
    response.cookies.delete(NAV_PREVIEW_COOKIE);
  } else {
    response.cookies.set(NAV_PREVIEW_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}
