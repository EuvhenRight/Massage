'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
	DEFAULT_STUDIO_VIDEO_TITLE,
	getDefaultStudioVideo,
	subscribeToStudioVideo,
	type StudioVideoDoc,
} from '@/lib/studio-video-firestore'
import {
	Loader2,
	Maximize,
	Minimize,
	Pause,
	Play,
	Video as VideoIcon,
	Volume2,
	VolumeX,
} from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Props = {
	/**
	 * Optional pre-fetched value (e.g. from a server component) used as the initial
	 * state. The component still subscribes to Firestore for live updates.
	 */
	initialVideo?: StudioVideoDoc | null
	/**
	 * When provided, the component is controlled: it skips the Firestore
	 * subscription and renders this value directly. Used by the admin preview.
	 */
	controlledVideo?: StudioVideoDoc | null
	className?: string
	/** Override the rounded container styling when embedding in a custom layout. */
	containerClassName?: string
	/** Used when both Firestore and the fallback file are unavailable. */
	fallbackLabel?: string
	/**
	 * When true, renders a clickable poster image. Tapping it opens the player
	 * in a centered modal. Used on the public site so the original image stays
	 * visible until the user opts in to playback.
	 */
	lightbox?: boolean
	/** Poster shown when Firestore doc has no posterUrl set. */
	fallbackPoster?: string
	/** Suppress the "Watch video" microcopy under the play button. */
	hideWatchLabel?: boolean
}

function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
	const total = Math.floor(seconds)
	const m = Math.floor(total / 60)
	const s = total % 60
	return `${m}:${String(s).padStart(2, '0')}`
}

function FallbackPlaceholder({
	label,
	containerClassName,
	className,
}: {
	label: string
	containerClassName?: string
	className?: string
}) {
	return (
		<div
			className={cn(
				'relative w-full aspect-video flex items-center justify-center rounded-2xl border border-white/10 bg-nearBlack/60 text-icyWhite/60',
				containerClassName,
				className
			)}
			role='img'
			aria-label={label}
		>
			<div className='flex flex-col items-center gap-3 px-6 text-center'>
				<VideoIcon className='h-10 w-10 opacity-70' aria-hidden />
				<p className='text-sm tracking-wide'>{label}</p>
			</div>
		</div>
	)
}

type WebkitVideo = HTMLVideoElement & {
	webkitEnterFullscreen?: () => void
}

/**
 * The actual HTML5 player. Mounted both for inline usage and inside the lightbox.
 */
