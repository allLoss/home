// Diff Line Number
// Click line number on td::before element line numbers to jump to the anchor.
//
// Avoids using a native <a> for performance reasons. Theres a large number of
// css selectors that target `a` on the right most side. If we can reduce the
// number of these, selector matching performance on thousands of blob and diff
// lines shouldn't be so bad.

import {DiffRange} from './diff-range'
import hashChange from '../behaviors/hash-change'
import {matchHash} from './helpers'
import {observe} from 'selector-observer'
import {on} from 'delegated-events'
import {trackView} from '../hydro-tracking'

// Highlight diff range
let currentRange: DiffRange | null = null
let showMultiLineCommentForm: (() => void) | null = null
let isDraggingForComment = false
let waitingForDragFrom: Element | null = null

export function getCurrentRange(): DiffRange | null {
  return currentRange
}

function isMultiLineCommentingEnabled(target: Element): boolean {
  return !!target.closest('.js-multi-line-comments-enabled')
}

export function isMultiLineCommentAllowed(target: Element, expandedRange: DiffRange): boolean {
  if (!isMultiLineCommentingEnabled(target)) {
    return false
  }

  const {
    start: {lineNumber: startLineNumber},
    end: {lineNumber: endLineNumber}
  } = expandedRange

  // It's not multi-line if it's just one line
  if (startLineNumber === endLineNumber && expandedRange.isContextOnly()) {
    return false
  }

  if (expandedRange.isAcrossHunks()) {
    return false
  }

  if (expandedRange.includesExpandedLine()) {
    return false
  }

  return true
}

function isSelecting(element: Element): boolean {
  return element.closest<HTMLElement>('.js-diff-table')!.classList.contains('is-selecting')
}

export function clearSelection(): void {
  window.history.replaceState(null, '', `#`)
  showHighlight()
}

