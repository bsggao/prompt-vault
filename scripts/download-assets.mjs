import { mkdir, writeFile, readFile } from 'node:fs/promises'
const source = await readFile('src/data/prompts.ts', 'utf8')
const ids = source.match(/photo-[\w-]+/g)
const seedPrompts = ids.map((id, index) => ({
  id: `demo-${index + 1}`,
  imageUrl: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=85`,
}))
seedPrompts.push({
  id: 'avatar',
  imageUrl:
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=80&h=80&q=80',
})
await mkdir('public/images', { recursive: true })
for (const prompt of seedPrompts) {
  const response = await fetch(prompt.imageUrl, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`${prompt.id}: ${response.status}`)
  await writeFile(`public/images/${prompt.id}.jpg`, Buffer.from(await response.arrayBuffer()))
  console.log(`Saved ${prompt.id}`)
}
