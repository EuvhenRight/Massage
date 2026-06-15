'use client'

import StudioVideo from '@/components/StudioVideo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { storage } from '@/lib/firebase'
import {
	DEFAULT_STUDIO_VIDEO_TITLE,
	DEFAULT_STUDIO_VIDEO_URL,
	getStudioVideo,
	saveStudioVideo,
	type StudioVideoDoc,
} from '@/lib/studio-video-firestore'
import { Loader2, RefreshCw, Save, Upload } from 'lucide-react'
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024 // 100 MB

type FormState = {
	title: string
	videoUrl: string
	posterUrl: string
	active: boolean
}

const EMPTY_FORM: FormState = {
	title: DEFAULT_STUDIO_VIDEO_TITLE,
	videoUrl: DEFAULT_STUDIO_VIDEO_URL,
	posterUrl: '',
	active: true,
}

function fromDoc(doc: StudioVideoDoc | null): FormState {
	if (!doc) return EMPTY_FORM
	return {
		title: doc.title || DEFAULT_STUDIO_VIDEO_TITLE,
		videoUrl: doc.videoUrl || DEFAULT_STUDIO_VIDEO_URL,
		posterUrl: doc.posterUrl ?? '',
		active: doc.active,
	}
}

export default function AdminStudioVideoManager() {
	const [form, setForm] = useState<FormState>(EMPTY_FORM)
	const [serverForm, setServerForm] = useState<FormState>(EMPTY_FORM)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [uploading, setUploading] = useState(false)
	const [uploadProgress, setUploadProgress] = useState(0)
	const fileInputRef = useRef<HTMLInputElement | null>(null)

	useEffect(() => {
		let cancelled = false
		;(async () => {
			try {
				const doc = await getStudioVideo()
				if (cancelled) return
				const next = fromDoc(doc)
				setForm(next)
				setServerForm(next)
			} catch (err) {
				console.error('[studio-video] load failed', err)
				toast.error('Failed to load studio video settings')
			} finally {
				if (!cancelled) setLoading(false)
			}
		})()
		return () => {
			cancelled = true
		}
	}, [])

	const dirty = useMemo(
		() =>
			form.title !== serverForm.title ||
			form.videoUrl !== serverForm.videoUrl ||
			form.posterUrl !== serverForm.posterUrl ||
			form.active !== serverForm.active,
		[form, serverForm]
	)

	const previewDoc = useMemo<StudioVideoDoc>(
		() => ({
			title: form.title.trim() || DEFAULT_STUDIO_VIDEO_TITLE,
			videoUrl: form.videoUrl.trim() || DEFAULT_STUDIO_VIDEO_URL,
			posterUrl: form.posterUrl.trim() || null,
			active: form.active,
			updatedAt: null,
		}),
		[form]
	)

	async function onUpload(file: File) {
		if (file.size > MAX_UPLOAD_BYTES) {
			toast.error('File too large (100 MB max)')
			return
		}
		if (!file.type.startsWith('video/')) {
			toast.error('Please choose a video file')
			return
		}
		setUploading(true)
		setUploadProgress(0)
		try {
			const safeName = file.name.replace(/[^\w.-]+/g, '_')
			const path = `studio-video/${Date.now()}-${safeName}`
			const task = uploadBytesResumable(storageRef(storage, path), file, {
				contentType: file.type,
			})
			await new Promise<void>((resolve, reject) => {
				task.on(
					'state_changed',
					(snap) => {
						setUploadProgress(
							snap.totalBytes > 0 ? (snap.bytesTransferred / snap.totalBytes) * 100 : 0
						)
					},
					reject,
					() => resolve()
				)
			})
			const url = await getDownloadURL(task.snapshot.ref)
			setForm((prev) => ({ ...prev, videoUrl: url }))
			toast.success('Video uploaded — preview updated. Save to publish.')
		} catch (err) {
			console.error('[studio-video] upload failed', err)
			toast.error('Upload failed')
		} finally {
			setUploading(false)
			setUploadProgress(0)
			if (fileInputRef.current) fileInputRef.current.value = ''
		}
	}

	async function onSave() {
		if (!form.videoUrl.trim()) {
			toast.error('Video URL is required')
			return
		}
		setSaving(true)
		try {
			await saveStudioVideo({
				title: form.title,
				videoUrl: form.videoUrl,
				posterUrl: form.posterUrl || null,
				active: form.active,
			})
			setServerForm(form)
			toast.success('Studio video saved')
		} catch (err) {
			console.error('[studio-video] save failed', err)
			toast.error('Failed to save changes')
		} finally {
			setSaving(false)
		}
	}

	if (loading) {
		return (
			<div className='flex h-64 items-center justify-center text-icyWhite/70'>
				<Loader2 className='h-6 w-6 animate-spin' aria-hidden />
			</div>
		)
	}

	return (
		<div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'>
			<form
				className='space-y-5'
				onSubmit={(event) => {
					event.preventDefault()
					void onSave()
				}}
			>
				<div className='space-y-1.5'>
					<label htmlFor='studio-title' className='text-sm text-icyWhite/80'>
						Title
					</label>
					<Input
						id='studio-title'
						value={form.title}
						onChange={(event) =>
							setForm((prev) => ({ ...prev, title: event.target.value }))
						}
						placeholder={DEFAULT_STUDIO_VIDEO_TITLE}
					/>
				</div>

				<div className='space-y-1.5'>
					<label htmlFor='studio-url' className='text-sm text-icyWhite/80'>
						Video URL
					</label>
					<Input
						id='studio-url'
						value={form.videoUrl}
						onChange={(event) =>
							setForm((prev) => ({ ...prev, videoUrl: event.target.value }))
						}
						placeholder={DEFAULT_STUDIO_VIDEO_URL}
					/>
					<p className='text-xs text-icyWhite/50'>
						Public path (e.g. <code>/video/studio.mp4</code>) or a full URL.
					</p>
				</div>

				<div className='space-y-1.5'>
					<label htmlFor='studio-poster' className='text-sm text-icyWhite/80'>
						Poster image URL (optional)
					</label>
					<Input
						id='studio-poster'
						value={form.posterUrl}
						onChange={(event) =>
							setForm((prev) => ({ ...prev, posterUrl: event.target.value }))
						}
						placeholder='/images/studio-poster.jpg'
					/>
				</div>

				<label className='flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 cursor-pointer hover:bg-white/[0.04] transition-colors'>
					<input
						type='checkbox'
						className='mt-0.5 h-4 w-4 accent-gold-glow'
						checked={form.active}
						onChange={(event) =>
							setForm((prev) => ({ ...prev, active: event.target.checked }))
						}
					/>
					<span className='text-sm text-icyWhite/80'>
						<span className='block font-medium text-icyWhite'>Visible on the site</span>
						<span className='text-icyWhite/60'>
							When off, the public &ldquo;Our Studio&rdquo; section shows the fallback placeholder.
						</span>
					</span>
				</label>

				<div className='rounded-lg border border-white/10 bg-white/[0.02] p-3'>
					<div className='flex items-center justify-between gap-3'>
						<div>
							<p className='text-sm font-medium text-icyWhite'>Upload new video</p>
							<p className='text-xs text-icyWhite/55'>
								Uploads to Firebase Storage; the URL fills in on success.
							</p>
						</div>
						<Button
							type='button'
							size='sm'
							variant='outline'
							disabled={uploading}
							onClick={() => fileInputRef.current?.click()}
							className='bg-transparent text-icyWhite border-white/15 hover:bg-white/10 hover:text-icyWhite'
						>
							{uploading ? (
								<Loader2 className='h-4 w-4 animate-spin' aria-hidden />
							) : (
								<Upload className='h-4 w-4' aria-hidden />
							)}
							<span>{uploading ? 'Uploading…' : 'Choose file'}</span>
						</Button>
					</div>
					{uploading && (
						<div className='mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10'>
							<div
								className='h-full bg-gold-glow transition-[width] duration-150'
								style={{ width: `${uploadProgress}%` }}
							/>
						</div>
					)}
					<input
						ref={fileInputRef}
						type='file'
						accept='video/*'
						className='hidden'
						onChange={(event) => {
							const file = event.target.files?.[0]
							if (file) void onUpload(file)
						}}
					/>
				</div>

				<div className='flex items-center gap-3 pt-2'>
					<Button
						type='submit'
						disabled={!dirty || saving || uploading}
						className='bg-gold-soft text-nearBlack hover:bg-gold-glow'
					>
						{saving ? (
							<Loader2 className='h-4 w-4 animate-spin' aria-hidden />
						) : (
							<Save className='h-4 w-4' aria-hidden />
						)}
						<span>{saving ? 'Saving…' : 'Save changes'}</span>
					</Button>
					<Button
						type='button'
						variant='ghost'
						onClick={() => setForm(serverForm)}
						disabled={!dirty || saving}
						className='text-icyWhite/70 hover:text-icyWhite hover:bg-white/10'
					>
						<RefreshCw className='h-4 w-4' aria-hidden />
						<span>Reset</span>
					</Button>
				</div>
			</form>

			<div className='space-y-3'>
				<div className='flex items-center justify-between'>
					<h2 className='text-sm font-medium text-icyWhite/80'>Live preview</h2>
					{dirty && (
						<span className='text-[11px] uppercase tracking-wider text-gold-glow/80'>
							Unsaved
						</span>
					)}
				</div>
				<StudioVideo
					controlledVideo={previewDoc}
					containerClassName='aspect-video lg:aspect-[4/3]'
					fallbackLabel={previewDoc.title}
				/>
				<p className='text-xs text-icyWhite/50'>
					Preview reflects the form, not what&rsquo;s currently published.
				</p>
			</div>
		</div>
	)
}