function setSelection(target: Element, canExpand: boolean) {
  let targetLineAnchor = target.id

  if (canExpand) {
    const parsedAnchor = matchHash(targetLineAnchor)
    if (!parsedAnchor) return

    const diffId = parsedAnchor[1]
    const endSide = parsedAnchor[2]
    const endLine = parsedAnchor[3]

    if (currentRange && currentRange.diffId === diffId) {
      // Don't let people drag upwards because it causes some weirdness. Could fix this later,
      // but we're just disabling for the initial ship
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (endSide === currentRange.start.side && endLine < currentRange.start.lineNumber) {
        return
      }

      const expandedRange = new DiffRange(
        diffId,
        currentRange.start.side,
        currentRange.start.lineNumber,
        endSide,
        +endLine
      )
      targetLineAnchor = expandedRange.anchor()

      const trackingElement = target.closest('.js-file-content[data-hydro-view]')

      if (trackingElement instanceof HTMLElement) {
        sendHydroEvent(trackingElement, expandedRange)
      }

      if (isDraggingForComment && isSelecting(target)) {
        const table = target.closest<HTMLElement>('.js-diff-table')!
        table.classList.toggle('is-commenting', isMultiLineCommentAllowed(target, expandedRange))
      }

      showMultiLineCommentForm = function () {
        if (isMultiLineCommentAllowed(target, expandedRange)) {
          const sideValue = expandedRange.end.sideForCommenting()
          const buttonSelector = `.js-add-line-comment[data-side="${sideValue}"]`
          const button = target.closest<HTMLElement>('tr')!.querySelector<HTMLElement>(buttonSelector)

          if (button && expandedRange) {
            button.click()
          }
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.history.replaceState(null, null, `#${targetLineAnchor}`)
  showHighlight()
}

function nearestLinkableLineNumber(element: Element): Element | null {
  if (!(element instanceof HTMLElement)) {
    return null
  }

  if (element.classList.contains('js-linkable-line-number')) {
    return element
  }

  const previousElementSibling = element.previousElementSibling

  if (previousElementSibling) {
    return nearestLinkableLineNumber(previousElementSibling)
  }

  return null
}

function handleClick(e: MouseEvent) {
  if (!currentRange) {
    return
  }

  if ((e.target as Element).closest('.js-diff-table')) {
    return
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.history.replaceState(null, null, `#`)
  showHighlight()
}

function beginDrag() {
  if (!waitingForDragFrom) {
    return
  }

  setSelection(waitingForDragFrom, false)
  const table = waitingForDragFrom.closest<HTMLElement>('.js-diff-table')!
  waitingForDragFrom = null

  table.classList.add('is-selecting')
  table.classList.add('is-commenting')

  document.addEventListener(
    'mouseup',
    function (e: MouseEvent) {
      table.classList.remove('is-selecting')
      table.classList.remove('is-selecting', 'is-commenting')
      showMultiLineCommentForm && showMultiLineCommentForm()
      showMultiLineCommentForm = null
      removeCommentSelectionEvents(table)
      e.preventDefault()
    },
    {once: true}
  )
}

function commentSelectionMouseverToCode(codeElement: Element) {
  const target = nearestLinkableLineNumber(codeElement)

  if (!target || !isSelecting(target)) {
    return
  }

  setSelection(target, true)
}

function commentSelectionMouseverToLineNumbers(lineNumberElement: Element) {
  if (!isSelecting(lineNumberElement)) {
    return
  }

  setSelection(lineNumberElement, true)
}

function handleDragMouseEvent(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Element)) {
    return
  }

  if (waitingForDragFrom) {
    beginDrag()
  }

  const cell = target.closest('.blob-code, .js-linkable-line-number')
  if (!cell) {
    return
  }

  if (cell.classList.contains('blob-code')) {
    return commentSelectionMouseverToCode(cell)
  }

  if (cell.classList.contains('js-linkable-line-number')) {
    commentSelectionMouseverToLineNumbers(cell)
  }
}

function addCommentSelectionEvents(container: HTMLElement) {
  container.addEventListener('mouseenter', handleDragMouseEvent, {capture: true})
}

function removeCommentSelectionEvents(container: HTMLElement) {
  isDraggingForComment = false
  container.removeEventListener('mouseenter', handleDragMouseEvent, {capture: true})
  setTimeout(() => {
    document.addEventListener('click', handleClick, {once: true})
  }, 0)
}

on('mousedown', '.js-add-line-comment', function (event) {
  const parent = (event.target as Element).parentElement

  if (!parent) {
    return
  }

  if (!isMultiLineCommentingEnabled(event.target as Element)) {
    return
  }

  const lineNumber = nearestLinkableLineNumber(parent)

  if (!lineNumber) {
    return
  }

  const table = (event.target as Element).closest<HTMLElement>('.js-diff-table')!

  addCommentSelectionEvents(table)
  waitingForDragFrom = lineNumber
  isDraggingForComment = true

  // If the user is just clicking to leave a single line comment, cancel
  // the drag behaviors
  event.target!.addEventListener(
    'mouseup',
    function () {
      removeCommentSelectionEvents(table)
      waitingForDragFrom = null
      isDraggingForComment = false
    },
    {once: true}
  )

  if (currentRange && currentRange.lineCount > 1) {
    event.preventDefault()
  }
})

on('mousedown', '.js-linkable-line-number', function (event) {
  if (!(event instanceof MouseEvent)) {
    return
  }

  // Don't do anything for right click
  if (event.button !== 0) {
    return
  }

  const target = event.target

  if (!(target instanceof Element)) {
    return
  }
  const table = target.closest<HTMLElement>('.js-diff-table')!
  table.classList.add('is-selecting')
  addCommentSelectionEvents(table)

  document.addEventListener(
    'mouseup',
    function () {
      target.closest<HTMLElement>('.js-diff-table')!.classList.remove('is-selecting')
      removeCommentSelectionEvents(table)
    },
    {once: true}
  )

  setSelection(target, event instanceof MouseEvent && event.shiftKey)

  event.preventDefault()
})

function drawBorderForSplit() {
  if (!currentRange) {
    return
  }

  for (const el of currentRange.elements) {
    el.classList.add('selected-line')
  }

  const leftLineNumbers = []
  const leftLineCodes = []
  const rightLineNumbers = []
  const rightLineCodes = []

  for (const el of currentRange.rows()) {
    const [leftNumber, leftCode, rightNumber, rightCode] = el.children
    leftLineNumbers.push(leftNumber)
    leftLineCodes.push(leftCode)
    rightLineNumbers.push(rightNumber)
    rightLineCodes.push(rightCode)
  }

  function doBorder(array: Element[]) {
    for (const [i, el] of array.entries()) {
      if (el.classList.contains('empty-cell')) {
        continue
      }

      const prevElement = array[i - 1]
      if (!prevElement || !prevElement.classList.contains('selected-line')) {
        el.classList.add('selected-line-top')
      }

      const nextElement = array[i + 1]
      if (!nextElement || !nextElement.classList.contains('selected-line')) {
        el.classList.add('selected-line-bottom')
      }
    }
  }

  doBorder(leftLineNumbers)
  doBorder(leftLineCodes)
  doBorder(rightLineNumbers)
  doBorder(rightLineCodes)

  for (const [i, el] of leftLineCodes.entries()) {
    if (!rightLineCodes[i].classList.contains('selected-line')) {
      el.classList.add('selected-line-right')
    }
  }

  for (const [i, el] of rightLineNumbers.entries()) {
    if (!leftLineCodes[i].classList.contains('selected-line')) {
      el.classList.add('selected-line-left')
    }
  }
}

function drawBorderForUnified() {
  if (!currentRange) {
    return
  }

  for (const el of currentRange.elements) {
    el.classList.add('selected-line')
  }

  const trs = Array.from(currentRange.rows())
  const firstTR = trs[0]
  for (const el of firstTR.children) {
    el.classList.add('selected-line-top')
  }

  const lastTR = trs[trs.length - 1]
  for (const el of lastTR.children) {
    el.classList.add('selected-line-bottom')
  }
}

function showHighlight() {
  if (currentRange) {
    for (const el of currentRange.elements) {
      el.classList.remove(
        'selected-line',
        'selected-line-top',
        'selected-line-bottom',
        'selected-line-left',
        'selected-line-right'
      )
    }
    currentRange = null
  }

  const parsedAnchor = matchHash(window.location.hash)
  if (!parsedAnchor) return

  const diffId = parsedAnchor[1]
  const startSide = parsedAnchor[2]
  const startLine = parsedAnchor[3]
  const endSide = parsedAnchor[4] || startSide
  const endLine = parsedAnchor[5] || startLine

  currentRange = new DiffRange(diffId, startSide, +startLine, endSide, +endLine)

  const rangeLines = Array.from(currentRange.elements)
  const firstCell = rangeLines[0]

  if (!firstCell) {
    return
  }

  if (firstCell.closest<HTMLElement>('.js-diff-table')!.classList.contains('file-diff-split')) {
    drawBorderForSplit()
  } else {
    drawBorderForUnified()
  }
}

function sendHydroEvent(trackingElement: HTMLElement, diffRange: DiffRange) {
  const hydroContextAttributes = {
    starting_diff_position: diffRange.start.side + diffRange.start.lineNumber,
    ending_diff_position: diffRange.end.side + diffRange.end.lineNumber,
    line_count: diffRange.lineCount
  }
  trackingElement.setAttribute('data-hydro-client-context', JSON.stringify(hydroContextAttributes))
  trackView(trackingElement)
}

hashChange(showHighlight)

// Try to highlight again if we expanded the diff and load more lines
observe('.blob-expanded', showHighlight)

// Try to highlight again if we progressively loaded more parts of the diff
observe('.js-diff-progressive-loader', function (loader) {
  loader.addEventListener('load', showHighlight)
})
observe('.js-diff-entry-loader', function (loader) {
  loader.addEventListener('load', showHighlight)
})
