// Commenting: Write and Preview tabs
//
// Markup
//
//     <form class="js-new-comment-form">
//       <div class="js-previewable-comment-form write-selected"
//           data-preview-url="/preview">
//
//         <ul>
//           <li><a href="#" class="js-write-tab selected">Write</a></li>
//           <li><a href="#" class="js-preview-tab">Preview</a></li>
//         </ul>
//
//         <textarea class="js-comment-field"></textarea>
//
//       </div>
//     </form>
//
// TODO: Everything should be using js- prefixed classes
// TODO: Remove all static copy

import {fire, on} from 'delegated-events'
import TabContainerElement from '@github/tab-container-element'
import memoize from '@github/memoize'
import {observe} from 'selector-observer'
import {onKey} from '../../onfocus'

// Finds the CSRF token value in a `js-data-preview-url-csrf` hidden input
// element in the preview div. If we don't find a token for the preview
// div, find the CSRF token value in the hidden `authenticity_token` form
// input to be used in the parent form submission (i.e. the form that this is
// previewing).
//
// Returns the CSRF token String.
function token(container: Element): string {
  const dataToken = container.querySelector('.js-data-preview-url-csrf')
  // eslint-disable-next-line github/authenticity-token
  const formTokenRef = container.closest<HTMLFormElement>('form')!.elements.namedItem('authenticity_token')
  if (dataToken instanceof HTMLInputElement) {
    return dataToken.value
  } else if (formTokenRef instanceof HTMLInputElement) {
    return formTokenRef.value
  } else {
    throw new Error('Comment preview authenticity token not found')
  }
}

// Bidirectionally switches between "Write" and "Preview" tabs.
function activateTab(tab: Element): HTMLElement {
  const container = tab.closest<HTMLElement>('.js-previewable-comment-form')!
  const isPreview = tab.classList.contains('js-preview-tab')
  if (isPreview) {
    const writeContent = container.querySelector<HTMLElement>('.js-write-bucket')!
    const previewBody = container.querySelector<HTMLElement>('.js-preview-body')!
    if (writeContent.clientHeight > 0) {
      previewBody.style.minHeight = `${writeContent.clientHeight}px`
    }
  }
  container.classList.toggle('preview-selected', isPreview)
  container.classList.toggle('write-selected', !isPreview)
  const currentSelectedTabs = container.querySelector<HTMLElement>(
    '.tabnav-tab.selected, .tabnav-tab[aria-selected="true"]'
  )!
  currentSelectedTabs.setAttribute('aria-selected', 'false')
  currentSelectedTabs.classList.remove('selected')
  tab.classList.add('selected')
  tab.setAttribute('aria-selected', 'true')
  const writeTab = container.querySelector<HTMLElement>('.js-write-tab')!
  if (isPreview) {
    // On Apple devices, the Meta (Cmd)+Shift plane is in lower case. So
    // Cmd+Shift+p is correct, while `Control+P` is also correct.
    writeTab.setAttribute('data-hotkey', 'Control+P,Meta+Shift+p')
  } else {
    writeTab.removeAttribute('data-hotkey')
  }
  return container
}

on('click', '.js-write-tab', function (event) {
  const target = event.currentTarget
  const commentForm = target.closest<HTMLElement>('.js-previewable-comment-form')!
  // <tab-container> changes are handled in the `tab-container-change` event handler
  if (commentForm instanceof TabContainerElement) {
    setTimeout(() => {
      commentForm.querySelector<HTMLElement>('.js-comment-field')!.focus()
    })
    return
  }

  const container = activateTab(target)
  setTimeout(() => {
    container.querySelector<HTMLElement>('.js-comment-field')!.focus()
  })
  const toolbar = commentForm.querySelector('markdown-toolbar')
  if (toolbar instanceof HTMLElement) {
    toolbar.hidden = false
  }
})

on('click', '.js-preview-tab', function (event) {
  const target = event.currentTarget
  const commentForm = target.closest<HTMLElement>('.js-previewable-comment-form')!
  // <tab-container> changes are handled in the `tab-container-change` event handler
  if (commentForm instanceof TabContainerElement) return

  const container = activateTab(target)
  setTimeout(() => {
    renderPreview(container)
  })
  const toolbar = commentForm.querySelector('markdown-toolbar')
  if (toolbar instanceof HTMLElement) {
    toolbar.hidden = true
  }
  event.stopPropagation()
  event.preventDefault()
})

on('tab-container-change', '.js-previewable-comment-form', function (event) {
  const relatedTarget = event.detail.relatedTarget
  const isPreviewPanel = relatedTarget && relatedTarget.classList.contains('js-preview-panel')
  const container = event.currentTarget
  const writeTab = container.querySelector<HTMLElement>('.js-write-tab')!

  if (isPreviewPanel) {
    const writeContent = container.querySelector<HTMLElement>('.js-write-bucket')!
    const previewBody = container.querySelector<HTMLElement>('.js-preview-body')!
    const skipSizing = previewBody.hasAttribute('data-skip-sizing')

    if (!skipSizing && writeContent.clientHeight > 0) {
      previewBody.style.minHeight = `${writeContent.clientHeight}px`
    }

    writeTab.setAttribute('data-hotkey', 'Control+P,Meta+Shift+p')
    renderPreview(container)
    const toolbar = container.querySelector('markdown-toolbar')
    if (toolbar instanceof HTMLElement) {
      toolbar.hidden = true
    }
  } else {
    writeTab.removeAttribute('data-hotkey')
    const toolbar = container.querySelector('markdown-toolbar')
    if (toolbar instanceof HTMLElement) {
      toolbar.hidden = false
    }
  }

  container.classList.toggle('preview-selected', isPreviewPanel)
  container.classList.toggle('write-selected', !isPreviewPanel)
})

