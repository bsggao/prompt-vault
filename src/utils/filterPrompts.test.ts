import { describe, expect, it } from 'vitest'
import { filterPrompts, type Filters } from './filterPrompts'
import { seedPrompts } from '../data/prompts'
const defaults: Filters = {
  search: '',
  category: 'All',
  model: 'All',
  ratio: 'All',
  sort: 'Newest',
}
describe('personal prompt discovery', () => {
  it('matches title, prompt text and tags case-insensitively', () => {
    expect(
      filterPrompts(seedPrompts, { ...defaults, search: 'SUMMER BLOOM' }).map((p) => p.id),
    ).toEqual(['demo-1'])
    expect(filterPrompts(seedPrompts, { ...defaults, search: '85mm' })).toHaveLength(1)
    expect(filterPrompts(seedPrompts, { ...defaults, search: 'commercial' })).toHaveLength(1)
  })
  it('combines all selected filters with the favorites constraint', () => {
    const matches = filterPrompts(
      seedPrompts,
      { ...defaults, category: 'Photography', model: 'GPT Image', ratio: '1:1' },
      true,
    )
    expect(matches.map((p) => p.id)).toEqual(['demo-6'])
    expect(filterPrompts(seedPrompts, { ...defaults, category: 'UI' })).toHaveLength(0)
  })
  it('sorts chronologically and prioritizes favorites without changing source data', () => {
    const original = seedPrompts.map((p) => p.id)
    expect(filterPrompts(seedPrompts, { ...defaults, sort: 'Oldest' })[0].id).toBe('demo-12')
    const result = filterPrompts(seedPrompts, { ...defaults, sort: 'Favorites' })
    expect(result.slice(0, 4).every((p) => p.isFavorite)).toBe(true)
    expect(seedPrompts.map((p) => p.id)).toEqual(original)
  })
})
