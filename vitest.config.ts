/**
 * Vitest configuration — single config covers unit tests (node environment)
 * AND component tests (jsdom environment). The runner picks the env per file
 * based on the `// @vitest-environment` directive at the top of each test.
 *
 * Default: node + jsdom for `tests/unit/components/**` via projects below.
 * Coverage: v8, line + branch, hard floor of 70 % over `lib/**` modules that
 * back the booking + CRM + notification flows. Keep this number tight — it
 * blocks merges in CI when a refactor drops below.
 *
 * Firebase tests: `process.env.FIRESTORE_EMULATOR_HOST` must be set before
 * the test runs (the Firestore SDK reads it at module-load time). The
 * `npm run emulators:exec -- 'vitest run'` script wires that up automatically.
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, '.'),
		},
	},
	test: {
		globals: false,
		setupFiles: ['./tests/setup.ts'],
		environmentMatchGlobs: [
			['tests/unit/components/**', 'jsdom'],
			['tests/integration/components/**', 'jsdom'],
		],
		environment: 'node',
		// Integration tests under the Firestore emulator perform multi-step
		// transactions (read → write → read again) AND hit the MSW Twilio
		// mock per appointment in the cron pipeline. 5s is too tight on a
		// cold emulator — first run is slower than subsequent ones. Pure
		// unit tests are still sub-second; this only affects worst case.
		testTimeout: 15000,
		hookTimeout: 15000,
		// Vitest runs test files in parallel by default. The Firestore emulator
		// is a single shared resource — parallel files collide (file A wipes
		// the DB while file B's beforeEach is still seeding, producing flaky
		// NOT_FOUND / OVERLAP / wrong-client failures). Force serial execution
		// of files; tests within a file remain sequential. Unit tests are fast,
		// the integration tests dominate runtime anyway.
		fileParallelism: false,
		poolOptions: {
			forks: { singleFork: true },
		},
		include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
		exclude: ['e2e/**', 'node_modules/**', '.next/**'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'lcov', 'json-summary'],
			reportsDirectory: './coverage',
			include: ['lib/**/*.ts', 'app/api/**/*.ts'],
			exclude: [
				'lib/**/*.test.ts',
				'lib/firebase.ts',
				'lib/site-config.ts',
				'lib/site-url.ts',
				'lib/places.ts',
				'lib/section-calendar-colors.ts',
				'lib/social-seo.ts',
				'lib/seo.ts',
			],
			thresholds: {
				// P0 modules — booking + CRM core — start at 70%, raise to 85% after
				// Phase 2 ships meaningful coverage. The build fails below this floor.
				lines: 70,
				branches: 60,
				functions: 70,
				statements: 70,
				perFile: false,
			},
		},
	},
})
