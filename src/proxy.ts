import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isLoginPage = pathname === "/login";

  if (!session) {
    if (isLoginPage) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = session.user.role;

  const hasDashboardAccess = role === "ADMIN" || role === "COLLABORATOR";

  if (isLoginPage) {
    return NextResponse.redirect(
      new URL(hasDashboardAccess ? "/dashboard" : "/atendimento", req.url)
    );
  }

  if (pathname.startsWith("/dashboard") && !hasDashboardAccess) {
    return NextResponse.redirect(new URL("/atendimento", req.url));
  }

  if (pathname.startsWith("/atendimento") && role !== "OPERATOR") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/atendimento/:path*",
    "/login",
  ],
};
