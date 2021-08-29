export function preserveScrollTo(element: Element) {
  if (element.getAttribute('data-pjax-preserve-scroll') != null) {
    return false
  } else {
    return 0
  }
}

export function detectContainer(target: Element): Element | null {
  let el: Element | null = target
  while (el) {
    const selector = el.getAttribute('data-pjax')
    if (selector && selector !== 'true') {
      return document.querySelector(selector)
    }
    el = el.parentElement && el.parentElement.closest('[data-pjax]')
  }

  return target.closest('[data-pjax-container]')
}