function StudioVideoPlayer({
	video,
	autoPlay,
	autoFullscreen,
	onLoadError,
	onFullscreenExit,
}: {
	video: StudioVideoDoc
	autoPlay?: boolean
	autoFullscreen?: boolean
	onLoadError?: () => void
	onFullscreenExit?: () => void
}) {
	const [loaded, setLoaded] = useState(false)
	const [playing, setPlaying] = useState(false)
	const [muted, setMuted] = useState(true)
	const [fullscreen, setFullscreen] = useState(false)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)

	const wrapperRef = useRef<HTMLDivElement | null>(null)
	const videoRef = useRef<HTMLVideoElement | null>(null)

	useEffect(() => {
		function onFsChange() {
			const isFs = document.fullscreenElement === wrapperRef.current
			setFullscreen(isFs)
			if (!isFs && autoFullscreen) onFullscreenExit?.()
		}
		function onWebkitEnd() {
			if (autoFullscreen) onFullscreenExit?.()
		}
		document.addEventListener('fullscreenchange', onFsChange)
		const vid = videoRef.current
		vid?.addEventListener('webkitendfullscreen', onWebkitEnd)
		return () => {
			document.removeEventListener('fullscreenchange', onFsChange)
			vid?.removeEventListener('webkitendfullscreen', onWebkitEnd)
		}
	}, [autoFullscreen, onFullscreenExit])

	// On mobile/tablet open: request native fullscreen immediately so the user
	// gets a proper full-bleed playback surface instead of a constrained modal.
	useEffect(() => {
		if (!autoFullscreen) return
		const wrap = wrapperRef.current
		const vid = videoRef.current as WebkitVideo | null
		if (!wrap || !vid) return
		const enter = async () => {
			try {
				await vid.play()
			} catch {
				// Autoplay rejected — fullscreen will still work on the muted element.
			}
			if (typeof vid.webkitEnterFullscreen === 'function') {
				vid.webkitEnterFullscreen()
				return
			}
			try {
				await wrap.requestFullscreen()
			} catch {
				// Browser refused (e.g. desktop already centered) — leave inline.
			}
		}
		void enter()
	}, [autoFullscreen])

	const togglePlay = useCallback(async () => {
		const el = videoRef.current
		if (!el) return
		try {
			if (el.paused) {
				await el.play()
				setPlaying(true)
			} else {
				el.pause()
				setPlaying(false)
			}
		} catch {
			el.muted = true
			setMuted(true)
			try {
				await el.play()
				setPlaying(true)
			} catch {
				setPlaying(false)
			}
		}
	}, [])

	const toggleMute = useCallback(() => {
		const el = videoRef.current
		if (!el) return
		el.muted = !el.muted
		setMuted(el.muted)
	}, [])

	const toggleFullscreen = useCallback(async () => {
		const wrap = wrapperRef.current
		if (!wrap) return
		if (document.fullscreenElement === wrap) {
			await document.exitFullscreen().catch(() => undefined)
		} else {
			await wrap.requestFullscreen().catch(() => undefined)
		}
	}, [])

	const onSeek = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const el = videoRef.current
		if (!el || !Number.isFinite(el.duration)) return
		const next = Number(event.target.value)
		el.currentTime = next
		setCurrentTime(next)
	}, [])

	const progress = duration > 0 ? (currentTime / duration) * 100 : 0

	return (
		<div
			ref={wrapperRef}
			className='relative w-full h-full overflow-hidden rounded-2xl border border-white/10 bg-nearBlack group'
		>
			<video
				ref={videoRef}
				key={video.videoUrl}
				src={video.videoUrl}
				poster={video.posterUrl ?? undefined}
				className='absolute inset-0 h-full w-full object-contain'
				playsInline
				autoPlay={autoPlay}
				preload='metadata'
				muted={muted}
				aria-label={video.title}
				onLoadedMetadata={(event) => {
					setDuration(event.currentTarget.duration || 0)
					setLoaded(true)
				}}
				onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
				onPlay={() => setPlaying(true)}
				onPause={() => setPlaying(false)}
				onEnded={() => setPlaying(false)}
				onError={() => onLoadError?.()}
				onClick={togglePlay}
			/>

			{!loaded && (
				<div className='absolute inset-0 flex items-center justify-center bg-nearBlack/70 backdrop-blur-sm'>
					<Loader2 className='h-8 w-8 animate-spin text-gold-glow' aria-hidden />
					<span className='sr-only'>Loading video…</span>
				</div>
			)}

			{loaded && !playing && (
				<button
					type='button'
					onClick={togglePlay}
					className='absolute inset-0 flex items-center justify-center bg-gradient-to-t from-nearBlack/60 via-transparent to-transparent transition-opacity duration-200'
					aria-label='Play video'
				>
					<span className='flex h-16 w-16 items-center justify-center rounded-full bg-nearBlack/40 backdrop-blur-md border border-gold-glow/70 transition-transform group-hover:scale-105 group-hover:border-gold-glow'>
						<Play className='h-8 w-8 text-gold-glow fill-gold-glow translate-x-0.5' aria-hidden />
					</span>
				</button>
			)}

			<div
				className={cn(
					'absolute inset-x-0 bottom-0 flex flex-col gap-2 px-3 py-3 bg-gradient-to-t from-nearBlack/85 via-nearBlack/40 to-transparent transition-opacity duration-200',
					playing
						? 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto'
						: 'opacity-100'
				)}
			>
				<input
					type='range'
					min={0}
					max={duration || 0}
					step={0.1}
					value={currentTime}
					onChange={onSeek}
					aria-label='Seek video'
					className='h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-gold-glow
						[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3
						[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold-glow'
					style={{
						background: `linear-gradient(to right, #FFD633 ${progress}%, rgba(255,255,255,0.15) ${progress}%)`,
					}}
				/>

				<div className='flex items-center justify-between text-icyWhite text-xs'>
					<div className='flex items-center gap-2'>
						<button
							type='button'
							onClick={togglePlay}
							aria-label={playing ? 'Pause' : 'Play'}
							className='inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors'
						>
							{playing ? (
								<Pause className='h-4 w-4' aria-hidden />
							) : (
								<Play className='h-4 w-4 translate-x-0.5' aria-hidden />
							)}
						</button>
						<button
							type='button'
							onClick={toggleMute}
							aria-label={muted ? 'Unmute' : 'Mute'}
							className='inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors'
						>
							{muted ? (
								<VolumeX className='h-4 w-4' aria-hidden />
							) : (
								<Volume2 className='h-4 w-4' aria-hidden />
							)}
						</button>
						<span className='tabular-nums text-icyWhite/80'>
							{formatTime(currentTime)} / {formatTime(duration)}
						</span>
					</div>

					<button
						type='button'
						onClick={toggleFullscreen}
						aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
						className='inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors'
					>
						{fullscreen ? (
							<Minimize className='h-4 w-4' aria-hidden />
						) : (
							<Maximize className='h-4 w-4' aria-hidden />
						)}
					</button>
				</div>
			</div>
		</div>
	)
}

export default function StudioVideo({
	initialVideo,
	controlledVideo,
	className,
	containerClassName,
	fallbackLabel,
	lightbox,
	fallbackPoster,
	hideWatchLabel,
}: Props) {
	const isControlled = controlledVideo !== undefined
	const [video, setVideo] = useState<StudioVideoDoc | null>(initialVideo ?? null)
	const [loadError, setLoadError] = useState(false)
	const [open, setOpen] = useState(false)
	const [autoFullscreen, setAutoFullscreen] = useState(false)

	const handleOpen = useCallback(() => {
		const compact =
			typeof window !== 'undefined' &&
			window.matchMedia('(max-width: 1024px)').matches
		setAutoFullscreen(compact)
		setOpen(true)
	}, [])

	useEffect(() => {
		if (isControlled) return
		const unsub = subscribeToStudioVideo(
			(next) => setVideo(next),
			() => setVideo(null)
		)
		return unsub
	}, [isControlled])

	const effective = useMemo<StudioVideoDoc | null>(() => {
		if (isControlled) return controlledVideo ?? null
		// Doc absent (not seeded yet) OR subscription errored → fall back to the
		// local default so the public site is never a dead placeholder.
		if (video === null) return getDefaultStudioVideo()
		return video
	}, [isControlled, controlledVideo, video])

	useEffect(() => {
		setLoadError(false)
	}, [effective?.videoUrl])

	const label = fallbackLabel ?? DEFAULT_STUDIO_VIDEO_TITLE

	// Lightbox: thumbnail + modal
	if (lightbox) {
		const posterSrc = effective?.posterUrl ?? fallbackPoster ?? null
		const canOpen = Boolean(effective && effective.active && !loadError)
		// Seek a fraction of a second so iOS/Safari actually paint the first frame
		// instead of a black rectangle when using a <video> as the thumbnail.
		const videoThumbSrc = effective?.videoUrl
			? `${effective.videoUrl}${effective.videoUrl.includes('#') ? '' : '#t=0.1'}`
			: null

		return (
			<>
				<div
					className={cn(
						'relative w-full overflow-hidden rounded-2xl border border-white/10 bg-nearBlack',
						containerClassName,
						className
					)}
				>
					{canOpen ? (
						<button
							type='button'
							onClick={handleOpen}
							className='group absolute inset-0 block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-soft/60'
							aria-label={`Play ${label}`}
						>
							{posterSrc ? (
								<Image
									src={posterSrc}
									alt={effective?.title ?? label}
									fill
									className='object-cover transition-transform duration-700 group-hover:scale-[1.03]'
									sizes='(max-width: 1024px) 100vw, 50vw'
								/>
							) : videoThumbSrc ? (
								<video
									key={videoThumbSrc}
									src={videoThumbSrc}
									className='pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]'
									preload='metadata'
									muted
									playsInline
									aria-hidden
									onError={() => setLoadError(true)}
								/>
							) : null}
							<div className='absolute inset-0 bg-gradient-to-t from-nearBlack/55 via-nearBlack/10 to-transparent transition-colors duration-300 group-hover:from-nearBlack/65' />
							<div className='absolute inset-0 flex items-center justify-center'>
								<span className='flex h-20 w-20 items-center justify-center rounded-full bg-nearBlack/40 backdrop-blur-md border border-gold-glow/70 transition-transform duration-300 group-hover:scale-110 group-hover:border-gold-glow'>
									<Play className='h-9 w-9 text-gold-glow fill-gold-glow translate-x-0.5' aria-hidden />
								</span>
							</div>
							{!hideWatchLabel && (
								<span className='absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.25em] text-icyWhite/70 group-hover:text-icyWhite transition-colors'>
									Watch video
								</span>
							)}
						</button>
					) : (
						<FallbackPlaceholder label={label} containerClassName='absolute inset-0 rounded-2xl' />
					)}
				</div>

				<Dialog
					open={open}
					onOpenChange={(next) => {
						setOpen(next)
						if (!next) setAutoFullscreen(false)
					}}
				>
					<DialogContent
						className='w-full max-w-5xl p-0 bg-transparent border-0 shadow-none sm:p-2'
					>
						<DialogTitle className='sr-only'>{effective?.title ?? label}</DialogTitle>
						<div className='w-full aspect-video'>
							{effective ? (
								<StudioVideoPlayer
									video={effective}
									autoPlay
									autoFullscreen={autoFullscreen}
									onLoadError={() => {
										setLoadError(true)
										setOpen(false)
									}}
									onFullscreenExit={() => setOpen(false)}
								/>
							) : (
								<FallbackPlaceholder label={label} />
							)}
						</div>
					</DialogContent>
				</Dialog>
			</>
		)
	}

	// Inline mode
	if (!effective || effective.active === false || loadError) {
		return (
			<FallbackPlaceholder
				label={label}
				containerClassName={containerClassName}
				className={className}
			/>
		)
	}

	return (
		<div
			className={cn(
				'relative w-full aspect-video',
				containerClassName,
				className
			)}
		>
			<StudioVideoPlayer
				video={effective}
				onLoadError={() => setLoadError(true)}
			/>
		</div>
	)
}
