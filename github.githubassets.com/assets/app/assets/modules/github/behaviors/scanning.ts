import type {BlobRange} from '../blob-anchor'
import {DOMRangeFromBlob} from '../blob-anchor'
import {observe} from 'selector-observer'
import {surroundContents} from '../range'

function queryLineElement(snippet: Element, line: number) {
  return snippet.querySelector(`#LC${line}`)
}

function highlightColumns(blobRange: BlobRange, snippet: Element) {
  const range = DOMRangeFromBlob(blobRange, line => queryLineElement(snippet, line))

  if (range) {
    const span = document.createElement('span')
    span.classList.add('bg-yellow-2')
    surroundContents(range, span)
  }
}

function parseColumnHighlightRange(snippet: Element): BlobRange | null {
  const startLine = parseInt(snippet.getAttribute('data-start-line')!)
  const endLine = parseInt(snippet.getAttribute('data-end-line')!)
  const startColumn = parseInt(snippet.getAttribute('data-start-column')!)
  // The end column is a special case, as 0 acts as a special value
  const dataEndColumn = parseInt(snippet.getAttribute('data-end-column')!)

  // TODO: handle multi-line highlight regions
  if (startLine !== endLine) return null

  // Nothing to highlight if start and end lines and start and end cols are the
  // same, as column ranges are half-open
  if (startLine === endLine && startColumn === dataEndColumn) return null

  // 0 here indicates that no end column was provided, so the highlight should
  // continue to the end of the line.
  // DOMRangeFromBlob will interpret null in a similar way to this.
  const endColumn = dataEndColumn !== 0 ? dataEndColumn : null

  return {
    start: {line: startLine, column: startColumn},
    end: {line: endLine, column: endColumn}
  }
}

observe('.js-highlight-code-snippet-columns', function (snippet: Element) {
  const blobRange = parseColumnHighlightRange(snippet)
  if (blobRange !== null) {
    highlightColumns(blobRange, snippet)
  }
})
