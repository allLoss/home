import {controller, target, targets} from '@github/catalyst'

// Demultiplexes InputEvents on an <input> for use with multiple
// elements in a <tab-container>.  Also provides notifications to
// tabpanels when they are opened.
//
// On input, element corresponding to the selected tab gets a `input-entered`
// event with its `detail` property set to the current value of the input.
// Also performs similar proxying of mouseover events from an optional
// enclosing details element to the "primary" tab so it can e.g. prefetch data.
@controller
class InputDemuxElement extends HTMLElement {
  // The <input> element to be shared among our sinks
  @target source: HTMLInputElement

  // The elements we are selecting among
  @targets sinks: HTMLElement[]

  // Determines which sink is selected by its children's aria-selected
  // attributes.  Probably a role="tablist" with children of role="tab"
  @target control: HTMLElement

  // Temporary store for input values while other tabs are using the <input>.
  storedInput: string[]

  connectedCallback() {
    if (this.control) this.storedInput = Array(this.control.children.length).fill('')
    this.addEventListener('input', this.relayInput.bind(this))
    this.addEventListener('keydown', this.relayKeydown.bind(this))
    const details = this.closest('details')
    if (details) {
      details.addEventListener('toggle', () => {
        // Move the cursor to the input after the details menu is opened.
        // This is especially nice in combination with the 'w' shortcut!
        if (details.open) {
          this.source.focus()
        }
      })
    }
  }

  // Invoked on keydown to emulate the existing behavior where pressing down
  // when the input is focused should focus the first list item.
  relayKeydown(e: KeyboardEvent) {
    if ((this.isControlTab(e.target) || e.target === this.source) && (e.key === 'ArrowDown' || e.key === 'Tab')) {
      e.preventDefault()
      e.stopPropagation()
      this.routeCustomEvent(new CustomEvent('focus-list'))
    } else if (e.key === 'Escape') {
      const details = this.closest('details')
      if (details) {
        details.removeAttribute('open')
      }
    }
  }

  // Is the given EventTarget one of our control tabs?
  isControlTab(element: EventTarget | null): boolean {
    if (!element) return false
    if (!this.control) return false
    return Array.from(this.control.children).includes(element as Element)
  }

  // Invoked on input.  Decide which sink is selected and dispatch a
  // CustomEvent that either contains input or a mouseover notification.
  relayInput(e: Event) {
    if (!e.target) return
    const eventTarget = e.target as HTMLElement
    const text = (eventTarget as HTMLInputElement).value
    this.routeCustomEvent(new CustomEvent('input-entered', {detail: text}))
  }

  // Dispatch an event on whichever sink is currently selected.
  routeCustomEvent(event: Event) {
    const sink = this.sinks[this.selectedIndex]
    sink.dispatchEvent(event)
  }

  // The index of the selected tab.
  get selectedIndex() {
    if (!this.control) return 0
    const selected = this.control.querySelector('[aria-selected="true"]')
    if (!selected) throw new Error('no selected element')
    return Array.from(this.control.children).indexOf(selected)
  }

  // Save the input value before switching tabs.
  storeInput() {
    this.storedInput[this.selectedIndex] = this.source.value
  }

  // Restore a stored input value after switching tabs.
  updateInput(e: CustomEvent) {
    this.source.value = this.storedInput[this.selectedIndex]
    const placeholder = e.detail.relatedTarget.getAttribute('data-filter-placeholder')
    this.source.placeholder = placeholder
    this.source.setAttribute('aria-label', placeholder)
    this.notifySelected()
  }

  // Courtesy notification to the element whose tab was just selected
  notifySelected() {
    const sink = this.sinks[this.selectedIndex]
    const event = new CustomEvent('tab-selected')
    sink.dispatchEvent(event)
  }
}
