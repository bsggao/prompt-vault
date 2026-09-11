import { useI18n } from '../lib/i18n'
import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ChevronDown,
  LockKeyhole,
  Globe2,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react'
import { categories, models, ratios, sources, type PromptItem } from '../types/prompt'
import { ImageUploader } from './ImageUploader'
import { TagInput } from './TagInput'
import { Button } from './ui/button'
import { usePrompts } from '../hooks/usePrompts'
export const promptSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give your prompt a title.')
    .max(120, 'Use no more than 120 characters.'),
  prompt: z
    .string()
    .trim()
    .min(1, 'Add the prompt behind your image.')
    .max(20000, 'Use no more than 20000 characters.'),
  negativePrompt: z.string().max(10000, 'Use no more than 10000 characters.'),
  category: z.string().min(1, 'Choose a category.'),
  tags: z
    .array(z.string().max(40, 'Use no more than 40 characters per tag.'))
    .max(12, 'Use no more than 12 tags.'),
  model: z.string(),
  aspectRatio: z.string(),
  source: z.string(),
  sourceUrl: z
    .string()
    .refine(
      (v) => !v || (/^https?:\/\//.test(v) && URL.canParse(v)),
      'Enter a valid http:// or https:// URL.',
    ),
  notes: z.string().max(10000, 'Use no more than 10000 characters.'),
  isPublic: z.boolean(),
  imageUrl: z.string().min(1, 'Choose an image to continue.'),
})
type FormValues = z.infer<typeof promptSchema>
export function PromptForm({ item }: { item?: PromptItem }) {
  const { t } = useI18n()

  const navigate = useNavigate()
  const { save } = usePrompts()
  const [file, setFile] = useState<File>()
  const [imageProcessing, setImageProcessing] = useState(false)
  const advancedRef = useRef<HTMLDetailsElement>(null)
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      title: item?.title ?? '',
      prompt: item?.prompt ?? '',
      negativePrompt: item?.negativePrompt ?? '',
      category: item?.category ?? '',
      tags: item?.tags ?? [],
      model: item?.model ?? '',
      aspectRatio: item?.aspectRatio ?? '',
      source: item?.source ?? 'Original',
      sourceUrl: item?.sourceUrl ?? '',
      notes: item?.notes ?? '',
      isPublic: item?.isPublic ?? true,
      imageUrl: item?.imageUrl ?? '',
    },
  })
  const imageUrl = watch('imageUrl')
  const isPublic = watch('isPublic')
  const showAdvancedByDefault = !!(
    item?.negativePrompt ||
    item?.model ||
    item?.aspectRatio ||
    item?.tags.length ||
    item?.sourceUrl ||
    item?.notes
  )
  useEffect(() => {
    if (showAdvancedByDefault && advancedRef.current) advancedRef.current.open = true
  }, [showAdvancedByDefault])
  const submit = handleSubmit((values) => {
    if (imageProcessing) return
    save.mutate(
      {
        input: { ...values, isFavorite: item?.isFavorite ?? false },
        id: item?.id,
        file,
      },
      { onSuccess: () => navigate('/mine') },
    )
  })
  return (
    <form className="prompt-form" onSubmit={submit} aria-busy={imageProcessing || save.isPending}>
      <div className="form-image-column">
        <div className="form-section-label">
          <span>01</span> {t('THE IMAGE')}{' '}
        </div>
        <ImageUploader
          imageUrl={imageUrl}
          onChange={(url, newFile) => {
            setValue('imageUrl', url, { shouldValidate: true })
            setFile(newFile)
          }}
          onProcessingChange={setImageProcessing}
        />
        {errors.imageUrl && (
          <p className="field-error" role="alert">
            {t(errors.imageUrl.message ?? '')}
          </p>
        )}
      </div>
      <div className="form-fields">
        <div className="form-section-label">
          <span>02</span> {t('THE DETAILS')}{' '}
        </div>
        <div className="form-row">
          <label className="wide">
            {t('Title')} <span className="required">*</span>
            <input
              {...register('title')}
              aria-label={t('Title')}
              placeholder={t('Give your inspiration a name')}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <span role="alert" className="field-error">
                {t(errors.title.message ?? '')}
              </span>
            )}
          </label>
        </div>
        <label>
          {t('Prompt')} <span className="required">*</span>
          <textarea
            className="prompt-textarea"
            {...register('prompt')}
            aria-label={t('Prompt')}
            placeholder={t('The words that brought your image to life…')}
            aria-invalid={!!errors.prompt}
          />
          {errors.prompt && (
            <span role="alert" className="field-error">
              {t(errors.prompt.message ?? '')}
            </span>
          )}
        </label>
        <label className="primary-category">
          {t('Category')} <span className="required">*</span>
          <select {...register('category')} aria-invalid={!!errors.category}>
            <option value="">{t('Select category')}</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {t(c)}
              </option>
            ))}
          </select>
          {errors.category && (
            <span role="alert" className="field-error">
              {t(errors.category.message ?? '')}
            </span>
          )}
        </label>
        <details ref={advancedRef} className="advanced-fields">
          <summary>
            <span className="advanced-icon">
              <SlidersHorizontal size={17} />
            </span>
            <span>
              <strong>{t('More details')}</strong>
              <small>{t('Model, ratio, tags, source and notes')}</small>
            </span>
            <ChevronDown className="advanced-chevron" size={18} />
          </summary>
          <div className="advanced-content">
            <label>
              {t('Negative prompt')} <span className="optional">{t('Optional')}</span>
              <textarea
                rows={2}
                {...register('negativePrompt')}
                placeholder={t('What should the AI avoid?')}
              />
              {errors.negativePrompt && (
                <span role="alert" className="field-error">
                  {t(errors.negativePrompt.message ?? '')}
                </span>
              )}
            </label>
            <div className="form-row">
              <label>
                {t('AI model')}{' '}
                <select {...register('model')}>
                  <option value="">{t('Select model')}</option>
                  {models.map((m) => (
                    <option key={m} value={m}>
                      {t(m)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('Aspect ratio')}{' '}
                <select {...register('aspectRatio')}>
                  <option value="">{t('Select ratio')}</option>
                  {ratios.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="field">
              <label>
                {t('Tags')} <span className="optional">{t('Up to 12')}</span>
              </label>
              <Controller
                control={control}
                name="tags"
                render={({ field }) => <TagInput {...field} />}
              />
            </div>
            <div className="form-row">
              <label>
                {t('Source')}{' '}
                <select {...register('source')}>
                  {sources.map((s) => (
                    <option key={s} value={s}>
                      {t(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('Source URL')} <input {...register('sourceUrl')} placeholder="https://…" />
                {errors.sourceUrl && (
                  <span role="alert" className="field-error">
                    {t(errors.sourceUrl.message ?? '')}
                  </span>
                )}
              </label>
            </div>
            <label>
              {t('Notes')} <span className="optional">{t('Optional')}</span>
              <textarea
                rows={3}
                {...register('notes')}
                placeholder={t('Settings, variations, or a little note to your future self…')}
              />
              {errors.notes && (
                <span role="alert" className="field-error">
                  {t(errors.notes.message ?? '')}
                </span>
              )}
            </label>
          </div>
        </details>
        <div className="form-bottom">
          <fieldset className="privacy-setting">
            <legend>{t('Who can see this?')}</legend>
            <div className="privacy-options">
              <button
                type="button"
                className={isPublic ? 'selected' : ''}
                aria-pressed={isPublic}
                onClick={() => setValue('isPublic', true, { shouldDirty: true })}
              >
                <Globe2 size={19} />
                <span>
                  <strong>{t('Public prompt')}</strong>
                  <small>{t('Everyone can view and favorite it.')}</small>
                </span>
              </button>
              <button
                type="button"
                className={!isPublic ? 'selected' : ''}
                aria-pressed={!isPublic}
                onClick={() => setValue('isPublic', false, { shouldDirty: true })}
              >
                <LockKeyhole size={19} />
                <span>
                  <strong>{t('Just for you')}</strong>
                  <small>{t('Only you can view and edit it.')}</small>
                </span>
              </button>
            </div>
          </fieldset>
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              disabled={imageProcessing || save.isPending}
              onClick={() => navigate(item ? '/mine' : '/')}
            >
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={imageProcessing || save.isPending}>
              {(imageProcessing || save.isPending) && <Loader2 size={16} className="spin" />}
              {imageProcessing
                ? t('Optimizing image…')
                : save.isPending
                  ? t('Saving…')
                  : item
                    ? t('Save changes')
                    : t(isPublic ? 'Publish prompt' : 'Save privately')}
              {!imageProcessing && !save.isPending && <ArrowRight size={16} />}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
