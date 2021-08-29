import {controller, target} from '@github/catalyst'

/**
 * CollapsibleSidebarWidget creates a widget in the sidebar of which
 * content is collapsible and is loaded upon opening.
 *
 * Four classes must be set, they are scoped to the HTML element <collapsible-sidebar-widget>
 *  - .collapsible-sidebar-widget-button (the button toggling open/close state)
 *  - .collapsible-sidebar-widget-content (the inner HTML to load)
 *  - .collapsible-sidebar-widget-loader (the element that is shown while loading)
 *  - .collapsible-sidebar-widget-indicator (the element that indicates open/close)
 *
 * One class is optional
 * - .collapsible-sidebar-widget-active-hidden (hides an element when the content is open)
 *
 * Notice: This is not done in pure CSS, because we need to guard
 * the loading of the content.
 *
 * @example
 * ```html
 * <collapsible-sidebar-widget url="/your/url">
 *  <div>
 *   <button type="button" class="collapsible-sidebar-widget-button" data-action="mousedown:collapsible-sidebar-widget#onMouseDown keydown:collapsible-sidebar-widget#onKeyDown">Open</button>
 *    <svg xmlns="http://www.w3.org/2000/svg" class="collapsible-sidebar-widget-indicator" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M12.78 6.22a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0L3.22 7.28a.75.75 0 011.06-1.06L8 9.94l3.72-3.72a.75.75 0 011.06 0z"></path></svg>
 *    <svg class="collapsible-sidebar-widget-loader anim-rotate" viewBox="0 0 16 16" fill="none" width="16" height="16" ><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-opacity="0.25" stroke-width="2" vector-effect="non-scaling-stroke"></circle><path d="M15 8a7.002 7.002 0 00-7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke"></path></svg>
 *    <div class="collapsible-sidebar-widget-active-hidden">Hidden content when active</div>
 *   </button>
 *   <div class="collapsible-sidebar-widget-content" data-target="collapsible-sidebar-widget.collapsible">Lorem Ipsum</div>
 *  </div>
 * </collapsible-sidebar-widget>
 * ```
 */
@controller
class CollapsibleSidebarWidgetElement extends HTMLElement {
  @target collapsible: HTMLElement

  pendingRequest: AbortController | null

  get activeClass(): string {
    return this.getAttribute('active-class') || 'collapsible-sidebar-widget-active'
  }

  get loadingClass(): string {
    return this.getAttribute('loading-class') || 'collapsible-sidebar-widget-loading'
  }

  get url(): string {
    return this.getAttribute('url') || ''
  }

  get isOpen(): boolean {
    return this.hasAttribute('open')
  }

  set isOpen(open: boolean) {
    open ? this.setAttribute('open', '') : this.removeAttribute('open')
  }

  onKeyDown(e: KeyboardEvent) {
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault()

      return this.load()
    }
  }

  onMouseDown(e: MouseEvent) {
    e.preventDefault()

    return this.load()
  }

  load() {
    if (this.pendingRequest) {
      return this.pendingRequest.abort()
    }

    if (!this.collapsible.hasAttribute('loaded')) {
      this.setLoading()

      return this.updateCollapsible()
    }

    if (!this.isOpen) {
      return this.setOpen()
    }

    return this.setClose()
  }

  setLoading() {
    this.classList.add(this.loadingClass)
    this.classList.remove(this.activeClass)
  }

  setOpen() {
    this.classList.add(this.activeClass)
    this.classList.remove(this.loadingClass)
    this.isOpen = true
  }

  setClose() {
    this.classList.remove(this.activeClass)
    this.classList.remove(this.loadingClass)
    this.isOpen = false
  }

  handleAbort() {
    this.pendingRequest = null
    this.setClose()
  }

  async updateCollapsible() {
    try {
      this.pendingRequest = new AbortController()
      this.pendingRequest.signal.addEventListener('abort', () => this.handleAbort())

      const response = await fetch(this.url, {
        signal: this.pendingRequest?.signal,
        headers: {
          Accept: 'text/html',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      this.pendingRequest = null

      if (!response.ok) {
        return this.setClose()
      }

      const content = await response.text()
      this.collapsible.innerHTML = content
      this.collapsible.setAttribute('loaded', '')

      this.setOpen()
    } catch {
      // The errors are not yet surfaced.
      this.pendingRequest = null
      return this.setClose()
    }
  }
}
