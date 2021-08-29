import {DOMRangeFromBlob, formatBlobRangeAnchor, parseBlobRange, parseFileAnchor} from '../blob-anchor'
import type {AnchorInfo} from '../blob-anchor'
import ClipboardCopyElement from '@github/clipboard-copy-element'
import hashChange from './hash-change'
import {on} from 'delegated-events'
import {surroundContents} from '../range'

let skipNextScrollTo = false

function queryLineElement(anchorPrefix: string, line: number) {
  return document.querySelector(`#${anchorPrefix}LC${line}`)
}

// Highlight a line or range of lines.
function highlightLines({blobRange, anchorPrefix}: AnchorInfo): void {
  const lineElements = document.querySelectorAll('.js-file-line')

  if (lineElements.length === 0) return
  clearHighlights()

  if (!blobRange) return

  if (blobRange.start.column === null || blobRange.end.column === null) {
    for (let i = blobRange.start.line; i <= blobRange.end.line; i += 1) {
      const line = queryLineElement(anchorPrefix, i)
      if (line) line.classList.add('highlighted')
    }
  } else if (
    blobRange.start.line === blobRange.end.line &&
    blobRange.start.column != null &&
    blobRange.end.column != null
  ) {
    const range = DOMRangeFromBlob(blobRange, line => queryLineElement(anchorPrefix, line))

    if (range) {
      const span = document.createElement('span')
      span.classList.add('highlighted')
      surroundContents(range, span)
    }
  } else {
    // TODO column highlights across multiple lines
  }
}

// Clear all highlighted lines and ranges.
function clearHighlights() {
  for (const el of document.querySelectorAll('.js-file-line.highlighted')) {
    el.classList.remove('highlighted')
  }

  for (const el of document.querySelectorAll('.js-file-line .highlighted')) {
    const lineEl = el.closest<HTMLElement>('.js-file-line')!
    el.replaceWith(...el.childNodes)
    lineEl.normalize()
  }
}

// Highlight and scroll to the lines in the current location hash.
function scrollLinesIntoView(): void {
  const anchorInfo = parseFileAnchor(window.location.hash)

  highlightLines(anchorInfo)
  showOrHideLineActions()

  const {blobRange, anchorPrefix} = anchorInfo

  const line = blobRange && queryLineElement(anchorPrefix, blobRange.start.line)

  if (!skipNextScrollTo && line) {
    line.scrollIntoView()
    const container = line.closest<HTMLElement>('.blob-wrapper, .js-blob-wrapper')!
    container.scrollLeft = 0
  }

  skipNextScrollTo = false
}

// Update highlighted lines when the page loads and
// anytime the hash changes.
hashChange(function () {
  if (document.querySelector('.js-file-line-container')) {
    setTimeout(scrollLinesIntoView, 0)
    const hash = window.location.hash
    for (const element of document.querySelectorAll('.js-update-url-with-hash')) {
      if (element instanceof HTMLAnchorElement) {
        element.hash = hash
      } else if (element instanceof HTMLFormElement) {
        const newAction = new URL(element.action, window.location.origin)
        newAction.hash = hash
        element.action = newAction.toString()
      }
    }
  }
})

function setCopyLines(lines: NodeListOf<HTMLElement>): void {
  const lineTextArray: string[] = []
  for (const line of lines) {
    lineTextArray.push(line.textContent!)
  }
  const button = document.getElementById('js-copy-lines')
  if (button instanceof ClipboardCopyElement) {
    // eslint-disable-next-line i18n-text/no-en
    button.textContent = `Copy ${lines.length === 1 ? 'line' : 'lines'}`
    button.value = lineTextArray.join('\n')
    const gaText = `Blob, copyLines, numLines:${lines.length.toString()}`
    button.setAttribute('data-ga-click', gaText)
  }
}

function setPermalink(numLines: number): string | undefined {
  const permalinkContainer = document.querySelector('.js-permalink-shortcut')
  if (permalinkContainer instanceof HTMLAnchorElement) {
    const url = `${permalinkContainer.href}${window.location.hash}`
    const button = document.getElementById('js-copy-permalink')
    if (button instanceof ClipboardCopyElement) {
      button.value = url
      const gaText = `Blob, copyPermalink, numLines:${numLines.toString()}`
      button.setAttribute('data-ga-click', gaText)
    }
    return url
  }
}

