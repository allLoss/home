import {compose, fromEvent} from '../../subscription'
import {html, render} from '@github/jtml'
import {compare} from '../../fuzzy-filter'
import {filterSort} from '../../filter-sort'
import memoize from '@github/memoize'
import {observe} from 'selector-observer'

interface UserData {
  login: string
  type: string
  id: string
  name: string
  description: string
}

function asText(item: UserData): string {
  return item.description
    ? `${item.name} ${item.description}`.trim().toLowerCase() // team
    : `${item.login} ${item.name}`.trim().toLowerCase() // user
}

function search(items: UserData[], query: string): UserData[] {
  if (!query) return items
  const scorer = fuzzyScorer(query)
  const key = (item: UserData) => {
    const text = asText(item)
    const score = scorer(text)
    return score > 0 ? {score, text} : null
  }
  return filterSort(items, key, compare)
}

function renderResults(usersAndTeams: UserData[], container: HTMLElement): void {
  const itemsTemplate = (items: UserData[]) => html`
    <ul role="listbox" class="suggester-container suggester suggestions list-style-none position-absolute">
      ${items.map(itemTemplate)}
    </ul>
  `

  const itemTemplate = (item: UserData) => {
    const name = item.type === 'user' ? item.login : item.name
    const desc = item.type === 'user' ? item.name : item.description
    return html`
      <li role="option" id="suggester-${item.id}-${item.type}-${name}" data-value="${name}">
        <span>${name}</span>
        <small>${desc}</small>
      </li>
    `
  }

  render(itemsTemplate(usersAndTeams), container)
}

function fuzzyScorer(query: string): (text: string) => number {
  if (!query) return () => 2.0
  const queryChars = query.toLowerCase().split('')
  return (text: string): number => {
    if (!text) return 0.0
    const match = shortestMatch(text, queryChars)
    if (!match) return 0.0
    const value = query.length / (match[1] as number)
    return value / ((match[0] as number) / 2 + 1)
  }
}

// Get the shortest match (least distance between start and end index) for all
// the query characters in the given text.
//
// Returns an array in format [firstIndex, matchLength, [matchIndexes]]
function shortestMatch(text: string, queryChars: string[]): Array<number | number[]> | null {
  let indexes
  let j
  let len
  let match
  const starts = allIndexesOf(text, queryChars[0])
  if (starts.length === 0) {
    return null
  }
  if (queryChars.length === 1) {
    return [starts[0], 1, []]
  }
  match = null
  for (j = 0, len = starts.length; j < len; j++) {
    const start = starts[j]
    if (!(indexes = indexesOfChars(text, queryChars, start + 1))) {
      continue
    }
    const length = indexes[indexes.length - 1] - start
    if (!match || length < match[1]) {
      match = [start, length, indexes]
    }
  }
  return match
}

// Find all indexes of character inside a string.
function allIndexesOf(string: string, char: string) {
  let index = 0
  const results1 = []
  while ((index = string.indexOf(char, index)) > -1) {
    results1.push(index++)
  }
  return results1
}

// Find all indexes of characters of query string in order.
function indexesOfChars(string: string, chars: string[], startingIndex: number): number[] | undefined {
  let index = startingIndex
  const indexes = []
  for (let i = 1; i < chars.length; i += 1) {
    index = string.indexOf(chars[i], index)
    if (index === -1) return
    indexes.push(index++)
  }
  return indexes
}

observe('text-expander[data-mention-url]', {
  subscribe: el =>
    compose(fromEvent(el, 'text-expander-change', onchange), fromEvent(el, 'text-expander-value', onvalue))
})

function onvalue(event: Event) {
  const detail = (event as CustomEvent).detail
  if (detail.key !== '@') return
  const login = detail.item.getAttribute('data-value')!
  detail.value = `@${login}`
}

function onchange(event: Event) {
  const {key, provide, text} = (event as CustomEvent).detail
  if (key !== '@') return
  // do not allow multi-word mentions
  if (text?.split(' ').length > 1) return
  const menu = event.target as Element
  const url = menu.getAttribute('data-mention-url')!
  provide(mentionMenu(url, text))
}

async function mentionMenu(url: string, query: string): Promise<{fragment: HTMLElement; matched: boolean}> {
  const data: UserData[] = await cachedJSON(url)
  const list = document.createElement('div')
  const results = search(data, query).slice(0, 5)
  renderResults(results, list)
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
