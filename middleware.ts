import NextAuth from 'next-auth'
import createMiddleware from 'next-intl/middleware'
import authConfig from './auth.config'
import { routing } from './i18n/routing'

// Edge-safe NextAuth instance: uses only the lean `auth.config.ts` so the
// middleware bundle doesn't pull in node-only deps from the full `auth.ts`
// (Credentials authorize callback, jose JWE helpers, etc.). The route
// handlers and API endpoints continue to use the full instance from
// `@/auth`.
const { auth } = NextAuth(authConfig)

const intlMiddleware = createMiddleware(routing)

export default auth(req => {
	const { pathname } = req.nextUrl

	const isAdminSignin =
		pathname === '/admin/signin' ||
		/^\/[a-z]{2}\/admin\/signin(?:\/|$)/.test(pathname)
	const isAdminRoute =
		(pathname === '/admin' ||
			pathname.startsWith('/admin/') ||
			/^\/[a-z]{2}\/admin(?:\/|$)/.test(pathname)) &&
		!isAdminSignin

	if (isAdminRoute && !req.auth) {
		const localeMatch = pathname.match(/^\/([a-z]{2})\//)
		const locale = localeMatch ? localeMatch[1] : 'sk'
		const signInUrl = new URL(`/${locale}/admin/signin`, req.nextUrl.origin)
		signInUrl.searchParams.set('callbackUrl', pathname)
		return Response.redirect(signInUrl)
	}

	const intlResult = intlMiddleware(req)
	if (intlResult) return intlResult

	return undefined
})

export const config = {
	matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
