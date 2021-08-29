import {compose, fromEvent} from '../../subscription'
import {compare} from '../../fuzzy-filter'
import {fetchSafeDocumentFragment} from '../../fetch'
import {filterSort} from '../../filter-sort'
import memoize from '@github/memoize'
import {observe} from 'selector-observer'

function getValue(el: Element): string | undefined | null {
  if (el.hasAttribute('data-use-colon-emoji')) {
    return el.getAttribute('data-value')
  }

  const emojiEl = el.firstElementChild
  if (emojiEl && 'G-EMOJI' === emojiEl.tagName && !emojiEl.firstElementChild) {
    return emojiEl.textContent
  } else {
    return el.getAttribute('data-value')
  }
}

function search(items: Element[], searchQuery: string): Element[] {
  const query = ` ${searchQuery.toLowerCase().replace(/_/g, ' ')}`
  const key = (item: Element) => {
    const text = item.getAttribute('data-emoji-name')!
    const score = emojiScore(emojiText(item), query)
    return score > 0 ? {score, text} : null
  }
  return filterSort(items, key, compare)
}

function emojiText(item: Element): string {
  const aliases = item.getAttribute('data-text')!.trim().toLowerCase().replace(/_/g, ' ')
  return ` ${aliases}`
}

function emojiScore(aliases: string, query: string): number {
  const score = aliases.indexOf(query)
  return score > -1 ? 1000 - score : 0
}

observe('text-expander[data-emoji-url]', {
  subscribe: el =>
    compose(fromEvent(el, 'text-expander-change', onchange), fromEvent(el, 'text-expander-value', onvalue))
})

function onvalue(event: Event) {
  const detail = (event as CustomEvent).detail
  if (detail.key !== ':') return
  detail.value = getValue(detail.item)
}

function onchange(event: Event) {
  const {key, provide, text} = (event as CustomEvent).detail
  if (key !== ':') return
  const menu = event.target as Element
  const url = menu.getAttribute('data-emoji-url')!
  provide(emojiMenu(url, text))
}

async function emojiMenu(url: string, query: string): Promise<{fragment: HTMLElement; matched: boolean}> {
  const [list, children] = await cachedEmoji(url)
  const results = search(children, query).slice(0, 5)
  list.innerHTML = ''
  for (const el of results) list.append(el)
  return {fragment: list, matched: results.length > 0}
}

async function fetchEmoji(url: string): Promise<[HTMLElement, Element[]]> {
  const fragment = await fetchSafeDocumentFragment(document, url)
  const root = fragment.firstElementChild as HTMLElement
  return [root, [...root.children]]
}
const cachedEmoji = memoize(fetchEmoji)
