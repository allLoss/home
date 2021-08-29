type ScrollToOptions = {
  top: number
  left?: number
}

export default function scrollTo(targetContainer: HTMLElement, options: ScrollToOptions) {
  let container = targetContainer
  const document = targetContainer.ownerDocument!

  if (
    /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
    // @ts-ignore - Suppress TS2367 error that I don't trust
    container === document ||
    /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
    // @ts-ignore - Suppress TS2367 error that I don't trust
    container === document.defaultView ||
    container === document.documentElement ||
    container === document.body
  ) {
    /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
    // @ts-ignore - `container` is expected to be a `HTMLElement` and this sets it to a `Document`
    container = document
  }

  /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
  // @ts-ignore - Surpress TS2551 error that I don't trust
  const Document = document.defaultView.Document

  if (container instanceof Document) {
    const top = options.top != null ? options.top : document.defaultView!.pageYOffset
    const left = options.left != null ? options.left : document.defaultView!.pageXOffset
    document.defaultView!.scrollTo(left, top)
    return
  }

  /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
  // @ts-ignore - Suppress TS2339 error that I don't trust
  const HTMLElement = document.defaultView.HTMLElement

  if (!(container instanceof HTMLElement)) {
    throw new Error('invariant')
  }

  container.scrollTop = options.top
  if (options.left != null) {
    container.scrollLeft = options.left
  }
}
