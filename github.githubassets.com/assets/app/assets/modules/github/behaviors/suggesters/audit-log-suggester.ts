import {compare, fuzzyScore} from '../../fuzzy-filter'
import {compose, fromEvent} from '../../subscription'
import {fetchSafeDocumentFragment} from '../../fetch'
import {filterSort} from '../../filter-sort'
import memoize from '@github/memoize'
import {observe} from 'selector-observer'

const selectors: {[key: string]: string} = {
  'actor:': 'ul.js-user-suggestions',
  'user:': 'ul.js-user-suggestions',
  'operation:': 'ul.js-operation-suggestions',
  'org:': 'ul.js-org-suggestions',
  'action:': 'ul.js-action-suggestions',
  'repo:': 'ul.js-repo-suggestions',
  'country:': 'ul.js-country-suggestions'
}

observe('text-expander[data-audit-url]', {
  subscribe: el =>
    compose(fromEvent(el, 'text-expander-change', onchange), fromEvent(el, 'text-expander-value', onvalue))
})

function onvalue(event: Event) {
  const detail = (event as CustomEvent).detail
  if (!isActivationKey(detail.key)) return
  const value = detail.item.getAttribute('data-value')!
  detail.value = `${detail.key}${value}`
}

function onchange(event: Event) {
  const {key, provide, text} = (event as CustomEvent).detail
  if (!isActivationKey(key)) return
  const menu = event.target as HTMLElement
  const url = menu.getAttribute('data-audit-url')!
  provide(auditMenu(url, key, text))
}

function search(items: Element[], searchQuery: string): Element[] {
  const query = searchQuery.toLowerCase()
  const key = (item: Element) => {
    const text = item.textContent!.toLowerCase().trim()
    const score = fuzzyScore(text, query)
    return score > 0 ? {score, text} : null
  }
  return query ? filterSort(items, key, compare) : items
}

const children = memoize((el: Element) => [...el.children], {hash: (el: Element) => el.className})

async function auditMenu(url: string, key: string, query: string): Promise<{fragment?: HTMLElement; matched: boolean}> {
  const lists = await cachedMenu(url)
  const list = lists.querySelector<HTMLElement>(selector(key))
  if (!list) return {matched: false}
  const results = search(children(list), query).slice(0, 5)
  const clone = list.cloneNode(false) as HTMLElement
  clone.innerHTML = ''
  for (const el of results) clone.append(el)
  return {fragment: clone, matched: results.length > 0}
}

function isActivationKey(key: string): boolean {
  return Object.getOwnPropertyNames(selectors).includes(key)
}

function selector(key: string): string {
  const found = selectors[key]
  if (!found) throw new Error(`Unknown audit log expander key: ${key}`)
  return found
}

async function fetchMenu(url: string): Promise<HTMLElement> {
  const fragment = await fetchSafeDocumentFragment(document, url)
  const root = document.createElement('div')
  root.append(fragment)
  return root
}
const cachedMenu = memoize(fetchMenu)
