import { requireSupabase } from '../lib/supabase'
import type { PromptInput, PromptItem } from '../types/prompt'

async function userId() {
  const { data, error } = await requireSupabase().auth.getUser()
  if (error || !data.user) throw new Error('Please sign in to save prompts.')
  return data.user.id
}
function toRow(item: PromptInput) {
  return {
    title: item.title,
    image_url: item.imageUrl,
    prompt: item.prompt,
    negative_prompt: item.negativePrompt,
    category: item.category,
    tags: item.tags,
    model: item.model,
    aspect_ratio: item.aspectRatio,
    source: item.source,
    source_url: item.sourceUrl,
    notes: item.notes,
    is_favorite: item.isFavorite,
    is_public: item.isPublic,
  }
}
type PromptRow = ReturnType<typeof toRow> & {
  id: string
  user_id: string
  created_at: string
  updated_at: string
}

function fromRow(row: PromptRow, imageUrl: string): PromptItem {
  return {
    id: row.id,
    ownerId: row.user_id,
    title: row.title,
    imageUrl,
    prompt: row.prompt,
    negativePrompt: row.negative_prompt,
    category: row.category,
    tags: row.tags,
    model: row.model,
    aspectRatio: row.aspect_ratio,
    source: row.source,
    sourceUrl: row.source_url,
    notes: row.notes,
    isFavorite: row.is_favorite,
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
export async function getPrompts(): Promise<PromptItem[]> {
  const supabase = requireSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const promptRequest = supabase
    .from('prompts')
    .select('*')
    .order('created_at', { ascending: false })
  const favoriteRequest = session
    ? supabase.from('prompt_favorites').select('prompt_id')
    : Promise.resolve({ data: [] as { prompt_id: string }[], error: null })
  const [{ data, error }, { data: favorites, error: favoriteError }] = await Promise.all([
    promptRequest,
    favoriteRequest,
  ])
  if (error) throw error
  if (favoriteError) throw favoriteError
  const rows = data as PromptRow[]
  if (!rows.length) return []
  const favoriteIds = new Set((favorites ?? []).map((favorite) => favorite.prompt_id))
  const { data: urls, error: imageError } = await supabase.storage
    .from('prompt-images')
    .createSignedUrls(
      rows.map((r) => r.image_url),
      3600,
    )
  if (imageError) throw imageError
  return rows.map((r, index) => ({
    ...fromRow(r, urls?.[index]?.signedUrl ?? ''),
    isFavorite: favoriteIds.has(r.id),
  }))
}
export async function savePrompt(input: PromptInput, id?: string, file?: File): Promise<void> {
  const supabase = requireSupabase()
  const now = new Date().toISOString()
  const owner = await userId()
  let oldPath: string | undefined
  if (id) {
    const { data, error } = await supabase
      .from('prompts')
      .select('image_url')
      .eq('id', id)
      .eq('user_id', owner)
      .single()
    if (error) throw error
    oldPath = data.image_url
  }
  let path = oldPath
  if (file) {
    const date = new Date()
    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type]
    if (!extension) throw new Error('Image upload failed: unsupported file type.')
    path = `${owner}/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${extension}`
    const { error } = await supabase.storage
      .from('prompt-images')
      .upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw new Error(`Image upload failed: ${error.message}`)
  }
  if (!path) throw new Error('Please choose an image.')
  const row = { ...toRow(input), image_url: path, user_id: owner, updated_at: now }
  const { error } = id
    ? await supabase
        .from('prompts')
        .update(row)
        .eq('id', id)
        .eq('user_id', owner)
        .select('id')
        .single()
    : await supabase.from('prompts').insert(row)
  if (error) {
    if (file) await supabase.storage.from('prompt-images').remove([path])
    throw error
  }
  if (file && oldPath) await supabase.storage.from('prompt-images').remove([oldPath])
}
export async function toggleFavorite(item: PromptItem): Promise<void> {
  const supabase = requireSupabase()
  const owner = await userId()
  const { error } = item.isFavorite
    ? await supabase.from('prompt_favorites').delete().eq('prompt_id', item.id).eq('user_id', owner)
    : await supabase.from('prompt_favorites').insert({ prompt_id: item.id, user_id: owner })
  if (error) throw error
}
export async function deletePrompt(id: string): Promise<void> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('prompts')
    .delete()
    .eq('id', id)
    .eq('user_id', await userId())
    .select('image_url')
    .single()
  if (error) throw error
  if (data) await supabase.storage.from('prompt-images').remove([data.image_url])
}
