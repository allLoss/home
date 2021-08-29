export default function findNextElementSibling(element: HTMLElement, className: string): HTMLElement | null {
  const nextSibling = element.nextElementSibling
  if (nextSibling instanceof HTMLElement) {
    if (nextSibling.classList.contains(className)) return nextSibling
    return findNextElementSibling(nextSibling, className)
  }
  return null
}
