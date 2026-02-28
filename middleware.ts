import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin") && !pathname.startsWith("/admin/signin");

  if (isAdminRoute && !req.auth) {
    const signInUrl = new URL("/admin/signin", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(signInUrl);
  }

  return undefined;
});

export const config = {
  matcher: ["/admin/:path*"],
};
