import { useI18n } from '../lib/i18n'
import { useRef, useState } from 'react'
import { CloudUpload, ImagePlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from './ui/button'
export function ImageUploader({
  imageUrl,
  onChange,
}: {
  imageUrl: string
  onChange: (url: string, file?: File) => void
}) {
  const { t } = useI18n()

  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  function choose(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(t('Image upload failed: choose a JPG, PNG, or WEBP image.'))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('Image upload failed: maximum file size is 10 MB.'))
      return
    }
    setLoading(true)
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        onChange(String(reader.result), file)
        setLoading(false)
      }
      image.onerror = () => {
        toast.error(t('Image upload failed: this file is not a valid image.'))
        setLoading(false)
      }
      image.src = String(reader.result)
    }
    reader.onerror = () => {
      toast.error(t('Image upload failed. Please try again.'))
      setLoading(false)
    }
    reader.readAsDataURL(file)
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
          choose(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <button
        type="button"
        className={`upload-dropzone ${dragging ? 'dragging' : ''} ${imageUrl ? 'has-image' : ''}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          choose(e.dataTransfer.files[0])
        }}
        disabled={loading}
      >
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={t('Image preview')} />
            <span className="change-image">
              <ImagePlus size={17} />
              {t('Change image')}{' '}
            </span>
          </>
        ) : (
          <>
            <span className="upload-cloud">
              <CloudUpload size={34} strokeWidth={1.4} />
            </span>
            <strong>{loading ? t('Reading image…') : t('Drop your inspiration here')}</strong>
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
          onClick={() => onChange('')}
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
