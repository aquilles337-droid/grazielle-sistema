import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Primeira barreira (edge): exige sessão em /painel e /admin, e role ADMIN em /admin.
 * As Server Actions e páginas revalidam a sessão no servidor — o middleware não é a única proteção.
 */
export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    if (pathname.startsWith("/admin") && req.nextauth.token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/painel", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: { authorized: ({ token }) => !!token },
    pages: { signIn: "/login" },
  },
);

export const config = {
  matcher: ["/painel/:path*", "/admin/:path*", "/api/simulations/:path*"],
};
