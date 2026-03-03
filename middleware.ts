import createMiddleware from "next-intl/middleware";
import { auth } from "@/auth";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isAdminSignin =
    pathname === "/admin/signin" || /^\/[a-z]{2}\/admin\/signin(?:\/|$)/.test(pathname);
  const isAdminRoute =
    (pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      /^\/[a-z]{2}\/admin(?:\/|$)/.test(pathname)) &&
    !isAdminSignin;

  if (isAdminRoute && !req.auth) {
    const localeMatch = pathname.match(/^\/([a-z]{2})\//);
    const locale = localeMatch ? localeMatch[1] : "sk";
    const signInUrl = new URL(`/${locale}/admin/signin`, req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(signInUrl);
  }

  const intlResult = intlMiddleware(req);
  if (intlResult) return intlResult;

  return undefined;
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
