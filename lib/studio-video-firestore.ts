/**
 * Firestore-backed metadata for the "Our Studio" video shown on the public site.
 *
 * Collection: `studioVideo`
 * Document:   `current`  (single source of truth — keeps the schema flat and
 *                         lets the public site read by a known doc id).
 *
 * Schema:
 *   {
 *     title:      string;            // human-readable label, used as <video> aria-label
 *     videoUrl:   string;            // public path ("/video/studio.mp4") or absolute URL (Storage)
 *     posterUrl:  string | null;     // optional poster shown before play / while loading
 *     active:     boolean;           // when false the public site shows a fallback
 *     updatedAt:  Timestamp;         // server timestamp on every write
 *   }
 */

import {
	doc,
	getDoc,
	onSnapshot,
	serverTimestamp,
	setDoc,
	Timestamp,
	type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'

export const STUDIO_VIDEO_COLLECTION = 'studioVideo'
export const STUDIO_VIDEO_DOC_ID = 'current'

export const DEFAULT_STUDIO_VIDEO_URL = '/video/studio.mp4'
export const DEFAULT_STUDIO_VIDEO_TITLE = 'Our Studio'

export interface StudioVideoDoc {
	title: string
	videoUrl: string
	posterUrl: string | null
	active: boolean
	updatedAt: Timestamp | null
}

export type StudioVideoInput = {
	title: string
	videoUrl: string
	posterUrl?: string | null
	active: boolean
}

function studioVideoDocRef() {
	return doc(db, STUDIO_VIDEO_COLLECTION, STUDIO_VIDEO_DOC_ID)
}

function normalize(data: Record<string, unknown> | undefined): StudioVideoDoc | null {
	if (!data) return null
	const videoUrl = typeof data.videoUrl === 'string' ? data.videoUrl.trim() : ''
	if (!videoUrl) return null
	const title =
		typeof data.title === 'string' && data.title.trim().length > 0
			? data.title.trim()
			: DEFAULT_STUDIO_VIDEO_TITLE
	const posterRaw = typeof data.posterUrl === 'string' ? data.posterUrl.trim() : ''
	return {
		title,
		videoUrl,
		posterUrl: posterRaw.length > 0 ? posterRaw : null,
		active: data.active !== false,
		updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : null,
	}
}

/** One-shot read; returns null when the doc is missing or malformed. */
export async function getStudioVideo(): Promise<StudioVideoDoc | null> {
	const snap = await getDoc(studioVideoDocRef())
	if (!snap.exists()) return null
	return normalize(snap.data() as Record<string, unknown>)
}

/**
 * Realtime subscription. Use from client components so admin edits propagate
 * to the public page without a redeploy. Returns an unsubscribe fn.
 */
export function subscribeToStudioVideo(
	next: (video: StudioVideoDoc | null) => void,
	onError?: (err: Error) => void
): Unsubscribe {
	return onSnapshot(
		studioVideoDocRef(),
		(snap) => {
			next(snap.exists() ? normalize(snap.data() as Record<string, unknown>) : null)
		},
		(err) => {
			onError?.(err)
		}
	)
}

export async function saveStudioVideo(input: StudioVideoInput): Promise<void> {
	const title = input.title.trim() || DEFAULT_STUDIO_VIDEO_TITLE
	const videoUrl = input.videoUrl.trim()
	if (!videoUrl) {
		throw new Error('videoUrl is required')
	}
	const poster = (input.posterUrl ?? '').trim()
	await setDoc(
		studioVideoDocRef(),
		{
			title,
			videoUrl,
			posterUrl: poster.length > 0 ? poster : null,
			active: Boolean(input.active),
			updatedAt: serverTimestamp(),
		},
		{ merge: true }
	)
}

/** Used by the public component as a hard fallback when Firestore is empty. */
export function getDefaultStudioVideo(): StudioVideoDoc {
	return {
		title: DEFAULT_STUDIO_VIDEO_TITLE,
		videoUrl: DEFAULT_STUDIO_VIDEO_URL,
		posterUrl: null,
		active: true,
		updatedAt: null,
	}
}
