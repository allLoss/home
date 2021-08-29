// Inspired by TextMate's 'Go To File' feature (and its vim counterpart, command-t)

import Combobox from '@github/combobox-nav'
import FuzzyListElement from '../fuzzy-list-element'
import {observe} from 'selector-observer'
import {onKey} from '../onfocus'

onKey('keydown', '.js-tree-finder-field', (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    history.back()
  }
})

const populateList = async (fuzzyList: Element) => {
  if (!(fuzzyList instanceof FuzzyListElement)) return
  const url = fuzzyList.getAttribute('data-url')!
  const template = fuzzyList.querySelector<HTMLTemplateElement>('.js-tree-browser-result-template')!

  const response = await fetch(url, {headers: {'X-Requested-With': 'XMLHttpRequest'}})
  const {paths}: {paths: string[]} = await response.json()
  fuzzyList.addLazyItems(paths, path => {
    const row = (template.content.cloneNode(true) as DocumentFragment).firstElementChild!
    const anchor = row.querySelector<HTMLAnchorElement>('.js-tree-browser-result-anchor')!
    const textEl = anchor.querySelector<HTMLElement>('.js-tree-browser-result-path')!
    const pathURL = new URL(anchor.href, window.location.origin)
    pathURL.pathname = `${pathURL.pathname}/${encodeURI(path)}`
    anchor.href = String(pathURL)
    anchor.id = `entry-${Math.random().toString().substr(2, 5)}`
    textEl.textContent = path
    return row
  })

  // Trigger a sort to just show the first 50 items
  fuzzyList.sort()
}

// Look for tree finder inputs in the document start preloading the results.
observe('.js-tree-finder', (fuzzyList: Element) => {
  const fuzzyListInput = fuzzyList.querySelector<HTMLInputElement>('.js-tree-finder-field')!
  const fuzzyListResults = fuzzyList.querySelector<HTMLElement>('.js-tree-browser-results')!
  if (fuzzyListResults.childElementCount > 0) return
  populateList(fuzzyList)

  const combobox = new Combobox(fuzzyListInput, fuzzyListResults)
  combobox.start()

  fuzzyList.addEventListener('fuzzy-list-will-sort', () => {
    // Remove navigation focus from the list - as pressing enter too quickly
    // could cause erroneous navigation events
    combobox.stop()
  })
  fuzzyList.addEventListener('fuzzy-list-sorted', () => {
    // Navigate to the first item in the list
    combobox.start()
    combobox.navigate()
  })
})

let lastPath: string | null = null

observe('.js-pjax-files', container => {
  if (!lastPath) {
    lastPath = window.location.pathname
    return
  }

  const backLink = container.querySelector<HTMLElement>(`a[href='${lastPath}']`)
  if (backLink) {
    setTimeout(function () {
      if (!document.activeElement || document.activeElement === document.body) backLink.focus()
    }, 200)
  }

  lastPath = window.location.pathname
})
