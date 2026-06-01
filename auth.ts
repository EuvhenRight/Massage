/**
 * Full NextAuth instance — used by API routes, server components, and the
 * Auth.js handler. Middleware uses the leaner `auth.config.ts` instead to
 * keep the edge bundle free of node-only deps (see comment there).
 *
 * This file owns:
 *   - The Credentials `authorize` callback (env-driven password check).
 *   - The `signIn` callback that gates Google sign-ins by an admin
 *     allowlist (env `AUTH_ADMIN_EMAILS`).
 *   - The exported `handlers` / `auth` / `signIn` / `signOut` helpers.
 *
 * Edge-safe pieces (provider list, `authorized` callback, `pages` config,
 * `trustHost`) come from `authConfig` so middleware and routes stay in sync.
 */

import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import authConfig from './auth.config'

const ADMIN_EMAILS = (process.env.AUTH_ADMIN_EMAILS ?? 'v2studiosk@gmail.com')
	.split(',')
	.map(e => e.trim().toLowerCase())

const CREDENTIALS_EMAIL = process.env.AUTH_ADMIN_EMAIL?.trim().toLowerCase()
const CREDENTIALS_PASSWORD = process.env.AUTH_ADMIN_PASSWORD

export const { handlers, auth, signIn, signOut } = NextAuth({
	...authConfig,
	providers: [
		Credentials({
			name: 'credentials',
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' },
			},
			async authorize(credentials) {
				const email = credentials?.email?.toString().trim().toLowerCase()
				const password = credentials?.password?.toString()

				if (
					!CREDENTIALS_EMAIL ||
					!CREDENTIALS_PASSWORD ||
					!email ||
					!password
				) {
					return null
				}
				if (email !== CREDENTIALS_EMAIL || password !== CREDENTIALS_PASSWORD) {
					return null
				}
				return { id: 'admin', email, name: 'Admin' }
			},
		}),
		Google,
	],
	callbacks: {
		...authConfig.callbacks,
		signIn({ user, account }) {
			if (account?.provider === 'credentials') return true
			const email = user?.email?.toLowerCase()
			if (!email) return false
			return ADMIN_EMAILS.includes(email)
		},
	},
})
