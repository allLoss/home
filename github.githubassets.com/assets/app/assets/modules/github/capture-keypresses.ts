// Create an hidden textarea to capture users input.
//
// Useful for catching key input while a page is transitioning.
export default function captureKeypresses(document: Document): () => string {
  const textarea = document.createElement('textarea')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '0'
  textarea.style.opacity = '0'

  document.body.appendChild(textarea)

  textarea.focus()

  return () => {
    // eslint-disable-next-line github/no-blur
    textarea.blur()
    textarea.remove()
    return textarea.value
  }
}
