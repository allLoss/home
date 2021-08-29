import {score as fuzzyScore, hasMatch, positions} from 'fzy.js'

const getScore = (value: string, text: string, minScore: number) => {
  if (!hasMatch(value, text)) return -Infinity
  const score = fuzzyScore(value, text)
  if (score < minScore) return -Infinity
  return score
}
const highlightElement = (node: HTMLElement, value: string, text: string) => {
  node.innerHTML = ''

  let lastPosition = 0
  for (const i of positions(value, text)) {
    const slice = text.slice(lastPosition, i)
    if (slice !== '') {
      node.appendChild(document.createTextNode(text.slice(lastPosition, i)))
    }
    lastPosition = i + 1
    const mark = document.createElement('mark')
    mark.textContent = text[i]
    node.appendChild(mark)
  }

  node.appendChild(document.createTextNode(text.slice(lastPosition)))
}

interface sortAbort {
  aborted: boolean
}
const sorting: WeakMap<FuzzyListElement, sortAbort> = new WeakMap()

type FuzzyListLazyRenderCallback = (text: string) => Node
interface state {
  timer: number | null
  handler: MutationObserver
  items: Set<Node>
  lazyItems: Map<string, FuzzyListLazyRenderCallback>
}
const states: WeakMap<FuzzyListElement, state> = new WeakMap()

const textCache: WeakMap<Node, string> = new WeakMap()
const getTextCache = (item: Node) => {
  if (!textCache.has(item) && item instanceof HTMLElement) {
    const value = (item.getAttribute('data-value') || item.textContent || '').trim()
    textCache.set(item, value)
    return value
  }
  return textCache.get(item) || ''
}

