const dynamicElements = new Map<string, Array<() => void>>()

function scan(node: Element) {
  for (const tagName of dynamicElements.keys()) {
    if (customElements.get(tagName) || node.querySelector(tagName) || node.matches(tagName)) {
      for (const cb of dynamicElements.get(tagName) || []) cb()
      dynamicElements.delete(tagName)
    }
  }
}

let prepared = false
function prepare() {
  prepared = true
  scan(document.body)
  const elementLoader = new MutationObserver(mutations => {
    if (!dynamicElements.size) return
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) scan(node)
      }
    }
  })
  elementLoader.observe(document, {subtree: true, childList: true})
}

export function whenSeen(tagName: string, callback: () => void) {
  if (!dynamicElements.has(tagName)) dynamicElements.set(tagName, [])
  dynamicElements.get(tagName)!.push(callback)

  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    if (!prepared) {
      prepare()
    } else {
      scan(document.body)
    }
  } else {
    document.addEventListener('DOMContentLoaded', prepare, {once: true})
  }
}
