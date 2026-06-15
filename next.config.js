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
		]
		return config
	},
}

module.exports = withNextIntl(nextConfig)
