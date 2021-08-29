import {observe} from 'selector-observer'

observe('.js-file-line-container, .js-code-block-container', {
  constructor: HTMLElement,
  subscribe(file) {
    const popover = document.querySelector('.js-tagsearch-popover') as HTMLElement
    if (!(popover instanceof HTMLElement))
      return {
        unsubscribe() {
          // Used as a no operation placeholder for unsubscribing if there is no popover.
        }
      }
    const popoverContent = popover.querySelector<HTMLElement>('.js-tagsearch-popover-content')!
    const popoverHTML = new WeakMap()
    const wrapCache = new WeakMap()

    let activeToken: Element | undefined

    async function onMouseMove(event: MouseEvent) {
      const range = matchFromPoint(/\w+[!?]?/g, event.clientX, event.clientY)
      if (!range) return

      const rangeElement = range.commonAncestorContainer.parentElement!
      for (const className of rangeElement.classList) {
        if (['pl-token', 'pl-c', 'pl-s', 'pl-k'].includes(className)) return
      }

      if (rangeElement.closest('.js-skip-tagsearch')) {
        return
      }

      const text = range.toString()
      if (!text || text.match(/\n|\s|[();&.=",]/)) return

      let didCheckText = wrapCache.get(rangeElement)
      if (!didCheckText) {
        didCheckText = new Set()
        wrapCache.set(rangeElement, didCheckText)
      }
      if (didCheckText.has(text)) return
      didCheckText.add(text)

      let lang: string | null = popover.getAttribute('data-tagsearch-lang')!

      // Handle Ruby embedded in ERB templates
      if (lang === 'HTML+ERB') {
        if (rangeElement.closest('.pl-sre')) {
          lang = 'Ruby'
        } else {
          return
        }
      }

      if (file.classList.contains('js-code-block-container')) {
        lang = getCodeBlockLanguage(rangeElement)
        // Ignore any requests where the range element is not in a code block
        // with a supported language
        if (!lang) return
      }

      const pos = getRowAndColumn(range)
      const html = await fetchPopoverContents(popover, text, lang, pos)
      if (!html) return

      const wrapper = document.createElement('span')
      wrapper.classList.add('pl-token')
      wrapper.addEventListener('click', onClick)
      wrapper.setAttribute('data-hydro-click', popover.getAttribute('data-hydro-click')!)
      wrapper.setAttribute('data-hydro-click-hmac', popover.getAttribute('data-hydro-click-hmac')!)
      popoverHTML.set(wrapper, html)
      range.surroundContents(wrapper)
    }

    // Ensure popover list is reset to the top.
    function resetScrollTop() {
      popoverContent.scrollTop = 0
    }

    function onClick(event: MouseEvent) {
      // Ignore clicks with modifier keys
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

      const target = event.currentTarget as HTMLElement

      if (target === activeToken) {
        hidePopover()
      } else {
        populatePopover(target)
        showPopover()
      }

      event.preventDefault()
    }

    function populatePopover(token: HTMLElement) {
      if (activeToken) activeToken.classList.remove('active')
      activeToken = token
      activeToken.classList.add('active')

      popoverContent.innerHTML = popoverHTML.get(token) || ''

      positionPopover(token)
    }

    function positionPopover(token: HTMLElement) {
      const rect = token.getClientRects()[0] || {bottom: 0, left: 0}
      popover.style.position = 'absolute'
      popover.style.top = `${window.scrollY + rect.bottom + 7}px`
      popover.style.left = `${window.scrollX + rect.left}px`
    }

    function showPopover() {
      if (!popover.hidden) {
        // When existing popover is active and user clicks on different symbol, we need to still reset the navigation tabs and scrollTop for the popover's new contents.
        resetScrollTop()
        return
      }
      popover.hidden = false

      // Setting a scrollTop value only succeeds if the HTML element is visible.
      resetScrollTop()

      document.addEventListener('click', onDocumentClick)
      document.addEventListener('keyup', onKeyup)
      /* eslint-disable-next-line github/prefer-observers */
      window.addEventListener('resize', onResize)
    }

    function hidePopover() {
      if (popover.hidden) return
      popover.hidden = true

      if (activeToken) activeToken.classList.remove('active')
      activeToken = undefined

      document.removeEventListener('click', onDocumentClick)
      document.removeEventListener('keyup', onKeyup)
      window.removeEventListener('resize', onResize)
    }

    function onResize() {
      if (!(activeToken instanceof HTMLElement)) return
      positionPopover(activeToken)
    }

    function onDocumentClick(event: MouseEvent) {
      const {target} = event
      if (!(target instanceof Node)) return

      if (!popover.contains(target) && !activeToken!.contains(target)) {
        hidePopover()
      }
    }

    function onKeyup(event: KeyboardEvent) {
      switch (event.key) {
        case 'Escape':
          hidePopover()
          break
      }
    }

    file.addEventListener('mousemove', onMouseMove)

    return {
      unsubscribe() {
        file.removeEventListener('mousemove', onMouseMove)
      }
    }
  }
})

async function fetchPopoverContents(
  popover: HTMLElement,
  text: string,
  lang: string,
  pos: [number, number]
): Promise<string> {
  const urlStr = popover.getAttribute('data-tagsearch-url')!
  const path = popover.getAttribute('data-tagsearch-path')!
  const ref = popover.getAttribute('data-tagsearch-ref')!

  const url = new URL(urlStr, window.location.origin)
  const params = new URLSearchParams()
  params.set('q', text)
  params.set('blob_path', path)
  params.set('ref', ref)
  params.set('language', lang)
  params.set('row', pos[0].toString())
  params.set('col', pos[1].toString())
  url.search = params.toString()

  const response = await fetch(url.toString(), {
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  if (!response.ok) {
    return ''
  }
  const html = await response.text()

  // Ignore responses with no definitions
  if (/js-tagsearch-no-definitions/.test(html)) return ''

  return html
}

// Returns matching text range given screen offsets.
//
// Examples
//
//   // Find nearest word under mouse cursor
//   matchFromPoint(/\w+/g, event.clientX, event.clientY)
//
// Returns Range or null if nothing matches position.
function matchFromPoint(regexp: RegExp, x: number, y: number): Range | undefined | null {
  let textNode: Node | undefined
  let offset: number | undefined

  if (document.caretPositionFromPoint) {
    const caret = document.caretPositionFromPoint(x, y)
    if (caret) {
      textNode = caret.offsetNode
      offset = caret.offset
    }
  } else if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y)
    if (range) {
      textNode = range.startContainer
      offset = range.startOffset
    }
  }

  if (!textNode || typeof offset !== 'number' || textNode.nodeType !== Node.TEXT_NODE) return

  const text = textNode.textContent
  if (!text) return null

  const match = findNearestMatch(text, regexp, offset)
  if (!match) return null

  const matchedRange = document.createRange()
  matchedRange.setStart(textNode, match[1])
  matchedRange.setEnd(textNode, match[2])

  return matchedRange
}

// Find nearest match in string given a starting offset.
//
// Similar to String#scan, but only returns one result around the given offset.
//
// Examples
//
//   findNearestMatch("The quick brown fox jumps over the lazy dog", /\w+/g, 1)
//   // ["The", 0, 3]
//
//   findNearestMatch("The quick brown fox jumps over the lazy dog", /\w+/g, 18)
//   ["fox", 16, 19]
//
// Return matching string, start and end offsets. Otherwise returns null for no match.
export function findNearestMatch(str: string, regexp: RegExp, offset: number): [string, number, number] | null {
  let m
  while ((m = regexp.exec(str))) {
    const len = m.index + m[0].length
    if (m.index <= offset && offset < len) {
      return [m[0], m.index, len]
    }
  }
  return null
}

// Get the language name of the embedded code block that the given element is
// located in. This will be used for files such as Markdown that can contain
// nested code blocks in multiple languages.
//
// Return language name or null
function getCodeBlockLanguage(element: Element): string | null {
  // FIXME Use js- class or data attributes for the language lookup/mappings
  const codeBlockElement = element.closest('.highlight')
  if (codeBlockElement) {
    for (const className of codeBlockElement.classList) {
      switch (className) {
        case 'highlight-source-go':
          return 'Go'
        case 'highlight-source-js':
          return 'JavaScript'
        case 'highlight-source-python':
          return 'Python'
        case 'highlight-source-ruby':
          return 'Ruby'
        case 'highlight-source-ts':
          return 'TypeScript'
      }
    }
  }

  return null
}

// Returns a zero-indexed position of the range in utf16 code units.
export function getRowAndColumn(range: Range): [number, number] {
  let node = range.startContainer
  let offset = range.startOffset
  for (;;) {
    let prev = node.previousSibling
    while (prev) {
      offset += (prev.textContent || '').length
      prev = prev.previousSibling
    }
    const parent = node.parentElement
    if (parent) {
      if (parent.classList.contains('js-file-line')) {
        const lineNumber = parent.previousElementSibling!
        if (!lineNumber.classList.contains('js-line-number')) {
          throw new Error('invariant')
        }
        const row = parseInt(lineNumber.getAttribute('data-line-number') || '1', 10)
        return [row - 1, offset]
      } else {
        node = parent
      }
    } else {
      return [0, 0]
    }
  }
}
