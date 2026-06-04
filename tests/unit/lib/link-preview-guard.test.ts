/**
 * Unit tests for the link-preview UA guard. These guard against a real,
 * production bug: a WhatsApp/Meta crawler fetching the confirm or cancel
 * URL for its preview card would auto-trigger the state transition without
 * a human click. Adding a UA to the regex without a matching test here is
 * the same as not adding it.
 */

import { describe, expect, it } from 'vitest'
import { isLinkPreviewUserAgent } from '@/lib/link-preview-guard'

describe('isLinkPreviewUserAgent', () => {
	it('treats null / undefined / empty as not a preview', () => {
		expect(isLinkPreviewUserAgent(null)).toBe(false)
		expect(isLinkPreviewUserAgent(undefined)).toBe(false)
		expect(isLinkPreviewUserAgent('')).toBe(false)
	})

	it('catches WhatsApp preview agents', () => {
		expect(isLinkPreviewUserAgent('WhatsApp/2.21.11.17')).toBe(true)
		expect(isLinkPreviewUserAgent('WhatsApp/2')).toBe(true)
	})

	it('catches Meta crawlers', () => {
		expect(
			isLinkPreviewUserAgent(
				'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
			),
		).toBe(true)
		expect(isLinkPreviewUserAgent('meta-externalagent/1.1')).toBe(true)
	})

	it('catches other messaging platform preview bots', () => {
		expect(isLinkPreviewUserAgent('TelegramBot (like TwitterBot)')).toBe(true)
		expect(isLinkPreviewUserAgent('Slackbot-LinkExpanding 1.0')).toBe(true)
		expect(isLinkPreviewUserAgent('LinkedInBot/1.0')).toBe(true)
		expect(isLinkPreviewUserAgent('Twitterbot/1.0')).toBe(true)
		expect(isLinkPreviewUserAgent('Discordbot/2.0')).toBe(true)
		expect(isLinkPreviewUserAgent('SkypeUriPreview Preview/0.5')).toBe(true)
	})

	it('lets through real desktop browsers', () => {
		expect(
			isLinkPreviewUserAgent(
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
			),
		).toBe(false)
	})

	it('lets through real mobile browsers', () => {
		expect(
			isLinkPreviewUserAgent(
				'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
			),
		).toBe(false)
		expect(
			isLinkPreviewUserAgent(
				'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
			),
		).toBe(false)
	})

	it('catches generic bot/crawler signatures', () => {
		expect(isLinkPreviewUserAgent('SomeBot/1.0 (preview crawler)')).toBe(true)
		expect(isLinkPreviewUserAgent('mycrawler/2')).toBe(true)
		expect(isLinkPreviewUserAgent('GenericSpider')).toBe(true)
	})

	it('does not over-match "robot" or "Bothy" type strings', () => {
		// Ensure the boundary in the catch-all doesn't false-positive on
		// strings that happen to contain "bot" as part of a larger word.
		expect(isLinkPreviewUserAgent('Mozilla Robotype/1.0')).toBe(false)
		expect(isLinkPreviewUserAgent('Bothan-Spy-Browser')).toBe(false)
	})
})
