import {observe} from 'selector-observer'

const snippetClipboardCopyTemplate = document.querySelector<HTMLTemplateElement>('#snippet-clipboard-copy-button')

async function insertSnippetClipboardCopyButton(el: HTMLElement): Promise<void> {
  const clipboardContent = el.getAttribute('data-snippet-clipboard-copy-content')
  if (clipboardContent === null) return

  // Remove this attribute so that we don't add a second button.
  el.removeAttribute('data-snippet-clipboard-copy-content')

  if (!(snippetClipboardCopyTemplate instanceof HTMLTemplateElement)) return

  const documentFragment = snippetClipboardCopyTemplate.content.cloneNode(true) as DocumentFragment

  const clonedZeroClipboardContainer = documentFragment.children[0]
  if (!(clonedZeroClipboardContainer instanceof HTMLElement)) return

  const clipboardCopyElement = clonedZeroClipboardContainer.children[0]
  if (!(clipboardCopyElement instanceof HTMLElement)) return

  clipboardCopyElement.setAttribute('value', clipboardContent)
  el.appendChild(clonedZeroClipboardContainer)
}

observe('[data-snippet-clipboard-copy-content]', {
  constructor: HTMLElement,
  add(el) {
    insertSnippetClipboardCopyButton(el)
  }
})
