export interface PromptItem {
  id: string
  title: string
  imageUrl: string
  prompt: string
  negativePrompt?: string
  category: string
  tags: string[]
  model?: string
  aspectRatio?: string
  source?: string
  sourceUrl?: string
  notes?: string
  isFavorite: boolean
  isPublic: boolean
  createdAt: string
  updatedAt: string
  collectionId?: string
}
export type PromptInput = Omit<PromptItem, 'id' | 'createdAt' | 'updatedAt'>
export interface Collection {
  id: string
  name: string
  description?: string
  createdAt: string
}
export const categories = [
  'Photography',
  'Portrait',
  'Poster',
  'Illustration',
  'Anime',
  '3D',
  'Product',
  'E-commerce',
  'UI',
  'Logo',
  'Wallpaper',
  'Other',
]
export const models = ['GPT Image', 'Gemini', 'Midjourney', 'Flux', 'Stable Diffusion', 'Other']
export const ratios = ['1:1', '3:4', '4:3', '9:16', '16:9']
export const sources = ['Original', 'ChatGPT', 'Gemini', 'X', 'Xiaohongshu', 'Pinterest', 'Other']
