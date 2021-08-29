import {compare, fuzzyScore} from '../../fuzzy-filter'
import {compose, fromEvent} from '../../subscription'
import {html, render, unsafeHTML} from '@github/jtml'

import TextExpanderElement from '@github/text-expander-element'
import {filterSort} from '../../filter-sort'
import memoize from '@github/memoize'
import {observe} from 'selector-observer'
import {parseHTML} from '../../parse-html'

interface Data {
  suggestions: SuggestionData[]
  icons: Icons
}

interface SuggestionData {
  id: number
  number: number
  title: string
  type: string
}

interface Icons {
  [key: string]: string
}

function asText(item: SuggestionData): string {
  return `${item.number} ${item.title.trim().toLowerCase()}`
}

function search(items: SuggestionData[], query: string): SuggestionData[] {
  if (!query) return items
  const re = new RegExp(`\\b${escapeRegExp(query)}`)
  const hashedScore = /^\d+$/.test(query)
    ? (text: string) => issueNumberScore(text, re)
    : (text: string) => fuzzyScore(text, query)
  const key = (item: SuggestionData) => {
    const text = asText(item)
    const score = hashedScore(text)
    return score > 0 ? {score, text} : null
  }
  return filterSort(items, key, compare)
}

function escapeRegExp(regex: string): string {
  return regex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Returns a score that gets higher as the query that matches a number starting
// on a word boundary is found earlier in the string.
function issueNumberScore(text: string, query: RegExp): number {
  const score = text.search(query)
  if (score > -1) {
    return 1000 - score
  } else {
    return 0
  }
}

function renderResults(issues: SuggestionData[], container: HTMLElement, icons: Icons): void {
  const itemsTemplate = (items: SuggestionData[]) => html`
    <ul role="listbox" class="suggester-container suggester suggestions list-style-none position-absolute">
      ${items.map(itemTemplate)}
    </ul>
  `

  const itemTemplate = (item: SuggestionData) => {
    const icon = item.type in icons ? parseHTML(document, icons[item.type]) : ''
    return html`
      <li class="markdown-title" role="option" id="suggester-issue-${item.id}" data-value="${item.number}">
        <span class="d-inline-block mr-1">${icon}</span>
        <small>#${item.number}</small> ${// eslint-disable-next-line no-restricted-syntax
        unsafeHTML(item.title)}
      </li>
    `
  }

  render(itemsTemplate(issues), container)
}

observe('text-expander[data-issue-url]', {
  subscribe: el => {
    const subscriptions = [
      fromEvent(el, 'text-expander-change', onchange),
      fromEvent(el, 'text-expander-value', onvalue),
      fromEvent(el, 'keydown', onkeydown),
      fromEvent(el, 'click', onclick)
    ]

    return compose(...subscriptions)
  }
})

function onvalue(event: Event) {
  const detail = (event as CustomEvent).detail
  if (detail.key !== '#') return
  const value = detail.item.getAttribute('data-value')!
  detail.value = `#${value}`
}

function onchange(event: Event) {
  const {key, provide, text} = (event as CustomEvent).detail
  if (key !== '#') return
  if (text === '#') {
    hideSuggestions(event.target)
    return
  }

  const menu = event.target as Element
  const url = menu.getAttribute('data-issue-url')!
  provide(issueMenu(url, text))
}

function hideSuggestions(target: EventTarget | null) {
  if (!target) return

  const textExpander = (target as HTMLElement).closest('text-expander') as TextExpanderElement
  if (textExpander) {
    textExpander.dismiss()
  }
}

function onclick(event: Event) {
  hideSuggestions(event.target)
}

function onkeydown(event: Event) {
  const specialKeys = ['ArrowRight', 'ArrowLeft']
  const {key} = event as KeyboardEvent
  if (specialKeys.indexOf(key) < 0) return

  hideSuggestions(event.target)
}

async function issueMenu(url: string, query: string): Promise<{fragment: HTMLElement; matched: boolean}> {
  const data: Data = await cachedJSON(url)
  const list = document.createElement('div')
  const results = search(data.suggestions, query).slice(0, 5)
  renderResults(results, list, data.icons)
  const root = list.firstElementChild as HTMLElement
  return {fragment: root, matched: results.length > 0}
}

const cachedJSON = memoize(async function <T>(url: RequestInfo): Promise<T> {
  const response = await self.fetch(url, {
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json'
    }
  })
  if (!response.ok) {
    const responseError = new Error()
    const statusText = response.statusText ? ` ${response.statusText}` : ''
    responseError.message = `HTTP ${response.status}${statusText}`
    throw responseError
  }
  return response.json()
})
