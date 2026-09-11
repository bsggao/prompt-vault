import type { PromptItem } from '../types/prompt'
export interface Filters {
  search: string
  category: string
  model: string
  ratio: string
  sort: string
}
export function filterPrompts(items: PromptItem[], filters: Filters, favorites = false) {
  const terms = filters.search.toLowerCase().trim().split(/\s+/).filter(Boolean)
  return items
    .filter(
      (p) =>
        (!favorites || p.isFavorite) &&
        (filters.category === 'All' || p.category === filters.category) &&
        (filters.model === 'All' || p.model === filters.model) &&
        (filters.ratio === 'All' || p.aspectRatio === filters.ratio) &&
        terms.every((term) =>
          `${p.title} ${p.prompt} ${p.tags.join(' ')}`.toLowerCase().includes(term),
        ),
    )
    .sort((a, b) =>
      filters.sort === 'Oldest'
        ? a.createdAt.localeCompare(b.createdAt)
        : filters.sort === 'Favorites'
          ? Number(b.isFavorite) - Number(a.isFavorite) || b.createdAt.localeCompare(a.createdAt)
          : b.createdAt.localeCompare(a.createdAt),
    )
}
