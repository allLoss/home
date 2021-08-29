import {fire} from 'delegated-events'
import {observe} from 'selector-observer'

// Entire document is drop target.
observe('.js-document-dropzone', {
  constructor: HTMLElement,
  add(el) {
    document.body.addEventListener('dragstart', onDragstart)
    document.body.addEventListener('dragend', onDragend)
    document.body.addEventListener('dragenter', onDragenter)
    document.body.addEventListener('dragover', onDragenter)
    document.body.addEventListener('dragleave', onBodyDragleave)
    el.addEventListener('drop', onDrop)
  },
  remove(el) {
    document.body.removeEventListener('dragstart', onDragstart)
    document.body.removeEventListener('dragend', onDragend)
    document.body.removeEventListener('dragenter', onDragenter)
    document.body.removeEventListener('dragover', onDragenter)
    document.body.removeEventListener('dragleave', onBodyDragleave)
    el.removeEventListener('drop', onDrop)
  }
})

function hasFile(transfer: DataTransfer): boolean {
  return Array.from(transfer.types).indexOf('Files') >= 0
}

let dragging: number | null = null

// Highlight textarea and change drop cursor. Ensure drop target styles
// are cleared after dragging back outside of window.
function onDragenter(event: DragEvent) {
  if (ignorePageElementDrag) return

  const target = event.currentTarget as Element

  if (dragging) {
    window.clearTimeout(dragging)
  }
  dragging = window.setTimeout(() => target.classList.remove('dragover'), 200)

  const transfer = event.dataTransfer
  if (!transfer || !hasFile(transfer)) return

  transfer.dropEffect = 'copy'
  target.classList.add('dragover')

  event.stopPropagation()
  event.preventDefault()
}

function onBodyDragleave(event: DragEvent) {
  // Ignore leave events from children to prevent flicker.
  if (!(event.target instanceof Element)) return
  if (event.target.classList.contains('js-document-dropzone')) {
    const currentTarget = event.currentTarget as Element
    currentTarget.classList.remove('dragover')
  }
}

function onDrop(event: DragEvent) {
  const container = event.currentTarget as Element

  container.classList.remove('dragover')
  document.body.classList.remove('dragover')

  const transfer = event.dataTransfer
  if (!transfer || !hasFile(transfer)) return

  fire(container, 'document:drop', {transfer})

  event.stopPropagation()
  event.preventDefault()
}

// Ignore image or link drags from within the page itself. Allow them to be
// dragged onto the desktop, but ignore any drops back onto the page.
let ignorePageElementDrag = false

function onDragstart() {
  ignorePageElementDrag = true
}

function onDragend() {
  ignorePageElementDrag = false
}
