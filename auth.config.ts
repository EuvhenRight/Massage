/**
 * Edge-runtime-safe auth config — used by middleware.
 *
 * NextAuth v5 statically pulls every provider's dependencies wherever the
 * full config is imported. The Credentials provider's `authorize` callback
 * isn't edge-safe (it can transitively pull in node:crypto / jose modules
 * that warn about unavailable APIs like `DecompressionStream`). To keep
 * the middleware bundle clean we expose only:
 *
 *   - Provider *stubs* (just IDs, no `authorize`)
 *   - The `authorized` callback (the only thing middleware actually needs)
 *
 * The full configuration with the real provider logic lives in `auth.ts`,
 * which is imported from API routes and server components — those run in
 * the Node.js runtime and are happy with the heavier deps.
 */

import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import type { NextAuthConfig } from 'next-auth'

export default {
	providers: [
		// Stub: real `authorize` lives in auth.ts so it's not bundled into
		// middleware. Listing the provider here keeps the session shape and
		// route names consistent between edge and node bundles.
		Credentials({}),
		Google,
	],
	pages: {
		signIn: '/admin/signin',
	},
	callbacks: {
		authorized({ auth, request }) {
			const { pathname } = request.nextUrl
			const isAdminSignin =
				pathname === '/admin/signin' ||
				/^\/[a-z]{2}\/admin\/signin(?:\/|$)/.test(pathname)
			const isAdminRoute =
				pathname === '/admin' ||
				pathname.startsWith('/admin/') ||
				/^\/[a-z]{2}\/admin(?:\/|$)/.test(pathname)
			if (isAdminRoute && !isAdminSignin) {
				return !!auth
			}
			return true
		},
	},
	trustHost: true,
} satisfies NextAuthConfig