class FuzzyListElement extends HTMLElement {
  connectedCallback() {
    const list = this.querySelector('ul')
    if (!list) return

    const items = new Set(list.querySelectorAll('li'))

    const inputEl = this.querySelector('input')
    if (inputEl instanceof HTMLInputElement) {
      inputEl.addEventListener('input', () => {
        this.value = inputEl.value
      })
    }

    const handler = new MutationObserver(mutations => {
      let update = false
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length) {
          for (const item of mutation.addedNodes) {
            if (item instanceof HTMLLIElement && !items.has(item)) {
              const text = getTextCache(item)
              update = update || hasMatch(this.value, text)
              items.add(item)
            }
          }
        }
      }
      if (update) this.sort()
    })
    handler.observe(list, {childList: true})

    const state = {handler, items, lazyItems: new Map(), timer: null}
    states.set(this, state)
  }

  disconnectedCallback() {
    const state = states.get(this)
    if (state) {
      state.handler.disconnect()
      states.delete(this)
    }
  }

  addLazyItems(dataset: string[], render: FuzzyListLazyRenderCallback) {
    const state = states.get(this)
    if (!state) return
    const {lazyItems} = state
    const {value} = this
    let update = false
    for (const item of dataset) {
      lazyItems.set(item, render)
      update = update || (Boolean(value) && hasMatch(value, item))
    }
    if (update) this.sort()
  }

  sort() {
    const oldSortAbort = sorting.get(this)
    if (oldSortAbort) oldSortAbort.aborted = true
    const sortAbort = {aborted: false}
    sorting.set(this, sortAbort)
    const {minScore, markSelector, maxMatches, value} = this
    const state = states.get(this)
    if (!state) return
    if (!this.dispatchEvent(new CustomEvent('fuzzy-list-will-sort', {cancelable: true, detail: value}))) return
    const {items, lazyItems} = state
    const shouldMark = this.hasAttribute('mark-selector')

    const list = this.querySelector('ul')
    if (!list) return

    const itemsToRender: Array<
      {render: FuzzyListLazyRenderCallback; text: string; score: number} | {item: Node; score: number}
    > = []

    if (value) {
      for (const item of items) {
        const text = getTextCache(item)
        const score = getScore(value, text, minScore)
        if (score === -Infinity) continue
        itemsToRender.push({item, score})
      }
      for (const [text, render] of lazyItems) {
        const score = getScore(value, text, minScore)
        if (score === -Infinity) continue
        itemsToRender.push({text, render, score})
      }
      itemsToRender.sort((a, b) => b.score - a.score).splice(maxMatches)
    } else {
      let i = itemsToRender.length
      for (const item of items) {
        if (i >= maxMatches) break
        itemsToRender.push({item, score: 1})
        i += 1
      }
      for (const [text, render] of lazyItems) {
        if (i >= maxMatches) break
        itemsToRender.push({text, render, score: 1})
        i += 1
      }
    }

    requestAnimationFrame(() => {
      if (sortAbort.aborted) return

      // Store a reference to the checked input (if there is one) as when we
      // append other (stale) items they could be checked, and we want to keep
      // the originally checked item as the only checked item
      const checkedInputBeforeFilter = list.querySelector('input[type="radio"]:checked')

      list.innerHTML = ''
      let offset = 0

      const nextBatch = () => {
        if (sortAbort.aborted) return
        const end = Math.min(itemsToRender.length, offset + 100)
        const fragment = document.createDocumentFragment()
        for (let i = offset; i < end; i += 1) {
          const itemToRender = itemsToRender[i]
          let item = null
          if ('render' in itemToRender && 'text' in itemToRender) {
            const {render, text} = itemToRender
            item = render(text)
            items.add(item)
            textCache.set(item, text)
            lazyItems.delete(text)
          } else if ('item' in itemToRender) {
            item = itemToRender.item
          }
          if (item instanceof HTMLElement) {
            if (shouldMark) {
              highlightElement(
                markSelector ? item.querySelector(markSelector) || item : item,
                shouldMark ? value : '',
                getTextCache(item)
              )
            }
            fragment.appendChild(item)
          }
        }
        offset = end

        // Loop through all items that are about to be rendered - if there are
        // any radios that are checked that conflict with the one checked item,
        // then reset them to unchecked state
        let inputStateReset = false
        if (checkedInputBeforeFilter instanceof HTMLInputElement) {
          for (const checkedInput of fragment.querySelectorAll('input[type="radio"]:checked')) {
            if (checkedInput instanceof HTMLInputElement && checkedInput.value !== checkedInputBeforeFilter.value) {
              checkedInput.checked = false
              inputStateReset = true
            }
          }
        }

        list.appendChild(fragment)

        // If any checked items were changed then a change event should be
        // fired to let other observers know
        if (checkedInputBeforeFilter && inputStateReset) {
          checkedInputBeforeFilter.dispatchEvent(new Event('change', {bubbles: true}))
        }

        if (end < itemsToRender.length) {
          requestAnimationFrame(nextBatch)
        } else {
          list.hidden = itemsToRender.length === 0
          const emptyEl = this.querySelector<HTMLElement>('[data-fuzzy-list-show-on-empty]')
          if (emptyEl) {
            emptyEl.hidden = itemsToRender.length > 0
          }

          this.dispatchEvent(new CustomEvent('fuzzy-list-sorted', {detail: itemsToRender.length}))
        }
      }

      nextBatch()
    })
  }

  get value(): string {
    return this.getAttribute('value') || ''
  }

  set value(value: string) {
    this.setAttribute('value', value)
  }

  get markSelector(): string {
    return this.getAttribute('mark-selector') || ''
  }

  set markSelector(value: string) {
    if (value) {
      this.setAttribute('mark-selector', value)
    } else {
      this.removeAttribute('mark-selector')
    }
  }

  get minScore(): number {
    return Number(this.getAttribute('min-score') || 0)
  }

  set minScore(value: number) {
    if (Number.isNaN(value)) return
    this.setAttribute('min-score', String(value))
  }

  get maxMatches(): number {
    return Number(this.getAttribute('max-matches') || Infinity)
  }

  set maxMatches(value: number) {
    if (Number.isNaN(value)) return
    this.setAttribute('max-matches', String(value))
  }

  static get observedAttributes(): string[] {
    return ['value', 'mark-selector', 'min-score', 'max-matches']
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return
    const state = states.get(this)
    if (!state) return
    if (state.timer) window.clearTimeout(state.timer)
    state.timer = window.setTimeout(() => this.sort(), 100)
  }
}

export default FuzzyListElement

if (!window.customElements.get('fuzzy-list')) {
  window.FuzzyListElement = FuzzyListElement
  window.customElements.define('fuzzy-list', FuzzyListElement)
}

declare global {
  interface Window {
    FuzzyListElement: typeof FuzzyListElement
  }
}
