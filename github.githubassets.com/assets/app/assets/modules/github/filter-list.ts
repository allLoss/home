type Predicate = (el: Element, query: string) => boolean | null
type Options = {limit?: number | null}

export function filterList(list: Element, query: string, isVisible: Predicate, options: Options = {}): number {
  const limit = options.limit ?? Infinity
  let visible = 0
  for (const item of list.children) {
    const show = isVisible(item, query)
    if (show == null) {
      // ignore
    } else if (show && visible < limit) {
      visible++
      toggle(item as HTMLElement, true)
    } else {
      toggle(item as HTMLElement, false)
    }
  }
  return visible
}

function toggle(el: HTMLElement, show: boolean) {
  el.style.display = show ? '' : 'none'
  el.hidden = !show
}
