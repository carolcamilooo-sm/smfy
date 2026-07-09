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

  if (isLoginPage) {
    return NextResponse.redirect(
      new URL(role === "ADMIN" ? "/dashboard" : "/atendimento", req.url)
    );
  }

  if (pathname.startsWith("/dashboard") && role !== "ADMIN") {
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