// Allow triggering preview rendering from outside code
// TODO Replace event with exported module function.
on('preview:render', '.js-previewable-comment-form', function (event) {
  const previewTab = (event.target as Element).querySelector<HTMLElement>('.js-preview-tab')!
  const container = activateTab(previewTab)
  setTimeout(() => {
    renderPreview(container)
    const toolbar = container.querySelector('markdown-toolbar')
    if (toolbar instanceof HTMLElement) {
      toolbar.hidden = true
    }
  })
})

function previewForm(container: Element): FormData {
  const text = container.querySelector<HTMLTextAreaElement>('.js-comment-field')!.value
  const path = container.querySelector<HTMLInputElement>('.js-path')?.value
  const lineNumber = container.querySelector<HTMLInputElement>('.js-line-number')?.value
  const startLineNumber = container.querySelector<HTMLInputElement>('.js-start-line-number')?.value
  const side = container.querySelector<HTMLInputElement>('.js-side')?.value
  const startSide = container.querySelector<HTMLInputElement>('.js-start-side')?.value
  const startCommitOid = container.querySelector<HTMLInputElement>('.js-start-commit-oid')?.value
  const endCommitOid = container.querySelector<HTMLInputElement>('.js-end-commit-oid')?.value
  const baseCommitOid = container.querySelector<HTMLInputElement>('.js-base-commit-oid')?.value
  const commentId = container.querySelector<HTMLInputElement>('.js-comment-id')?.value

  const form = new FormData()
  form.append('text', text)
  // eslint-disable-next-line github/authenticity-token
  form.append('authenticity_token', token(container))
  if (path) form.append('path', path)
  if (lineNumber) form.append('line_number', lineNumber)
  if (startLineNumber) form.append('start_line_number', startLineNumber)
  if (side) form.append('side', side)
  if (startSide) form.append('start_side', startSide)
  if (startCommitOid) form.append('start_commit_oid', startCommitOid)
  if (endCommitOid) form.append('end_commit_oid', endCommitOid)
  if (baseCommitOid) form.append('base_commit_oid', baseCommitOid)
  if (commentId) form.append('comment_id', commentId)
  return form
}

function fetchPreview(container: Element): Promise<string> {
  const url = container.getAttribute('data-preview-url')!
  const data = previewForm(container)
  fire(container, 'preview:setup', {data})
  return cachedFetch(url, data)
}

const cachedFetch = memoize(uncachedFetch, {hash})
let previousController: AbortController | null = null
async function uncachedFetch(url: string, body: FormData): Promise<string> {
  previousController?.abort()
  const {signal} = (previousController = new AbortController())
  const response = await fetch(url, {method: 'post', body, signal})
  if (!response.ok) throw new Error('something went wrong')
  return response.text()
}

function hash(url: string, body: FormData): string {
  const params = [...body.entries()].toString()
  return `${url}:${params}`
}

async function renderPreview(container: Element) {
  const commentBody = container.querySelector<HTMLElement>('.comment-body')!

  // eslint-disable-next-line github/unescaped-html-literal
  commentBody.innerHTML = '<p>Loading preview&hellip;</p>'
  try {
    const html = await fetchPreview(container)
    // eslint-disable-next-line github/unescaped-html-literal
    commentBody.innerHTML = html || '<p>Nothing to preview</p>'
  } catch (error) {
    if (error.name !== 'AbortError') {
      // eslint-disable-next-line github/unescaped-html-literal
      commentBody.innerHTML = '<p>Error rendering preview</p>'
    }
  }
}

observe('.js-preview-tab', function (tab) {
  tab.addEventListener('mouseenter', async () => {
    const container = tab.closest<HTMLElement>('.js-previewable-comment-form')!
    try {
      await fetchPreview(container)
    } catch (error) {
      // Ignore fetch errors on silent prefetch
    }
  })
})

onKey('keydown', '.js-comment-field', function (event: KeyboardEvent) {
  const field = event.target as HTMLInputElement

  // On Apple devices, the Meta (Cmd)+Shift plane is in lower case. So
  // normalising the key toUpperCase is necessary
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toUpperCase() === 'P') {
    const container = field.closest<HTMLElement>('.js-previewable-comment-form')!
    if (container.classList.contains('write-selected')) {
      if (container instanceof TabContainerElement) {
        container.querySelector<HTMLElement>('.js-preview-tab')!.click()
      } else {
        // eslint-disable-next-line github/no-blur
        field.blur()
        container.dispatchEvent(
          new CustomEvent('preview:render', {
            bubbles: true,
            cancelable: false
          })
        )
      }
      event.preventDefault()
      event.stopImmediatePropagation()
    }
  }
})
