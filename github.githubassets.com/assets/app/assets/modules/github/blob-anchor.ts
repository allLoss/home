interface BlobOffset {
  // Line number
  // Lines start at 1.
  line: number

  // Optional column number.
  // Like lines, columns are 1-indexed.
  column: number | null
}

export interface BlobRange {
  // Starting offset of range.
  start: BlobOffset

  // End offset of range.
  // End offset may be the same as the start. This indicates a collapsed range.
  // Should always be initialized to a value that is equal or greater than the
  // start range such the range is always in ascending order. Reversed ranges
  // have undefined behavior.
  end: BlobOffset
}

// Inverse of `formatBlobRange`.
//
// Examples
//
//   parseBlobRange("#L3")
//   // => {start: {line: 3}}
//
//   parseBlobRange("L3-L5")
//   // => {start: {line: 3}, end: {line: 5}}
//
//   parseBlobRange("")
//   // => null
export function parseBlobRange(str: string): BlobRange | undefined {
  const lines = str.match(/#?(?:L)(\d+)((?:C)(\d+))?/g)
  if (!lines) {
    return
  } else if (lines.length === 1) {
    const offset = parseBlobOffset(lines[0])
    if (!offset) return
    return Object.freeze({start: offset, end: offset})
  } else if (lines.length === 2) {
    const startOffset = parseBlobOffset(lines[0])
    const endOffset = parseBlobOffset(lines[1])
    if (!startOffset || !endOffset) return

    return ascendingBlobRange(
      Object.freeze({
        start: startOffset,
        end: endOffset
      })
    )
  } else {
    return
  }
}

// Inverse of `parseBlobRange`.
//
// Examples
//
//   formatBlobRange({start: {line: 3}})
//   // => "L3"
//
//   formatBlobRange({start: {line: 3}, end: {line: 5}})
//   // => "L3-L5"
//
//   formatBlobRange({start: {line: 3, column: 1}, end: {line: 5, column: 5}})
//   // => "L3C1-L5C5"
export function formatBlobRange(blobRange: BlobRange): string {
  const {start, end} = ascendingBlobRange(blobRange)

  if (start.column != null && end.column != null) {
    return `L${start.line}C${start.column}-L${end.line}C${end.column}`
  } else if (start.line === end.line) {
    return `L${start.line}`
  } else {
    return `L${start.line}-L${end.line}`
  }
}

// Returns a String containing the file prefix with trailing dash.
//
// Examples
//
//   parseAnchorPrefix("#file-zshrc-L3")
//   // => "file-zshrc-"
//
//   parseAnchorPrefix("file-zshrc-L3-L5")
//   // => "file-zshrc-"
//
//   parseAnchorPrefix("")
//   // => ""
function parseAnchorPrefix(str: string): string {
  const match = str.match(/(file-.+?-)L\d+?/i)
  return match ? match[1] : ''
}

export type AnchorInfo = {
  blobRange: BlobRange
  anchorPrefix: string
}

// Examples
//
//   parseFileAnchor("#file-zshrc-L3")
//   // => { blobRange: {start: {line: 3}}, anchorPrefix: "file-zshrc-" }
//
//   parseFileAnchor("file-zshrc-L3-L5")
//   // => { blobRange: {start: {line: 3}, end: {line: 5}}, anchorPrefix: "file-zshrc-" }
//
//   parseFileAnchor("")
//   // => { blobRange: null, anchorPrefix: undefined }
export function parseFileAnchor(str: string): AnchorInfo {
  const blobRange = parseBlobRange(str)!
  const anchorPrefix = parseAnchorPrefix(str)
  return {blobRange, anchorPrefix}
}

// Formats line number range pair as an anchor String.
//
// Examples
//
//   formatBlobRangeAnchor({blobRange: {start: {line: 3}}, anchorPrefix: ""})
//   // => "#L3"
//
//   formatBlobRangeAnchor({blobRange: {start: {line: 3}}, anchorPrefix: "file-zshrc-"})
//   // => "#file-zshrc-L3"
//
//   formatBlobRangeAnchor({blobRange: {start: {line: 3}, end: {line: 5}}, anchorPrefix: ""})
//   // => "#L3-L5"
//
//   formatBlobRangeAnchor({blobRange: {start: {line: 3, column: 1}, end: {line: 5, column: 5}}, anchorPrefix: ""})
//   // => "#L3C1-L5C5"
//
//   formatBlobRangeAnchor({blobRange: {start: {line: 3}, end: {line: 5}}, anchorPrefix: "file-zshrc-"})
//   // => "#file-zshrc-L3-L5"
//
//   formatBlobRangeAnchor({blobRange: null, anchorPrefix: ""})
//   // => "#"
//
//   formatBlobRangeAnchor({blobRange: null, anchorPrefix: "file-zshrc-"})
//   // => "#"
export function formatBlobRangeAnchor({anchorPrefix, blobRange}: AnchorInfo): string {
  if (!blobRange) return '#'
  return `#${anchorPrefix}${formatBlobRange(blobRange)}`
}

function parseBlobOffset(str: string): BlobOffset | null {
  const lineMatch = str.match(/L(\d+)/)
  const columnMatch = str.match(/C(\d+)/)
  if (lineMatch) {
    return Object.freeze({
      line: parseInt(lineMatch[1]),
      column: columnMatch ? parseInt(columnMatch[1]) : null
    })
  } else {
    return null
  }
}

export function DOMRangeFromBlob(
  blobRange: BlobRange,
  getLineElement: (line: number) => Node | null
): Range | undefined {
  const [startContainer, _startOffset] = findRangeOffset(blobRange.start, true, getLineElement)
  const [endContainer, _endOffset] = findRangeOffset(blobRange.end, false, getLineElement)
  if (!startContainer || !endContainer) return

  // Treat -1 as full line selection
  let startOffset = _startOffset
  let endOffset = _endOffset
  if (startOffset === -1) startOffset = 0
  if (endOffset === -1) endOffset = endContainer.childNodes.length
  if (!startContainer.ownerDocument) throw new Error(`DOMRange needs to be inside document`)

  const range = startContainer.ownerDocument.createRange()
  range.setStart(startContainer, startOffset)
  range.setEnd(endContainer, endOffset)
  return range
}

function findRangeOffset(
  offset: BlobOffset,
  lookAhead: boolean,
  getLineElement: (n: number) => Node | null
): [Node | null, number] {
  const error: [null, number] = [null, 0]

  const lineElement = getLineElement(offset.line)
  if (!lineElement) return error

  if (offset.column == null) {
    return [lineElement, -1]
  }

  let column = offset.column - 1

  const textNodes = getAllTextNodes(lineElement)
  for (let i = 0; i < textNodes.length; i++) {
    const textNode = textNodes[i]

    // TODO: length might be buggy with emoji
    const nextC = column - (textNode.textContent || '').length

    if (nextC === 0) {
      const nextTextNode = textNodes[i + 1]
      if (lookAhead && nextTextNode) {
        return [nextTextNode, 0]
      } else {
        return [textNode, column]
      }
    } else if (nextC < 0) {
      return [textNode, column]
    }

    column = nextC
  }

  return error
}

// Get a flat list of text nodes in depth first order.
function getAllTextNodes(el: Node): Node[] {
  if (el.nodeType === Node.TEXT_NODE) {
    return [el]
  }
  if (!el.childNodes || !el.childNodes.length) return []
  let list: Node[] = []
  for (const node of el.childNodes) {
    list = list.concat(getAllTextNodes(node))
  }
  return list
}

// Sorts range start and end offsets to be in ascending order.
function ascendingBlobRange(range: BlobRange): BlobRange {
  const offsets = [range.start, range.end]
  offsets.sort(compareBlobOffsets)

  if (offsets[0] === range.start && offsets[1] === range.end) {
    return range
  } else {
    return Object.freeze({
      start: offsets[0],
      end: offsets[1]
    })
  }
}

// Compare line offsets. May be used with Array.sort
function compareBlobOffsets(a: BlobOffset, b: BlobOffset): number {
  if (a.line === b.line && a.column === b.column) {
    return 0
  } else if (a.line === b.line && typeof a.column === 'number' && typeof b.column === 'number') {
    return a.column - b.column
  } else {
    return a.line - b.line
  }
}
