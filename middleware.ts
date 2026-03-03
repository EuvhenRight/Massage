import createMiddleware from "next-intl/middleware";
import { auth } from "@/auth";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const adminMatch = pathname.match(/^\/([a-z]{2})\/admin(\/|$)/);
  if (adminMatch && adminMatch[1] !== "ru") {
    const newPath = pathname.replace(/^\/[a-z]{2}\/admin/, "/ru/admin");
    return Response.redirect(new URL(newPath, req.nextUrl.origin));
  }

  const intlResult = intlMiddleware(req);
  if (intlResult) return intlResult;

  const isAdminRoute =
    pathname.match(/^\/[a-z]{2}\/admin(?:\/|$)/) &&
    !pathname.match(/^\/[a-z]{2}\/admin\/signin/);

  if (isAdminRoute && !req.auth) {
    const signInUrl = new URL("/ru/admin/signin", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(signInUrl);
  }

  return undefined;
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
