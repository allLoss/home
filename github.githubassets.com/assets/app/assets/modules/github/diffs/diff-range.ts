import {findElementByFragmentName} from '../fragment-target'

class DiffPosition {
  diffId: string
  side: string
  lineNumber: number
  element: Element | null

  constructor(diffId: string, side: string, lineNumber: number) {
    this.diffId = diffId
    this.side = side
    this.lineNumber = lineNumber

    this.element = findElementByFragmentName(document, this.anchor())
  }

  sideForCommenting(): string {
    if (this.element && this.element.classList.contains('blob-num-context')) {
      return 'right'
    }

    /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
    // @ts-ignore
    return {R: 'right', L: 'left'}[this.side]
  }

  isContext(): boolean {
    if (!this.element) {
      return false
    }

    return this.element.classList.contains('blob-num-context')
  }

  // The URL anchor for this diff position on the page.
  anchor(): string {
    return `${this.diffId}${this.anchorSuffix()}`
  }

  // The URL anchor anchor for this diff position on the page.
  //
  // E.g. - 'L42'
  anchorSuffix(): string {
    return `${this.side}${this.lineNumber}`
  }

  // Tests whether or not this position is equivalent with another.
  is(otherPosition: DiffPosition): boolean {
    return (
      this.diffId === otherPosition.diffId &&
      this.side === otherPosition.side &&
      this.lineNumber === otherPosition.lineNumber
    )
  }
}

export class DiffRange {
  elements: Set<Element>
  isParsed: boolean
  isSplit: boolean
  diffId: string
  diffTable: HTMLElement | null
  start: DiffPosition
  end: DiffPosition
  lineCount: number
  _rows: Set<HTMLElement>
  _isAcrossHunks: boolean
  _isContextOnly: boolean
  _includesExpandedLine: boolean

  constructor(diffId: string, startSide: string, startLineNumber: number, endSide: string, endLineNumber: number) {
    this.elements = new Set()
    this.isParsed = false
    this.isSplit = false
    this._rows = new Set()
    this._isAcrossHunks = false
    this._isContextOnly = true
    this._includesExpandedLine = false

    this.diffId = diffId
    this.diffTable = document.querySelector(`.js-diff-table[data-diff-anchor="${diffId}"]`)
    if (this.diffTable) this.isSplit = this.diffTable.classList.contains('js-file-diff-split')

    this.start = new DiffPosition(diffId, startSide, startLineNumber)
    this.end = new DiffPosition(diffId, endSide, endLineNumber)
    this.lineCount = 0

    this.parse()
  }

  // Generates an URL anchor which identifies this range.
  //
  // E.g. 'diff-2b939de295abbeb764a2b0de8fe0e690L5-R7'
  anchor(): string {
    const parts = []
    parts.push(this.start.anchor())

    if (!this.start.is(this.end)) {
      parts.push(this.end.anchorSuffix())
    }

    return parts.join('-')
  }

  // Internal: Finds all elements in the specified range.
  parse() {
    if (!this.diffTable) return

    let lineNumbers = this.unify(this.diffTable.querySelectorAll('.js-linkable-line-number'))
    lineNumbers = this.filterInRange(lineNumbers)

    this.lineCount = lineNumbers.length
    this.elements = this.expandRelatedElements(lineNumbers)
    this.isParsed = true
  }

  // Internal: Orders line number elements in the order they would appear in a unified diff.
  unify(lineNumbers: NodeListOf<Element>): Element[] {
    if (!this.isSplit) return Array.from(lineNumbers)

    const unified = []
    let additions = []
    let deletions = []

    for (const lineNumber of lineNumbers) {
      if (lineNumber.classList.contains('blob-num-addition')) {
        additions.push(lineNumber)
      } else if (lineNumber.classList.contains('blob-num-deletion')) {
        deletions.push(lineNumber)
      } else {
        unified.push(...deletions, ...additions, lineNumber)
        additions = []
        deletions = []
      }
    }

    unified.push(...deletions, ...additions)

    return unified
  }

  // Internal: Takes all line number elements in this diff and filters it down to
  // only the ones included in the range.
  filterInRange(lineNumbers: Element[]): Element[] {
    if (!this.start.element || !this.end.element) return []

    let startIndex = lineNumbers.indexOf(this.start.element)
    let endIndex = lineNumbers.indexOf(this.end.element)

    if (startIndex > endIndex) {
      // start and end are out of order
      ;[startIndex, endIndex] = [endIndex, startIndex]

      // 2-step reassignement since flow doesn't support this inline.
      const [newStart, newEnd] = [this.end, this.start]
      this.start = newStart
      this.end = newEnd
    }

    return lineNumbers.slice(startIndex, endIndex + 1)
  }

  isContextOnly(): boolean {
    if (!this.isParsed) {
      this.parse()
    }

    return this._isContextOnly
  }

  isAcrossHunks(): boolean {
    if (!this.isParsed) {
      this.parse()
    }

    return this._isAcrossHunks
  }

  includesExpandedLine(): boolean {
    if (!this.isParsed) {
      this.parse()
    }

    return this._includesExpandedLine
  }

  rows(): Set<HTMLElement> {
    if (!this.isParsed) {
      this.parse()
    }

    return this._rows
  }

  // Internal: Takes line number elements in the range and expands them to include other
  // elements that should be highlighted whenever the line number element is.
  //
  // Behavior differs between split diffs and unified.
  expandRelatedElements(lineNumbers: Element[]): Set<Element> {
    const splitDiff = this.isSplit

    const firstElement = lineNumbers[0]
    const lastElement = lineNumbers[lineNumbers.length - 1]

    if (firstElement && lastElement) {
      const firstElementTR = firstElement.closest('[data-hunk]')
      const lastElementTR = lastElement.closest('[data-hunk]')

      if (firstElementTR && lastElementTR) {
        const firstElementHunk = firstElementTR.getAttribute('data-hunk')
        const lastElementHunk = lastElementTR.getAttribute('data-hunk')

        if (firstElementHunk !== lastElementHunk) {
          this._isAcrossHunks = true
        }
      }
    }

    const expander = (expandedSet: Set<Element>, lineNumber: Element): Set<Element> => {
      if (!this._includesExpandedLine && lineNumber.closest('.blob-expanded')) {
        this._includesExpandedLine = true
      }

      const row = lineNumber.parentElement
      if (row instanceof HTMLElement) {
        this._rows.add(row)
      }
      const additionOrDeletion =
        lineNumber.classList.contains('blob-num-deletion') || lineNumber.classList.contains('blob-num-addition')

      if (additionOrDeletion) {
        this._isContextOnly = false
      }

      if (!row) return expandedSet

      if (splitDiff && additionOrDeletion) {
        // Addition or deletion in a split diff. Only return elements from that side of the diff.
        const index = Array.from(row.children).indexOf(lineNumber)
        if (index < 2) {
          // Diff left side
          return expandedSet.add(row.children[0]).add(row.children[1])
        } else {
          return expandedSet.add(row.children[2]).add(row.children[3])
        }
      } else {
        for (const el of Array.from(row.children)) {
          expandedSet.add(el)
        }
        return expandedSet
      }
    }

    return lineNumbers.reduce(expander, new Set())
  }
}
