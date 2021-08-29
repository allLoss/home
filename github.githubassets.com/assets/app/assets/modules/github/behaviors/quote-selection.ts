import {findContainer, findTextarea, quote, subscribe} from '@github/quote-selection'

import {debounce} from '@github/mini-throttle'
import {observe} from 'selector-observer'
import {on} from 'delegated-events'

observe('.js-quote-selection-container', {
  subscribe: el =>
    subscribe(el, {
      quoteMarkdown: el.hasAttribute('data-quote-markdown'),
      scopeSelector: el.getAttribute('data-quote-markdown') || '',
      copyMarkdown: false
    })
})

observe('.js-comment-quote-reply-deferred', function (button) {
  const container = findContainer(button)
  if (!container) return
  if (container.querySelector('.js-inline-comment-form-container') || findTextarea(container)) {
    /* eslint-disable-next-line github/no-d-none */
    button.classList.remove('d-none')
  }
})

document.addEventListener('quote-selection-markdown', function (event: Event) {
  const detail: {fragment: DocumentFragment; range: Range; unwrap: boolean} = (event as CustomEvent).detail
  const {fragment, range, unwrap} = detail

  const parent = range.startContainer.parentElement
  const codeBlock = parent && parent.closest('pre')
  if (codeBlock instanceof HTMLElement && !unwrap) {
    const pp = codeBlock.parentElement
    if (pp && isHighlightContainer(pp)) {
      const div = document.createElement('div')
      div.className = pp.className
      div.appendChild(fragment)
      fragment.appendChild(div)
    }
  }

  insertMarkdownSyntax(fragment)
})

function isHighlightContainer(el: Element): boolean {
  return el.nodeName === 'DIV' && el.classList.contains('highlight')
}

function hasContent(node: Node): boolean {
  return node.nodeName === 'IMG' || node.firstChild != null
}

const filters: {[key: string]: (arg0: HTMLElement) => string | HTMLElement} = {
  PRE(el) {
    const parent = el.parentElement
    if (parent && isHighlightContainer(parent)) {
      const match = parent.className.match(/highlight-source-(\S+)/)
      const flavor = match ? match[1] : ''
      const text = (el.textContent || '').replace(/\n+$/, '')
      el.textContent = `\`\`\`${flavor}\n${text}\n\`\`\``
      el.append('\n\n')
    }
    return el
  },
  A(el) {
    const text = el.textContent || ''
    if (el.classList.contains('user-mention') || el.classList.contains('team-mention')) {
      return text
    } else if (el.classList.contains('issue-link') && /^#\d+$/.test(text)) {
      return text
    } else {
      return el
    }
  },
  IMG(el) {
    const alt = el.getAttribute('alt')
    if (alt && el.classList.contains('emoji')) {
      return alt
    } else {
      return el
    }
  },
  DIV(el) {
    if (el.classList.contains('js-suggested-changes-blob')) {
      // skip quoting suggested changes widget
      el.remove()
    } else if (el.classList.contains('blob-wrapper-embedded')) {
      // handle embedded blob snippets
      const container = el.parentElement!
      const link = container.querySelector<HTMLAnchorElement>('a[href]')!
      const p = document.createElement('p')
      p.textContent = link.href
      container.replaceWith(p)
    }
    return el
  }
}

function insertMarkdownSyntax(root: DocumentFragment): void {
  const nodeIterator = document.createNodeIterator(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      if (node.nodeName in filters && hasContent(node)) {
        return NodeFilter.FILTER_ACCEPT
      } else {
        return NodeFilter.FILTER_SKIP
      }
    }
  })
  const results: HTMLElement[] = []
  let node = nodeIterator.nextNode()

  while (node) {
    if (node instanceof HTMLElement) {
      results.push(node)
    }
    node = nodeIterator.nextNode()
  }

  // process deepest matches first
  results.reverse()

  for (const el of results) {
    el.replaceWith(filters[el.nodeName](el))
  }
}

on('click', '.js-comment-quote-reply', function ({currentTarget}) {
  const container = currentTarget.closest<HTMLElement>('.js-comment')!
  const commentBody = container.querySelector<HTMLElement>('.js-comment-body')!
  const commentBodyClone = container.querySelector<HTMLElement>('.js-comment-body')!.cloneNode(true)

  // Remove elements that contain meta info and should not be present in the quoted text
  const ignorableElements = commentBody.querySelectorAll('button.js-convert-to-issue-button, span.js-clear')
  for (const el of ignorableElements) {
    el.remove()
  }

  if (!activeSelection || activeSelection.type !== 'Range' || !commentBody.contains(activeSelection.anchorNode)) {
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.selectAllChildren(commentBody)
    quote(selection.toString(), selection.getRangeAt(0))
  } else {
    quote(activeSelection.text, activeSelection.range)
  }
  // Restore the HTML to it's initial form. The ignorable elements had to be removed
  // So that the quote lib would not include then into the selection
  container.querySelector<HTMLElement>('.js-comment-body')!.replaceWith(commentBodyClone)
})

type SelectionContext = {
  type: string
  anchorNode: Node | null
  text: string
  range: Range
}

let previousSelection: SelectionContext | null
let activeSelection: SelectionContext | null

// Workaround for Safari clearing the selection just before a <details> element
// was activated: persist the previous selection and use its range when quoting.
document.addEventListener(
  'selectionchange',
  debounce(function () {
    const selection = window.getSelection()!
    let range
    try {
      range = selection.getRangeAt(0)
    } catch {
      previousSelection = null
      return
    }
    previousSelection = {
      type: selection.type,
      anchorNode: selection.anchorNode,
      text: selection.toString(),
      range
    }
  }, 100)
)

// Reveal the "Quote reply" button on threads where there is a textarea to quote
// text into. This prevents it from showing up on locked threads.
document.addEventListener(
  'toggle',
  function (event: Event) {
    const details = event.target
    if (!(details instanceof Element) || !details.hasAttribute('open')) return
    activeSelection = previousSelection
    const button = details.querySelector('.js-comment-quote-reply.d-none')
    if (!button) return
    const container = findContainer(details)
    if (!container) return
    if (container.querySelector('.js-inline-comment-form-container') || findTextarea(container)) {
      /* eslint-disable-next-line github/no-d-none */
      button.classList.remove('d-none')
    }
  },
  {capture: true}
)
