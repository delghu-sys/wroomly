/**
 * Keep generated titles and descriptions inside what a results page shows.
 * Google cuts a description at roughly 155 to 160 characters and a title at
 * roughly 60 including the " | Wroomly" suffix the site adds; a cut-off snippet
 * reads as broken and loses its call to action.
 */

/** Cut at a word boundary and add an ellipsis. Text already short enough is returned as is. */
export function clampMeta(text: string, max = 155): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  const base = (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.\-–—(]+$/, '')
  return `${base}…`
}

/** A title that leaves room for the " | Wroomly" suffix (10 characters). */
export function clampTitle(title: string, max = 60): string {
  return clampMeta(title, max - 10)
}
