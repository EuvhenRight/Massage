const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'images.unsplash.com',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: 'images.pexels.com',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: 'firebasestorage.googleapis.com',
				pathname: '/**',
			},
		],
	},
	webpack: config => {
		// Silence a static-analysis false positive from `jose` running in the
		// Edge runtime: its `deflate.js` references `CompressionStream` /
		// `DecompressionStream` inside a guarded code path that we never hit
		// (NextAuth doesn't emit zip-headed JWEs), but Next.js's static
		// scanner flags the bare API reference anyway. Tracked upstream at
		// nextauthjs/next-auth#9756 and panva/jose#611.
		config.ignoreWarnings = [
			...(config.ignoreWarnings ?? []),
			{
				module: /node_modules[\\/]jose[\\/]/,
				message:
					/A Node\.js API is used \((?:CompressionStream|DecompressionStream)[^)]*\) which is not supported in the Edge Runtime/,
			},
			// `@protobufjs/inquire` is a deliberate "require it only if present"
			// helper — a dynamic `require(moduleName)` wrapped in try/catch.
			// webpack cannot resolve the expression statically and flags it, but
			// the failure is the handled path: it returns null and protobufjs
			// carries on. It reaches us transitively, and only server-side:
			//   firebase/firestore → index.node.mjs → @grpc/proto-loader
			//   → protobufjs → @protobufjs/inquire
			// Scoped to that one module AND that one message, so any other
			// "Critical dependency" — including a real one — still surfaces.
			{
				module: /node_modules[\\/]@protobufjs[\\/]inquire[\\/]/,
				message: /Critical dependency: the request of a dependency is an expression/,
			},
		]
		return config
	},
}

module.exports = withNextIntl(nextConfig)