function setOpenIssueLink(permalink: string, numLines: number) {
  const newIssueLink = document.getElementById('js-new-issue')
  if (newIssueLink instanceof HTMLAnchorElement) {
    if (!newIssueLink.href) return
    const newIssueUrl = new URL(newIssueLink.href, window.location.origin)
    const params = new URLSearchParams(newIssueUrl.search)
    params.set('permalink', permalink)
    newIssueUrl.search = params.toString()
    newIssueLink.href = newIssueUrl.toString()
    newIssueLink.setAttribute('data-ga-click', `Blob, newIssue, numLines:${numLines.toString()}`)
  }
}

function setOpenDiscussionLink(permalink: string, numLines: number) {
  const newDiscussionLink = document.getElementById('js-new-discussion')
  if (!(newDiscussionLink instanceof HTMLAnchorElement) || !newDiscussionLink?.href) return
  const newDiscussionUrl = new URL(newDiscussionLink.href, window.location.origin)
  const params = new URLSearchParams(newDiscussionUrl.search)
  params.set('permalink', permalink)
  newDiscussionUrl.search = params.toString()
  newDiscussionLink.href = newDiscussionUrl.toString()
  newDiscussionLink.setAttribute('data-ga-click', `Blob, newDiscussion, numLines:${numLines.toString()}`)
}

function setViewGitBlame(numLines: number): void {
  const button = document.getElementById('js-view-git-blame')
  if (!button) return
  button.setAttribute('data-ga-click', `Blob, viewGitBlame, numLines:${numLines.toString()}`)
}

function showOrHideLineActions(): void {
  const actions = document.querySelector<HTMLElement>('.js-file-line-actions')
  if (!actions) return

  const lines = document.querySelectorAll<HTMLElement>('.js-file-line.highlighted')
  const firstSelected = lines[0]

  if (firstSelected) {
    setCopyLines(lines)
    setViewGitBlame(lines.length)
    const permalink = setPermalink(lines.length)
    if (permalink) setOpenIssueLink(permalink, lines.length)
    if (permalink) setOpenDiscussionLink(permalink, lines.length)

    actions.style.top = `${firstSelected.offsetTop - 2}px`
    /* eslint-disable-next-line github/no-d-none */
    actions.classList.remove('d-none')
  } else {
    /* eslint-disable-next-line github/no-d-none */
    actions.classList.add('d-none')
  }
}

// Prevent scroll position from changing after setting location.hash.
//
// callback - Function to preserve scroll position after.
function preserveLineNumberScrollPosition(callback: () => void): void {
  const scrollTop = window.scrollY
  skipNextScrollTo = true
  callback()
  window.scrollTo(0, scrollTop)
}

// Clicking line numbers highlights the line
on('click', '.js-line-number', function (event) {
  const anchorInfo = parseFileAnchor(event.currentTarget.id)

  const {blobRange} = anchorInfo

  const currentLines = parseBlobRange(window.location.hash)
  if (currentLines && event.shiftKey) {
    anchorInfo.blobRange = {
      start: currentLines.start,
      end: blobRange.end
    }
  }

  preserveLineNumberScrollPosition(() => {
    window.location.hash = formatBlobRangeAnchor(anchorInfo)
  })
})

// "Jump to Line" modal
on('submit', '.js-jump-to-line-form', function (event) {
  const field = event.currentTarget.querySelector<HTMLInputElement>('.js-jump-to-line-field')!
  // Regex removes all characters except integers and dashes (for multi-line case)
  const strippedField = field.value.replace(/[^\d-]/g, '')
  const lineNums = strippedField
    .split('-')
    .map(s => parseInt(s, 10))
    .filter(n => n > 0)
    .sort((a, b) => a - b)
  if (lineNums.length) window.location.hash = `L${lineNums.join('-L')}`

  event.preventDefault()
})
