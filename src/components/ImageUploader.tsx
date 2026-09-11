import { useI18n } from '../lib/i18n'
import { useEffect, useRef, useState } from 'react'
import { CloudUpload, ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from './ui/button'

const MAX_IMAGE_EDGE = 2048
const WEBP_QUALITY = 0.84

async function optimizeImage(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image()
    element.onload = () => resolve(element)
    element.onerror = reject
    element.src = dataUrl
  })
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) return file
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY),
  )
  if (!blob || (scale === 1 && blob.size >= file.size)) return file
  const basename = file.name.replace(/\.[^.]+$/, '') || 'prompt-image'
  return new File([blob], `${basename}.webp`, {
    type: 'image/webp',
    lastModified: Date.now(),
  })
}

export function ImageUploader({
  imageUrl,
  onChange,
  onProcessingChange,
}: {
  imageUrl: string
  onChange: (url: string, file?: File) => void
  onProcessingChange?: (processing: boolean) => void
}) {
  const { t } = useI18n()

  const input = useRef<HTMLInputElement>(null)
  const previewUrl = useRef<string | undefined>(undefined)
  const mounted = useRef(true)
  const optimizationRequest = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const releasePreview = () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    previewUrl.current = undefined
  }
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      optimizationRequest.current += 1
      releasePreview()
    }
  }, [])
  async function choose(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(t('Image upload failed: choose a JPG, PNG, or WEBP image.'))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('Image upload failed: maximum file size is 10 MB.'))
      return
    }
    const request = ++optimizationRequest.current
    setLoading(true)
    onProcessingChange?.(true)
    try {
      const optimized = await optimizeImage(file)
      if (!mounted.current || request !== optimizationRequest.current) return
      releasePreview()
      previewUrl.current = URL.createObjectURL(optimized)
      onChange(previewUrl.current, optimized)
    } catch {
      if (mounted.current && request === optimizationRequest.current)
        toast.error(t('Image upload failed: this file is not a valid image.'))
    } finally {
      if (mounted.current && request === optimizationRequest.current) {
        setLoading(false)
        onProcessingChange?.(false)
      }
    }
  }
  return (
    <div className="image-uploader">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label={t('Upload image')}
        className="sr-only"
        onChange={(e) => {
          void choose(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <button
        type="button"
        className={`upload-dropzone ${dragging ? 'dragging' : ''} ${imageUrl ? 'has-image' : ''}`}
        aria-busy={loading}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void choose(e.dataTransfer.files[0])
        }}
        disabled={loading}
      >
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={t('Image preview')} />
            <span className="change-image" aria-live="polite">
              {loading ? <Loader2 size={17} className="spin" /> : <ImagePlus size={17} />}
              {t(loading ? 'Optimizing image…' : 'Change image')}{' '}
            </span>
          </>
        ) : (
          <>
            <span className="upload-cloud">
              <CloudUpload size={34} strokeWidth={1.4} />
            </span>
            <strong>{loading ? t('Optimizing image…') : t('Drop your inspiration here')}</strong>
            <span>
              {t('or')} <em>{t('browse files')}</em> {t('to upload')}{' '}
            </span>
            <small>{t('JPG, PNG, WEBP · Up to 10 MB')}</small>
          </>
        )}
      </button>
      {imageUrl && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="remove-image"
          onClick={() => {
            releasePreview()
            onChange('')
          }}
        >
          <X size={14} />
          {t('Remove image')}{' '}
        </Button>
      )}
      <div className="upload-tip">
        <ImagePlus size={17} />
        <p>
          {t('A great image is just the beginning.')} <br />
          {t('Save the prompt that made it possible.')}{' '}
        </p>
      </div>
    </div>
  )
}
